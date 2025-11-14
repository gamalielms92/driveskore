// src/services/LocationTrackingService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../config/supabase';

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

interface TrackingStats {
  duration: number;
  distance: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const LOCATION_TASK_NAME = 'background-location-task';
const GPS_UPDATE_INTERVAL = 5000; // 5 segundos
const MIN_DISTANCE_THRESHOLD = 50; // 🎯 Umbral mínimo para contar distancia

// 🔥 CONFIGURACIÓN DE SUPABASE PARA FETCH DIRECTO
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validación
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('❌ Faltan variables de entorno de Supabase');
}

// ============================================================================
// HELPER PARA LOGGING EN BACKGROUND
// ============================================================================

async function logToStorage(message: string, data?: any) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      data: data ? JSON.stringify(data) : undefined
    };
    
    const existingLogs = await AsyncStorage.getItem('background_logs');
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    logs.push(logEntry);
    
    // Mantener solo los últimos 100 logs
    const trimmedLogs = logs.slice(-100);
    
    await AsyncStorage.setItem('background_logs', JSON.stringify(trimmedLogs));
    console.log(message, data);
  } catch (err) {
    console.error('Error guardando log:', err);
  }
}

// ============================================================================
// HELPER PARA FETCH CON TIMEOUT
// ============================================================================

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Fetch timeout after ' + timeoutMs + 'ms');
    }
    throw error;
  }
}

// ============================================================================
// 🔥 DEFINICIÓN GLOBAL DEL BACKGROUND TASK (FUERA DE LA CLASE)
// ============================================================================

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  await logToStorage('🔵 BACKGROUND TASK EJECUTADO');
  
  if (error) {
    await logToStorage('❌ Error en background task', error);
    return;
  }

  if (data) {
    try {
      // Recuperar datos de tracking guardados
      const trackingDataStr = await AsyncStorage.getItem('active_tracking_session');
      
      if (!trackingDataStr) {
        await logToStorage('⚠️ No hay sesión activa en AsyncStorage');
        return;
      }
      
      const trackingData = JSON.parse(trackingDataStr);
      const { userId, plate, sessionId } = trackingData;
      
      await logToStorage('📦 Sesión activa', { userId, plate, sessionId });
      
      // 🔥 OBTENER TOKEN DE SUPABASE
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        await logToStorage('❌ No hay access_token de Supabase');
        return;
      }
      
      await logToStorage('✅ Access token obtenido');
      
      const { locations } = data;
      await logToStorage(`📍 ${locations.length} ubicaciones capturadas en background`);
      
      // 🔥 GUARDAR DIRECTAMENTE EN BD CON FETCH + TOKEN DE USUARIO
      let successCount = 0;
      let failCount = 0;
      
      for (const location of locations) {
        try {
          const payload = {
            user_id: userId,
            plate: plate,
            session_id: sessionId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
            accuracy: location.coords.accuracy || 0,
            speed: location.coords.speed ? location.coords.speed * 3.6 : 0,
            heading: location.coords.heading || 0,
            bluetooth_mac_hash: 'background-task',
            captured_at: new Date(location.timestamp).toISOString()
          };
          
          const response = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/driver_locations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(payload)
            },
            10000
          );
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            const errorText = await response.text();
            await logToStorage('❌ INSERT individual falló', { status: response.status, error: errorText });
          }
          
        } catch (err: any) {
          failCount++;
          await logToStorage('💥 EXCEPCIÓN EN INSERT', { message: err?.message });
        }
      }
      
      await logToStorage('📊 Resultado inserts', { success: successCount, fail: failCount, total: locations.length });
      
      // Actualizar estadísticas de la sesión
      try {
        // Primero obtener la sesión actual
        const getResponse = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/driving_sessions?id=eq.${sessionId}&select=*`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${session.access_token}`
            }
          },
          10000
        );
        
        if (getResponse.ok) {
          const sessions = await getResponse.json();
          if (sessions && sessions.length > 0) {
            const sessionData = sessions[0];
            const now = new Date();
            const startTime = new Date(sessionData.start_time);
            const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            
            // Actualizar la sesión
            const updateResponse = await fetchWithTimeout(
              `${SUPABASE_URL}/rest/v1/driving_sessions?id=eq.${sessionId}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${session.access_token}`,
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  duration_seconds: durationSeconds,
                  locations_count: (sessionData.locations_count || 0) + successCount,
                  updated_at: now.toISOString()
                })
              },
              10000
            );
            
            if (updateResponse.ok) {
              await logToStorage('✅ Sesión actualizada', { duration: durationSeconds, newLocations: successCount });
            } else {
              const errorText = await updateResponse.text();
              await logToStorage('❌ Error actualizando sesión', { error: errorText });
            }
          }
        }
      } catch (error: any) {
        await logToStorage('❌ Error en actualización de sesión', { message: error?.message });
      }
      
    } catch (err: any) {
      await logToStorage('💥 Error general en background task', { message: err?.message });
    }
  }
});

// ============================================================================
// SERVICIO
// ============================================================================

class LocationTrackingService {
  private isTracking: boolean = false;
  private currentUserId: string | null = null;
  private currentPlate: string | null = null;
  
  private sessionId: string | null = null;
  private startTime: Date | null = null;
  private lastLocation: { latitude: number; longitude: number } | null = null;
  private totalDistance: number = 0;
  private locationCount: number = 0;

  /**
   * Inicializa el servicio con userId y matrícula
   */
  async initialize(userId: string, plate: string): Promise<void> {
    this.currentUserId = userId;
    this.currentPlate = plate;
    
    // Resetear stats
    this.sessionId = null;
    this.startTime = null;
    this.lastLocation = null;
    this.totalDistance = 0;
    this.locationCount = 0;
    
    console.log('🔧 LocationTrackingService inicializado');
    console.log('👤 User ID:', userId);
    console.log('🚗 Plate:', plate);
  }

  /**
   * Obtiene estadísticas del tracking actual
   */
  async getTrackingStats(): Promise<TrackingStats | null> {
    if (!this.isTracking || !this.startTime) {
      return null;
    }

    const now = new Date();
    const duration = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);

    return {
      duration,
      distance: this.totalDistance
    };
  }

  /**
   * Lee los logs guardados durante background
   */
  async readBackgroundLogs(): Promise<any[]> {
    try {
      const logsStr = await AsyncStorage.getItem('background_logs');
      return logsStr ? JSON.parse(logsStr) : [];
    } catch (error) {
      console.error('Error leyendo logs:', error);
      return [];
    }
  }

  /**
   * Limpia los logs de background
   */
  async clearBackgroundLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem('background_logs');
      console.log('✅ Logs de background limpiados');
    } catch (error) {
      console.error('Error limpiando logs:', error);
    }
  }

  /**
   * Calcula distancia entre dos puntos GPS (Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Actualiza la sesión con stats actuales
   */
  private async updateSession(): Promise<void> {
    if (!this.sessionId || !this.startTime) {
      return;
    }

    try {
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);

      const { error } = await supabase
        .from('driving_sessions')
        .update({
          duration_seconds: durationSeconds,
          distance_meters: Math.round(this.totalDistance),
          locations_count: this.locationCount,
          end_latitude: this.lastLocation?.latitude,
          end_longitude: this.lastLocation?.longitude,
          updated_at: now.toISOString()
        })
        .eq('id', this.sessionId);

      if (error) {
        console.error('❌ Error actualizando sesión:', error);
      } else {
        console.log(`✅ Sesión actualizada: ${durationSeconds}s, ${this.totalDistance.toFixed(0)}m`);
      }
    } catch (error) {
      console.error('❌ Error en updateSession:', error);
    }
  }

  /**
   * Inicia el tracking de ubicación en background
   */
  async startTracking(): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log('⚠️ Tracking ya está activo');
        return true;
      }

      console.log('🚀 Iniciando tracking...');

      // Validar configuración
      if (!this.currentUserId || !this.currentPlate) {
        console.error('❌ Servicio no inicializado correctamente');
        return false;
      }

      // Crear sesión en BD
      this.startTime = new Date();
      this.lastLocation = null;
      this.totalDistance = 0;
      this.locationCount = 0;

      const { data: session, error: sessionError } = await supabase
        .from('driving_sessions')
        .insert({
          user_id: this.currentUserId,
          plate: this.currentPlate,
          start_time: this.startTime.toISOString(),
          duration_seconds: 0,
          distance_meters: 0,
          locations_count: 0
        })
        .select()
        .single();

      if (sessionError || !session) {
        console.error('❌ Error creando sesión:', sessionError);
        throw new Error('No se pudo crear la sesión de conducción');
      }

      this.sessionId = session.id;
      console.log('✅ Sesión creada:', this.sessionId);

      // Guardar datos para el background task
      await AsyncStorage.setItem('active_tracking_session', JSON.stringify({
        userId: this.currentUserId,
        plate: this.currentPlate,
        sessionId: this.sessionId,
        startTime: this.startTime?.toISOString()
      }));
      console.log('💾 Datos de tracking guardados para background');

      // Verificar permisos
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('❌ Permiso de ubicación foreground denegado');
        throw new Error('Permiso de ubicación denegado');
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.error('❌ Permiso de ubicación background denegado');
        throw new Error('Permiso de ubicación en background denegado');
      }

      console.log('✅ Permisos otorgados');

      // Iniciar foreground service
      await this.startForegroundService();

      // Iniciar tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: GPS_UPDATE_INTERVAL,
        foregroundService: {
          notificationTitle: '🚗 Modo Conductor Activo',
          notificationBody: 'DriveSkore está registrando tu ubicación',
          notificationColor: '#007AFF',
        },
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
      });

      console.log('✅ Location updates iniciados');

      this.isTracking = true;
      console.log('✅ Tracking iniciado exitosamente');
      
      return true;
    } catch (error) {
      console.error('❌ Error iniciando tracking:', error);
      
      // Limpiar sesión si falla
      if (this.sessionId) {
        await supabase
          .from('driving_sessions')
          .delete()
          .eq('id', this.sessionId);
        this.sessionId = null;
      }
      
      // Limpiar AsyncStorage
      await AsyncStorage.removeItem('active_tracking_session');
      
      return false;
    }
  }

  /**
   * Inicia el servicio en primer plano con notificación
   */
  private async startForegroundService(): Promise<void> {
    try {
      await Notifications.setNotificationChannelAsync('location-tracking', {
        name: 'Tracking de Ubicación',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚗 Modo Conductor Activo',
          body: 'DriveSkore está registrando tu ubicación',
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
      
      console.log('✅ Foreground service iniciado');
    } catch (error) {
      console.error('❌ Error iniciando foreground service:', error);
    }
  }

  /**
   * Detiene el tracking
   */
  async stopTracking(): Promise<boolean> {
    try {
      if (!this.isTracking) {
        console.log('⚠️ Tracking ya está inactivo');
        return true;
      }

      console.log('⏸️ Deteniendo tracking...');

      // Finalizar sesión
      if (this.sessionId && this.startTime) {
        const endTime = new Date();
        const durationSeconds = Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);

        await supabase
          .from('driving_sessions')
          .update({
            end_time: endTime.toISOString(),
            duration_seconds: durationSeconds,
            distance_meters: Math.round(this.totalDistance),
            locations_count: this.locationCount,
            end_latitude: this.lastLocation?.latitude,
            end_longitude: this.lastLocation?.longitude
          })
          .eq('id', this.sessionId);

        console.log(`✅ Sesión finalizada: ${durationSeconds}s, ${this.totalDistance.toFixed(0)}m, ${this.locationCount} ubicaciones`);
      }

      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('✅ Location updates detenidos');
      }

      await Notifications.dismissAllNotificationsAsync();
      console.log('✅ Notificaciones canceladas');

      // Limpiar datos de AsyncStorage
      await AsyncStorage.removeItem('active_tracking_session');
      console.log('🧹 Datos de tracking limpiados de AsyncStorage');

      // Resetear stats
      this.isTracking = false;
      this.sessionId = null;
      this.startTime = null;
      this.lastLocation = null;
      this.totalDistance = 0;
      this.locationCount = 0;

      console.log('✅ Tracking detenido exitosamente');
      
      return true;
    } catch (error) {
      console.error('❌ Error deteniendo tracking:', error);
      return false;
    }
  }

  /**
   * Verifica si está activo
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Limpia el servicio
   */
  cleanup(): void {
    console.log('🧹 Limpiando LocationTrackingService...');
    
    this.isTracking = false;
    this.currentUserId = null;
    this.currentPlate = null;
    this.sessionId = null;
    this.startTime = null;
    this.lastLocation = null;
    this.totalDistance = 0;
    this.locationCount = 0;
    
    console.log('✅ LocationTrackingService limpiado');
  }
}

export default new LocationTrackingService();
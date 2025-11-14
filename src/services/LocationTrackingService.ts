// src/services/LocationTrackingService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../config/supabase';

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

interface QueuedLocation {
  user_id: string;
  plate: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
}

interface DriverLocationInsert {
  user_id: string;
  plate: string;
  session_id: string | null;
  latitude: number;
  longitude: number;
  location: string;
  accuracy: number;
  speed: number;
  heading: number;
  bluetooth_mac_hash: string;
  captured_at: string;
}

interface TrackingStats {
  duration: number;
  distance: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const LOCATION_TASK_NAME = 'background-location-task';
const SYNC_INTERVAL = 5000; // 5 segundos
const GPS_UPDATE_INTERVAL = 1000; // 1 segundos
const GPS_DISTANCE_INTERVAL = 10; // 10 metros
const MIN_DISTANCE_THRESHOLD = 50; // 🎯 Umbral mínimo para contar distancia

// ============================================================================
// SERVICIO
// ============================================================================

class LocationTrackingService {
  private isTracking: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
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
    
    // Definir tarea de background
    await this.defineBackgroundTask();
  }

  /**
   * Obtiene estadísticas del tracking actual
   */
  async getTrackingStats(): Promise<TrackingStats | null> {
    if (!this.isTracking || !this.startTime) {
      return null;
    }

    // Calcular duración en segundos
    const now = new Date();
    const duration = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);

    return {
      duration,
      distance: this.totalDistance
    };
  }

  /**
   * Define la tarea que se ejecutará en background
   */
  private async defineBackgroundTask(): Promise<void> {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
      if (error) {
        console.error('❌ Error en background task:', error);
        return;
      }

      if (data) {
        const { locations } = data;
        
        // Procesar cada ubicación capturada
        for (const location of locations) {
          await this.processLocation(location);
        }
      }
    });
  }

  /**
   * Procesa una ubicación capturada
   */
  private async processLocation(location: Location.LocationObject): Promise<void> {
    try {
      const locationData: QueuedLocation = {
        user_id: this.currentUserId!,
        plate: this.currentPlate!,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        speed: location.coords.speed ? location.coords.speed * 3.6 : 0,
        heading: location.coords.heading || 0,
        timestamp: new Date(location.timestamp).toISOString(),
      };

      // 🎯 CALCULAR DISTANCIA CON FILTRO
      if (this.lastLocation) {
        const distance = this.calculateDistance(
          this.lastLocation.latitude,
          this.lastLocation.longitude,
          locationData.latitude,
          locationData.longitude
        );

        // ✅ FILTRO: Solo contar si el movimiento es >= 50m
        // Esto elimina el "ruido" del GPS cuando estás parado
        if (distance >= MIN_DISTANCE_THRESHOLD) {
          this.totalDistance += distance;
          
          // Solo actualizar lastLocation si el movimiento fue significativo
          this.lastLocation = { 
            latitude: locationData.latitude, 
            longitude: locationData.longitude 
          };
          
          console.log(`📍 Movimiento válido #${this.locationCount}: ${distance.toFixed(0)}m | Total: ${this.totalDistance.toFixed(0)}m`);
        } else {
          console.log(`⏸️ Movimiento ignorado: ${distance.toFixed(1)}m (< ${MIN_DISTANCE_THRESHOLD}m)`);
        }
      } else {
        // Primera ubicación = punto de referencia
        this.lastLocation = { 
          latitude: locationData.latitude, 
          longitude: locationData.longitude 
        };
        console.log('📍 Primera ubicación establecida como referencia');
      }

      this.locationCount++;

      // Guardar en cola local (SIEMPRE, para el tracking en BD)
      await this.queueLocationUpdate(locationData);

      // Actualizar sesión cada 5 ubicaciones
      if (this.locationCount % 5 === 0) {
        await this.updateSession();
      }
    } catch (error) {
      console.error('❌ Error procesando ubicación:', error);
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
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
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
   * Añade una ubicación a la cola local
   */
  private async queueLocationUpdate(locationData: QueuedLocation): Promise<void> {
    try {
      const queueKey = `location_queue_${this.currentUserId}`;
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue: QueuedLocation[] = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push(locationData);
      
      // Limitar tamaño de cola (últimas 20 ubicaciones)
      const trimmedQueue = queue.slice(-20);
      
      await AsyncStorage.setItem(queueKey, JSON.stringify(trimmedQueue));
    } catch (error) {
      console.error('❌ Error guardando en cola:', error);
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
        distanceInterval: GPS_DISTANCE_INTERVAL,
        foregroundService: {
          notificationTitle: '🚗 Modo Conductor Activo',
          notificationBody: 'DriveSkore está registrando tu ubicación',
          notificationColor: '#007AFF',
        },
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
      });

      console.log('✅ Location updates iniciados');

      // Iniciar sincronización periódica
      this.startPeriodicSync();

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
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚗 Modo Conductor Activo',
          body: 'DriveSkore está registrando tu ubicación',
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });
      
      console.log('✅ Foreground service iniciado');
    } catch (error) {
      console.error('❌ Error iniciando foreground service:', error);
    }
  }

  /**
   * Inicia sincronización periódica
   */
  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      this.syncQueuedLocations();
    }, SYNC_INTERVAL);
    
    console.log('✅ Sincronización periódica iniciada (cada 5s)');
  }

  /**
   * Sincroniza ubicaciones en cola con Supabase
   */
  private async syncQueuedLocations(): Promise<void> {
    try {
      // Validación temprana
      if (!this.currentUserId || !this.currentPlate) {
        console.error('❌ No hay userId o plate configurado');
        return;
      }
  
      const userId: string = this.currentUserId;
      const plate: string = this.currentPlate;
  
      const queueKey = `location_queue_${userId}`;
      const existingQueue = await AsyncStorage.getItem(queueKey);
      
      if (!existingQueue) return;
      
      const queue: QueuedLocation[] = JSON.parse(existingQueue);
      
      if (queue.length === 0) return;
  
      console.log(`📡 Sincronizando ${queue.length} ubicaciones...`);
  
      const locationsToSync = queue.slice(-5);
      
      // Preparar datos con session_id
      const insertData: DriverLocationInsert[] = locationsToSync.map((loc: QueuedLocation) => ({
        user_id: userId,
        plate: plate,
        session_id: this.sessionId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location: `POINT(${loc.longitude} ${loc.latitude})`,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        bluetooth_mac_hash: 'placeholder',
        captured_at: loc.timestamp,
      }));
  
      console.log('📦 Preparando insert de', insertData.length, 'ubicaciones');

      const { data, error } = await supabase
        .from('driver_locations')
        .insert(insertData)
        .select();
  
      if (error) {
        console.error('❌ Error insertando ubicaciones:', error.message);
        console.log('🔄 Intentando inserción individual...');
        
        let successCount = 0;
        for (const item of insertData) {
          const { error: singleError } = await supabase
            .from('driver_locations')
            .insert(item);
          
          if (singleError) {
            console.error('❌ Error individual:', singleError.message);
          } else {
            successCount++;
          }
        }
        
        console.log(`✅ Insertadas ${successCount}/${insertData.length} ubicaciones`);
        
        if (successCount > 0) {
          await AsyncStorage.removeItem(queueKey);
        }
        
        return;
      }
  
      console.log('✅ Ubicaciones insertadas:', data?.length || 0);
      await AsyncStorage.removeItem(queueKey);
      console.log('🧹 Cola limpiada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en syncQueuedLocations:', error);
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

      console.log('📡 Sincronizando ubicaciones pendientes...');
      await this.syncQueuedLocations();

      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
        console.log('✅ Timer detenido');
      }

      await Notifications.dismissAllNotificationsAsync();
      console.log('✅ Notificaciones canceladas');

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
   * Obtiene estadísticas de la cola
   */
  async getQueueStats(): Promise<{ count: number; oldest?: string; newest?: string }> {
    try {
      const queueKey = `location_queue_${this.currentUserId}`;
      const existingQueue = await AsyncStorage.getItem(queueKey);
      
      if (!existingQueue) {
        return { count: 0 };
      }
      
      const queue: QueuedLocation[] = JSON.parse(existingQueue);
      
      return {
        count: queue.length,
        oldest: queue[0]?.timestamp,
        newest: queue[queue.length - 1]?.timestamp,
      };
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error);
      return { count: 0 };
    }
  }

  /**
   * Fuerza sincronización inmediata
   */
  async forceSyncNow(): Promise<boolean> {
    try {
      console.log('🔄 Forzando sincronización...');
      await this.syncQueuedLocations();
      return true;
    } catch (error) {
      console.error('❌ Error en sync forzado:', error);
      return false;
    }
  }

  /**
   * Limpia el servicio
   */
  cleanup(): void {
    console.log('🧹 Limpiando LocationTrackingService...');
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
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
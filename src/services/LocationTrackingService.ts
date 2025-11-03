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
    latitude: number;          // ✅ Columna numérica
    longitude: number;         // ✅ Columna numérica
    location: string;          // ✅ PostGIS POINT format
    accuracy: number;          // ✅ Añadido
    speed: number;
    heading: number;
    bluetooth_mac_hash: string;
    captured_at: string;
  }

// ============================================================================
// CONSTANTES
// ============================================================================

const LOCATION_TASK_NAME = 'background-location-task';
const SYNC_INTERVAL = 15000; // 15 segundos
const GPS_UPDATE_INTERVAL = 5000; // 5 segundos
const GPS_DISTANCE_INTERVAL = 10; // 10 metros

// ============================================================================
// SERVICIO
// ============================================================================

class LocationTrackingService {
  private isTracking: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;
  private currentPlate: string | null = null;

  /**
   * Inicializa el servicio con userId y matrícula
   */
  async initialize(userId: string, plate: string): Promise<void> {
    this.currentUserId = userId;
    this.currentPlate = plate;
    
    console.log('🔧 LocationTrackingService inicializado');
    console.log('👤 User ID:', userId);
    console.log('🚗 Plate:', plate);
    
    // Definir tarea de background
    await this.defineBackgroundTask();
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

      // Guardar en cola local
      await this.queueLocationUpdate(locationData);
      
      console.log('📍 Ubicación procesada:', locationData.latitude.toFixed(6), locationData.longitude.toFixed(6));
    } catch (error) {
      console.error('❌ Error procesando ubicación:', error);
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

      // 1. Verificar permisos
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

      // 2. Iniciar foreground service
      await this.startForegroundService();

      // 3. Iniciar tracking
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

      // 4. Iniciar sincronización periódica
      this.startPeriodicSync();

      this.isTracking = true;
      console.log('✅ Tracking iniciado exitosamente');
      
      return true;
    } catch (error) {
      console.error('❌ Error iniciando tracking:', error);
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
    
    console.log('✅ Sincronización periódica iniciada (cada 15s)');
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
      
      // ✅ Preparar datos con TODAS las columnas necesarias
      const insertData = locationsToSync.map((loc: QueuedLocation) => ({
        user_id: userId,
        plate: plate,
        latitude: loc.latitude,                                      // ← Columna numérica
        longitude: loc.longitude,                                    // ← Columna numérica
        location: `POINT(${loc.longitude} ${loc.latitude})`,         // ← PostGIS (lon primero!)
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        bluetooth_mac_hash: 'placeholder',
        captured_at: loc.timestamp,
      }));
  
      console.log('📦 Preparando insert de', insertData.length, 'ubicaciones');
      console.log('📍 Primera ubicación:', {
        lat: insertData[0].latitude,
        lon: insertData[0].longitude,
        location: insertData[0].location,
      });
  
      const { data, error } = await supabase
        .from('driver_locations')
        .insert(insertData)
        .select();
  
      if (error) {
        console.error('❌ Error insertando ubicaciones:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.log('🔄 Intentando inserción individual...');
        
        let successCount = 0;
        for (const item of insertData) {
          console.log('📍 Insertando ubicación individual:', {
            lat: item.latitude,
            lon: item.longitude,
          });
          
          const { error: singleError } = await supabase
            .from('driver_locations')
            .insert(item);
          
          if (singleError) {
            console.error('❌ Error individual:', singleError.message);
            console.error('❌ Datos que fallaron:', JSON.stringify(item, null, 2));
          } else {
            successCount++;
            console.log('✅ Ubicación insertada exitosamente');
          }
        }
        
        console.log(`✅ Insertadas ${successCount}/${insertData.length} ubicaciones`);
        
        if (successCount > 0) {
          await AsyncStorage.removeItem(queueKey);
          console.log('🧹 Cola limpiada');
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

      this.isTracking = false;
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
    
    console.log('✅ LocationTrackingService limpiado');
  }
}

export default new LocationTrackingService();
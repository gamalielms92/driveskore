// src/services/EventCaptureService.ts

import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { Audio } from 'expo-av';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { LogBox, PermissionsAndroid, Platform, Vibration } from 'react-native';
import DriverMatchingService from './DriverMatchingService';

// ✅ Import condicional de Bluetooth (solo móvil)
let BleManager: any = null;
if (Platform.OS !== 'web') {
  try {
    BleManager = require('react-native-ble-manager').default;
  } catch (error) {
    console.warn('⚠️ react-native-ble-manager no disponible');
  }
}

// ✅ Tipo para periféricos Bluetooth
interface BlePeripheral {
  id: string;
  rssi?: number;
  name?: string;
  advertising?: any;
}

// ✅ Suprimir warnings conocidos de react-native-ble-manager
if (Platform.OS !== 'web') {
  LogBox.ignoreLogs([
    'new NativeEventEmitter',
    'EventEmitter.removeListener',
  ]);
}

// Tipos importados
import type {
  BluetoothDevice,
  CapturedEvent,
  EventContext,
  LocationData,
  MotionData
} from '../types/events';

class EventCaptureService {
  private currentUserId: string | null = null;
  private accelerometerSubscription: any = null;
  private lastAcceleration: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private confirmationSound: Audio.Sound | null = null;
  private bleInitialized: boolean = false;
  private bleEnabled: boolean = true; // ✅ Flag para deshabilitar BT si falla

  /**
   * Inicializa el servicio
   */
  async initialize(userId: string) {
    // ✅ CRÍTICO: EventCaptureService no funciona en Web
    if (Platform.OS === 'web') {
      console.log('ℹ️ EventCaptureService deshabilitado en Web (solo disponible en móvil)');
      this.currentUserId = userId; // Guardar userId pero no inicializar sensores
      return;
    }

    console.log('🔄 EventCaptureService.initialize() llamado');
    console.log('📋 userId recibido:', userId);
    console.log('📋 currentUserId anterior:', this.currentUserId);
    
    this.currentUserId = userId;
    
    console.log('✅ currentUserId actualizado:', this.currentUserId);
    
    // Solicitar permisos necesarios
    await this.requestPermissions();
    
    // ✅ Inicializar Bluetooth
    await this.initializeBluetooth();
    
    // Inicializar sensor de acelerómetro
    this.startAccelerometerTracking();
    
    // Cargar sonido de confirmación (opcional)
    await this.loadConfirmationSound();
    
    console.log('✅ EventCaptureService inicializado completamente');
  }

  /**
   * Solicita todos los permisos necesarios
   */
  private async requestPermissions() {
    // Permisos de ubicación
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationStatus !== 'granted') {
      throw new Error('Permiso de ubicación denegado');
    }

    // ✅ Permisos de Bluetooth (Android)
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 31) {
        // Android 12+ (API 31+): Requiere BLUETOOTH_SCAN y BLUETOOTH_CONNECT
        const scanPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: 'Permiso Bluetooth',
            message: 'DriveSkore necesita escanear dispositivos Bluetooth cercanos',
            buttonPositive: 'Permitir',
          }
        );
        
        const connectPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Permiso Bluetooth',
            message: 'DriveSkore necesita conectarse a dispositivos Bluetooth',
            buttonPositive: 'Permitir',
          }
        );
        
        if (scanPermission !== PermissionsAndroid.RESULTS.GRANTED || 
            connectPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('⚠️ Permisos de Bluetooth denegados (Android 12+)');
        }
      } else {
        // Android < 12: Solo requiere ACCESS_FINE_LOCATION
        const locationPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación',
            message: 'DriveSkore necesita ubicación para escanear Bluetooth',
            buttonPositive: 'Permitir',
          }
        );
        
        if (locationPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('⚠️ Permiso de ubicación denegado (necesario para BLE)');
        }
      }
    }
  }

  /**
   * ✅ Inicializa el módulo de Bluetooth
   * Solo funciona en móvil (Android/iOS), no en Web
   */
  private async initializeBluetooth() {
    // ✅ CRÍTICO: Bluetooth no existe en Web
    if (Platform.OS === 'web') {
      console.log('ℹ️ Plataforma Web detectada - Bluetooth deshabilitado');
      this.bleInitialized = false;
      this.bleEnabled = false;
      return;
    }

    // Verificar que BleManager esté disponible
    if (!BleManager) {
      console.warn('⚠️ BleManager no disponible - Bluetooth deshabilitado');
      this.bleInitialized = false;
      this.bleEnabled = false;
      return;
    }

    try {
      console.log('📡 Inicializando Bluetooth...');
      await BleManager.start({ showAlert: false });
      this.bleInitialized = true;
      console.log('✅ Bluetooth inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando Bluetooth:', error);
      this.bleInitialized = false;
      // No lanzar error - la app puede funcionar sin Bluetooth
    }
  }

  /**
   * Cargar archivo de sonido de confirmación (opcional)
   */
  private async loadConfirmationSound() {
    try {
      // NOTA: Descomentar cuando tengas el archivo de sonido
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../assets/sounds/confirmation.mp3')
      // );
      // this.confirmationSound = sound;
      // console.log('🔊 Sonido de confirmación cargado');
      
      console.log('ℹ️ Sonido de confirmación deshabilitado (archivo no encontrado)');
    } catch (error) {
      console.log('ℹ️ Sonido de confirmación no disponible:', error);
      // No es crítico, continuar solo con haptics
    }
  }

  /**
   * Inicia el tracking del acelerómetro para detectar movimiento
   */
  private startAccelerometerTracking() {
    Sensors.Accelerometer.setUpdateInterval(1000); // 1 segundo
    
    this.accelerometerSubscription = Sensors.Accelerometer.addListener(
      (accelerometerData) => {
        this.lastAcceleration = accelerometerData;
      }
    );
  }

  /**
   * Captura un evento completo cuando el usuario pulsa el botón
   */
  async captureEvent(
    deviceType: 'bicycle' | 'car' | 'motorcycle' | 'pedestrian',
    plate?: string,
    photoUri?: string
  ): Promise<CapturedEvent> {
    console.log('📸 ========== INICIANDO CAPTURA DE EVENTO ==========');
    console.log('📸 deviceType:', deviceType);
    console.log('📸 plate:', plate);
    console.log('📸 photoUri:', photoUri ? 'presente' : 'no presente');

    const eventId = Crypto.randomUUID();
    const timestamp = new Date().toISOString();
    console.log('📸 eventId generado:', eventId);

    try {
      console.log('📍 [1/5] Capturando ubicación...');
      const locationPromise = this.captureLocation();
      
      console.log('📡 [2/5] Escaneando Bluetooth...');
      const bluetoothPromise = this.scanNearbyBluetooth();
      
      console.log('⏳ Esperando ubicación y Bluetooth en paralelo...');
      const [location, nearbyBluetooth] = await Promise.all([
        locationPromise,
        bluetoothPromise,
      ]);
      console.log('✅ Ubicación y Bluetooth completados');

      console.log('🏃 [3/5] Capturando movimiento...');
      const motion = this.captureMotion(location);
      console.log('✅ Movimiento capturado');

      console.log('🌍 [4/5] Capturando contexto...');
      const context = this.captureContext(deviceType);
      console.log('✅ Contexto capturado');

      console.log('📦 [5/5] Construyendo objeto de evento...');
      const event: CapturedEvent = {
        id: eventId,
        evaluator_user_id: this.currentUserId!,
        timestamp,
        location,
        nearby_bluetooth: nearbyBluetooth,
        motion,
        context,
        status: 'pending',
        plate: plate,
        photo_uri: photoUri,
      };
      console.log('✅ Objeto de evento construido');

      console.log('💾 Guardando evento localmente...');
      await this.saveEventLocally(event);
      console.log('✅ Evento guardado');

      console.log('🔍 Ejecutando matching en background...');
      this.executeBackgroundMatching(event).catch(error => {
        console.error('❌ Error en matching background:', error);
      });

      console.log('📳 Proporcionando feedback al usuario...');
      await this.provideFeedback();
      console.log('✅ Feedback completado');

      console.log('✅ ========== EVENTO CAPTURADO EXITOSAMENTE ==========');
      console.log('✅ Event ID:', eventId);

      return event;
    } catch (error) {
      console.error('❌ ========== ERROR EN CAPTURA DE EVENTO ==========');
      console.error('❌ Error:', error);
      console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
      throw error;
    }
  }

  /**
   * Ejecuta matching en segundo plano y guarda candidatos
   */
  private async executeBackgroundMatching(event: CapturedEvent): Promise<void> {
    try {
      console.log('🔍 [Background] Iniciando matching para evento:', event.id);
      
      // Ejecutar matching
      const candidates = await DriverMatchingService.findCandidates(event);
      
      console.log(`📊 [Background] Encontrados ${candidates.length} candidatos`);
      
      if (candidates.length > 0) {
        // Guardar candidatos en AsyncStorage
        const candidatesKey = `candidates_${event.id}`;
        await AsyncStorage.setItem(candidatesKey, JSON.stringify(candidates));
        console.log('💾 [Background] Candidatos guardados para:', event.id);
        
        // Actualizar el evento con metadata
        const eventKey = `pending_event_${this.currentUserId}_${event.id}`;
        const updatedEvent: CapturedEvent = {
          ...event,
          has_candidates: true,
          candidates_count: candidates.length,
          matching_executed_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem(eventKey, JSON.stringify(updatedEvent));
        console.log(`✅ [Background] Evento actualizado con ${candidates.length} candidatos`);
      } else {
        console.log('ℹ️ [Background] No se encontraron candidatos para:', event.id);
      }
      
    } catch (error) {
      console.error('❌ [Background] Error en matching:', error);
      // No lanzamos el error para que no afecte la captura del evento
    }
  }

  /**
   * Captura la ubicación GPS actual con máxima precisión
   */
  private async captureLocation(): Promise<LocationData> {
    console.log('📍 Capturando ubicación GPS...');

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      altitude: location.coords.altitude || undefined,
      speed: location.coords.speed || undefined, // m/s
      heading: location.coords.heading || undefined, // grados
    };
  }

  /**
   * ✅ ACTIVADO: Escanea dispositivos Bluetooth cercanos
   * CRÍTICO: Solo guardamos hashes de MAC por privacidad
   */
  private async scanNearbyBluetooth(): Promise<BluetoothDevice[]> {
    // Verificar si BT está habilitado
    if (!this.bleEnabled) {
      console.log('ℹ️ Bluetooth deshabilitado por flag - saltando escaneo');
      return [];
    }

    if (!this.bleInitialized) {
      console.warn('⚠️ Bluetooth no inicializado - saltando escaneo');
      return [];
    }

    console.log('📡 Escaneando dispositivos Bluetooth...');

    try {
      // ✅ Timeout agresivo de 2.5 segundos total
      const devices = await Promise.race([
        this.performBluetoothScan(),
        new Promise<BluetoothDevice[]>((resolve) => {
          setTimeout(() => {
            console.warn('⏱️ Timeout de Bluetooth (2.5s) - continuando sin BT');
            resolve([]);
          }, 2500);
        })
      ]);
      
      console.log(`✅ Escaneo BT completado: ${devices.length} dispositivos`);
      return devices;

    } catch (error) {
      console.error('❌ Error escaneando Bluetooth:', error);
      return [];
    }
  }

  /**
   * ✅ NUEVO: Realiza el escaneo Bluetooth real
   */
  private async performBluetoothScan(): Promise<BluetoothDevice[]> {
    // Verificación adicional de seguridad
    if (!BleManager) {
      console.warn('⚠️ BleManager no disponible en performBluetoothScan');
      return [];
    }

    try {
      console.log('📡 Iniciando BleManager.scan()...');
      
      // Escanear durante 2 segundos
      await BleManager.scan([], 2, false);
      console.log('📡 BleManager.scan() iniciado');

      // Esperar a que termine el escaneo (2.1s)
      await new Promise(resolve => setTimeout(resolve, 2100));
      console.log('📡 Esperando periféricos descubiertos...');

      // Obtener periféricos descubiertos
      const peripherals = await BleManager.getDiscoveredPeripherals();
      console.log(`📱 Dispositivos BT encontrados: ${peripherals.length}`);

      if (peripherals.length === 0) {
        console.log('ℹ️ No se encontraron dispositivos Bluetooth');
        return [];
      }

      // Convertir a nuestro formato y hashear MACs
      const devices: BluetoothDevice[] = peripherals.map((peripheral: BlePeripheral) => {
        // Hash SHA-256 de la MAC address para privacidad
        const macHash = CryptoJS.SHA256(peripheral.id).toString();

        return {
          mac_address_hash: macHash,
          rssi: peripheral.rssi || -100,
          name: peripheral.name || 'Unknown',
          distance_estimate: this.estimateDistanceFromRSSI(peripheral.rssi || -100),
        };
      });

      // Log de primeros 3 dispositivos para debug
      if (devices.length > 0) {
        console.log('✅ Dispositivos BT procesados:', devices.length);
        devices.slice(0, 3).forEach((device, i) => {
          console.log(`  ${i + 1}. RSSI: ${device.rssi}dBm, Dist: ${device.distance_estimate}m`);
        });
      }

      return devices;
    } catch (error) {
      console.error('❌ Error en performBluetoothScan:', error);
      return [];
    }
  }

  /**
   * Estima distancia en metros basada en RSSI
   * Formula: d = 10 ^ ((TxPower - RSSI) / (10 * n))
   * TxPower asumido: -59 dBm (típico a 1m)
   * n (factor ambiental): 2.0 (espacio abierto)
   */
  private estimateDistanceFromRSSI(rssi: number): number {
    const txPower = -59; // Potencia de transmisión típica a 1 metro
    const n = 2.0; // Factor de propagación (2.0 = espacio abierto)

    if (rssi === 0) {
      return -1; // Señal no disponible
    }

    const ratio = (txPower - rssi) / (10 * n);
    const distance = Math.pow(10, ratio);

    // Redondear a 1 decimal
    return Math.round(distance * 10) / 10;
  }

  /**
   * Captura datos de movimiento del acelerómetro
   */
  private captureMotion(location: LocationData): MotionData {
    const { x, y, z } = this.lastAcceleration;

    // Calcular magnitud de aceleración (vectorial)
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    return {
      acceleration: {
        x,
        y,
        z,
      },
      velocity_estimated: location.speed || 0,
      heading: location.heading || this.calculateHeadingFromAccelerometer(),
    };
  }

  /**
   * Calcula heading aproximado desde acelerómetro si GPS no lo tiene
   */
  private calculateHeadingFromAccelerometer(): number {
    const { x, y } = this.lastAcceleration;
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }

  /**
   * Captura contexto adicional
   */
  private captureContext(
    deviceType: 'bicycle' | 'car' | 'motorcycle' | 'pedestrian'
  ): EventContext {
    const hour = new Date().getHours();
    let lightCondition: 'day' | 'night' | 'dusk';

    if (hour >= 7 && hour < 19) {
      lightCondition = 'day';
    } else if (hour >= 19 && hour < 21) {
      lightCondition = 'dusk';
    } else {
      lightCondition = 'night';
    }

    return {
      device_type: deviceType,
      light_condition: lightCondition,
      // weather_condition se puede obtener de una API externa si se desea
    };
  }

  /**
   * Guarda el evento en almacenamiento local con aislamiento por usuario
   */
  private async saveEventLocally(event: CapturedEvent) {
    // IMPORTANTE: Incluir userId para aislar eventos por usuario
    const key = `pending_event_${event.evaluator_user_id}_${event.id}`;
    const eventString = JSON.stringify(event);
    await AsyncStorage.setItem(key, eventString);
    console.log('💾 Evento guardado localmente:', key);
    console.log('📦 Tamaño del evento:', eventString.length, 'caracteres');
    
    // Verificar que se guardó correctamente
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      console.log('✅ Verificación: evento guardado correctamente');
    } else {
      console.error('❌ ERROR: No se pudo verificar el guardado del evento');
    }
  }

  /**
   * Proporciona feedback al usuario con múltiples opciones
   */
  private async provideFeedback() {
    try {
      // 1. HAPTICS (Prioridad alta - feedback táctil nativo)
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      console.log('✅ Feedback háptico ejecutado');
    } catch (hapticsError) {
      console.log('⚠️ Haptics no disponible:', hapticsError);
      
      // Fallback a vibración simple
      try {
        Vibration.vibrate(100);
        console.log('✅ Vibración ejecutada (fallback)');
      } catch (vibrationError) {
        console.log('⚠️ Vibración no disponible:', vibrationError);
      }
    }

    // 2. SONIDO (Opcional - solo si está cargado)
    if (this.confirmationSound) {
      try {
        await this.confirmationSound.replayAsync();
        console.log('🔊 Sonido de confirmación reproducido');
      } catch (soundError) {
        console.log('⚠️ Error reproduciendo sonido:', soundError);
      }
    }
  }

  /**
   * Obtiene todos los eventos pendientes DEL USUARIO ACTUAL
   */
  async getPendingEvents(): Promise<CapturedEvent[]> {
    if (!this.currentUserId) {
      console.warn('⚠️ No hay usuario autenticado');
      return [];
    }

    console.log('🔍 Buscando eventos pendientes del usuario:', this.currentUserId);
    const keys = await AsyncStorage.getAllKeys();
    console.log('📋 Total keys en AsyncStorage:', keys.length);
    
    // IMPORTANTE: Filtrar solo eventos de este usuario
    const userPrefix = `pending_event_${this.currentUserId}_`;
    const pendingKeys = keys.filter((key) => key.startsWith(userPrefix));
    console.log('📌 Keys de eventos del usuario actual:', pendingKeys.length);

    const events = await Promise.all(
      pendingKeys.map(async (key) => {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      })
    );

    const validEvents = events.filter((e) => e !== null);
    console.log('✅ Eventos válidos recuperados:', validEvents.length);
    
    return validEvents;
  }

  /**
   * Elimina un evento después de confirmarlo o descartarlo
   */
  async removeEvent(eventId: string) {
    if (!this.currentUserId) {
      console.warn('⚠️ No hay usuario autenticado');
      return;
    }

    const key = `pending_event_${this.currentUserId}_${eventId}`;
    await AsyncStorage.removeItem(key);
    console.log('🗑️ Evento eliminado:', key);
    
    // También eliminar candidatos asociados
    const candidatesKey = `candidates_${eventId}`;
    await AsyncStorage.removeItem(candidatesKey);
    console.log('🗑️ Candidatos eliminados:', candidatesKey);
  }

  /**
   * Limpia eventos antiguos que no tienen userId en la clave (migración)
   */
  async cleanupLegacyEvents() {
    console.log('🧹 Limpiando eventos legacy sin userId...');
    
    const keys = await AsyncStorage.getAllKeys();
    
    // Buscar eventos con formato antiguo: pending_event_{uuid}
    const legacyPattern = /^pending_event_[a-f0-9\-]{36}$/;
    const legacyKeys = keys.filter(key => legacyPattern.test(key));
    
    console.log('📋 Eventos legacy encontrados:', legacyKeys.length);
    
    if (legacyKeys.length > 0) {
      await Promise.all(legacyKeys.map(key => AsyncStorage.removeItem(key)));
      console.log('✅ Eventos legacy eliminados:', legacyKeys.length);
    }
  }

  /**
   * Limpia candidatos guardados de eventos eliminados
   */
  async cleanupOrphanedCandidates(): Promise<void> {
    try {
      console.log('🧹 Limpiando candidatos huérfanos...');
      
      const allKeys = await AsyncStorage.getAllKeys();
      const candidateKeys = allKeys.filter(key => key.startsWith('candidates_'));
      
      if (candidateKeys.length === 0) {
        console.log('✅ No hay candidatos guardados');
        return;
      }
      
      console.log(`🔍 Encontrados ${candidateKeys.length} candidatos guardados`);
      
      const orphanedKeys: string[] = [];
      
      for (const candidateKey of candidateKeys) {
        const eventId = candidateKey.replace('candidates_', '');
        const eventKey = `pending_event_${this.currentUserId}_${eventId}`;
        const eventExists = await AsyncStorage.getItem(eventKey);
        
        if (!eventExists) {
          orphanedKeys.push(candidateKey);
        }
      }
      
      if (orphanedKeys.length > 0) {
        await AsyncStorage.multiRemove(orphanedKeys);
        console.log(`🗑️ Eliminados ${orphanedKeys.length} candidatos huérfanos`);
      } else {
        console.log('✅ No hay candidatos huérfanos');
      }
      
    } catch (error) {
      console.error('❌ Error limpiando candidatos huérfanos:', error);
    }
  }

  /**
   * ✅ NUEVO: Deshabilita Bluetooth temporalmente (útil si da problemas)
   */
  disableBluetooth() {
    console.log('⚠️ Bluetooth deshabilitado manualmente');
    this.bleEnabled = false;
  }

  /**
   * ✅ NUEVO: Re-habilita Bluetooth
   */
  enableBluetooth() {
    console.log('✅ Bluetooth re-habilitado');
    this.bleEnabled = true;
  }

  /**
   * Limpia el servicio al cerrar sesión
   */
  cleanup() {
    console.log('🧹 Limpiando EventCaptureService...');
    
    // Limpiar subscripciones
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }
    
    // Limpiar sonido
    if (this.confirmationSound) {
      this.confirmationSound.unloadAsync().catch(err => {
        console.log('⚠️ Error descargando sonido:', err);
      });
      this.confirmationSound = null;
    }
    
    // Limpiar estado de Bluetooth
    this.bleInitialized = false;
    
    // IMPORTANTE: Limpiar userId al cerrar sesión
    this.currentUserId = null;
    
    console.log('✅ EventCaptureService limpiado');
  }
}

export default new EventCaptureService();

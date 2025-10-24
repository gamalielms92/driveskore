// src/services/EventCaptureService.ts

import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
// BLUETOOTH DESHABILITADO: Requiere development build (no funciona en Expo Go)
// Descomentar cuando tengamos APK custom
// import BleManager from 'react-native-ble-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { Vibration } from 'react-native';

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

  /**
   * Inicializa el servicio
   */
  async initialize(userId: string) {
    this.currentUserId = userId;
    
    // Solicitar permisos necesarios
    await this.requestPermissions();
    
    // Inicializar sensor de acelerómetro
    this.startAccelerometerTracking();
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

    // Permisos de Bluetooth se solicitan al escanear
    // Los sensores no requieren permisos explícitos en la mayoría de plataformas
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
    console.log('📸 Capturando evento...');

    const eventId = Crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      // Capturar en paralelo para minimizar latencia
      const [location, nearbyBluetooth] = await Promise.all([
        this.captureLocation(),
        this.scanNearbyBluetooth(),
      ]);

      const motion = this.captureMotion(location);
      const context = this.captureContext(deviceType);

      const event: CapturedEvent = {
        id: eventId,
        evaluator_user_id: this.currentUserId!,
        timestamp,
        location,
        nearby_bluetooth: nearbyBluetooth,
        motion,
        context,
        status: 'pending',
        plate: plate, // NUEVO: Guardar matrícula
        photo_uri: photoUri, // NUEVO: Guardar URI de foto
      };

      // Guardar evento en almacenamiento local
      await this.saveEventLocally(event);

      // Feedback al usuario (vibración + sonido)
      await this.provideFeedback();

      console.log('✅ Evento capturado exitosamente:', eventId);

      return event;
    } catch (error) {
      console.error('❌ Error capturando evento:', error);
      throw error;
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
   * Escanea dispositivos Bluetooth cercanos
   * CRÍTICO: Solo guardamos hashes de MAC por privacidad
   * 
   * ⚠️ TEMPORALMENTE DESHABILITADO: Requiere development build
   * Bluetooth no funciona en Expo Go, necesita APK custom
   */
  private async scanNearbyBluetooth(): Promise<BluetoothDevice[]> {
    console.log('⚠️ Bluetooth deshabilitado temporalmente (requiere development build)');
    return []; // Retorna array vacío - matching funcionará solo con GPS + Motion
    
    /* TODO: Descomentar cuando tengamos development build con react-native-ble-manager
    console.log('📡 Escaneando dispositivos Bluetooth...');

    try {
      // Escanear durante 5 segundos
      await BleManager.scan([], 5, false);

      // Obtener dispositivos descubiertos
      const devices = await BleManager.getDiscoveredPeripherals();

      const nearbyDevices = devices
        .filter((device) => device.rssi && device.rssi > -90) // Solo dispositivos cercanos
        .map((device) => ({
          mac_address_hash: this.hashMacAddress(device.id),
          rssi: device.rssi || -100,
          distance_estimate: this.estimateDistanceFromRSSI(device.rssi || -100),
          name: device.name || undefined,
        }));

      console.log(`✅ Encontrados ${nearbyDevices.length} dispositivos BT cercanos`);

      return nearbyDevices;
    } catch (error) {
      console.error('❌ Error escaneando Bluetooth:', error);
      return []; // No fallar si BT no disponible
    }
    */
  }

  /**
   * Hash del MAC address por privacidad (RGPD compliance)
   */
  private hashMacAddress(macAddress: string): string {
    return CryptoJS.SHA256(macAddress).toString();
  }

  /**
   * Estima distancia basada en RSSI
   * Fórmula: d = 10 ^ ((TxPower - RSSI) / (10 * N))
   * Donde TxPower ≈ -59 dBm a 1m, N ≈ 2 (factor de propagación)
   */
  private estimateDistanceFromRSSI(rssi: number): number {
    const txPower = -59; // dBm a 1 metro (valor típico)
    const n = 2.5; // Factor de propagación (2-4, promedio 2.5)

    const distance = Math.pow(10, (txPower - rssi) / (10 * n));
    return Math.round(distance * 10) / 10; // Redondear a 1 decimal
  }

  /**
   * Captura datos de movimiento del acelerómetro
   */
  private captureMotion(location: LocationData): MotionData {
    // Estimar velocidad desde GPS (más preciso) o calcular desde acelerómetro
    const velocityMs = location.speed || 0;
    const velocityKmh = velocityMs * 3.6;

    // Calcular heading desde acelerómetro si GPS no lo provee
    const heading = location.heading || this.calculateHeadingFromAccelerometer();

    return {
      acceleration: this.lastAcceleration,
      velocity_estimated: Math.round(velocityKmh * 10) / 10,
      heading: heading,
    };
  }

  /**
   * Calcula dirección aproximada desde el acelerómetro
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
   * Guarda el evento en almacenamiento local
   */
  private async saveEventLocally(event: CapturedEvent) {
    const key = `pending_event_${event.id}`;
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
   * Proporciona feedback al usuario (vibración + sonido)
   */
  private async provideFeedback() {
    Vibration.vibrate(100); // 100ms vibración

    // TODO: Añadir sonido de confirmación
    // import { Audio } from 'expo-av';
    // const { sound } = await Audio.Sound.createAsync(require('./assets/confirmation.mp3'));
    // await sound.playAsync();
  }

  /**
   * Obtiene todos los eventos pendientes
   */
  async getPendingEvents(): Promise<CapturedEvent[]> {
    console.log('🔍 Buscando eventos pendientes...');
    const keys = await AsyncStorage.getAllKeys();
    console.log('📋 Total keys en AsyncStorage:', keys.length);
    
    const pendingKeys = keys.filter((key) => key.startsWith('pending_event_'));
    console.log('📌 Keys de eventos pendientes:', pendingKeys.length);
    pendingKeys.forEach(key => console.log('  -', key));

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
    await AsyncStorage.removeItem(`pending_event_${eventId}`);
    console.log('🗑️ Evento eliminado:', eventId);
  }

  /**
   * Limpia el servicio al salir
   */
  cleanup() {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
    }
  }
}

export default new EventCaptureService();
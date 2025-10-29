// src/services/BluetoothButtonService.ts

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import EventCaptureService from './EventCaptureService';

// ✅ Import condicional de BleManager
let BleManager: any = null;
let BleManagerModule: any = null;
let bleManagerEmitter: any = null;

if (Platform.OS !== 'web') {
  try {
    BleManager = require('react-native-ble-manager').default;
    const { NativeEventEmitter, NativeModules } = require('react-native');
    BleManagerModule = NativeModules.BleManager;
    bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
  } catch (error) {
    console.warn('⚠️ BleManager no disponible');
  }
}

interface ConnectedDevice {
  id: string;
  name: string;
  connected: boolean;
}

class BluetoothButtonService {
  private isListening: boolean = false;
  private connectedDevices: ConnectedDevice[] = [];
  private buttonPressListener: any = null;
  private connectionListener: any = null;
  private disconnectionListener: any = null;
  private currentUserId: string | null = null;

  /**
   * Inicializa el servicio de botón Bluetooth
   */
  async initialize(userId: string) {
    if (Platform.OS === 'web') {
      console.log('ℹ️ BluetoothButtonService no disponible en Web');
      return;
    }

    if (!BleManager) {
      console.warn('⚠️ BleManager no disponible - BluetoothButtonService deshabilitado');
      return;
    }

    this.currentUserId = userId;
    console.log('🎮 Inicializando BluetoothButtonService...');

    try {
      // Inicializar BleManager si no está inicializado
      await BleManager.start({ showAlert: false });
      
      // Configurar notificaciones
      await this.setupNotifications();
      
      console.log('✅ BluetoothButtonService inicializado');
    } catch (error) {
      console.error('❌ Error inicializando BluetoothButtonService:', error);
    }
  }

  /**
   * Configurar sistema de notificaciones
   */
  private async setupNotifications() {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Solicitar permisos de notificaciones
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Permisos de notificaciones no concedidos');
    }
  }

  /**
   * Conectar a un dispositivo Bluetooth específico
   * @param deviceId - ID del dispositivo Bluetooth (MAC address)
   */
  async connectToDevice(deviceId: string): Promise<boolean> {
    if (!BleManager) return false;

    try {
      console.log('🔗 Conectando a dispositivo:', deviceId);
      await BleManager.connect(deviceId);
      
      // Añadir a lista de dispositivos conectados
      const peripheralInfo = await BleManager.retrieveServices(deviceId);
      this.connectedDevices.push({
        id: deviceId,
        name: peripheralInfo.name || 'Botón BT',
        connected: true,
      });

      console.log('✅ Dispositivo conectado:', deviceId);
      return true;
    } catch (error) {
      console.error('❌ Error conectando dispositivo:', error);
      return false;
    }
  }

  /**
   * Inicia la escucha de eventos del botón Bluetooth
   */
  startListening() {
    if (Platform.OS === 'web' || !BleManager || !bleManagerEmitter) {
      console.warn('⚠️ No se puede iniciar listener en esta plataforma');
      return;
    }

    if (this.isListening) {
      console.log('ℹ️ Ya está escuchando eventos de botón BT');
      return;
    }

    console.log('👂 Iniciando escucha de botón Bluetooth...');

    // Listener para cuando se presiona un botón en el dispositivo BT
    // Esto puede venir como notificación de característica
    this.buttonPressListener = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this.handleButtonPress.bind(this)
    );

    // También escuchar cambios de conexión
    this.connectionListener = bleManagerEmitter.addListener(
      'BleManagerConnectPeripheral',
      this.handleDeviceConnected.bind(this)
    );

    this.disconnectionListener = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      this.handleDeviceDisconnected.bind(this)
    );

    this.isListening = true;
    console.log('✅ Escuchando eventos de botón Bluetooth');
    
    // Mostrar notificación de que está activo
    this.showNotification(
      '🎮 Botón BT Activo',
      'DriveSkore está escuchando tu botón Bluetooth'
    );
  }

  /**
   * Detiene la escucha de eventos
   */
  stopListening() {
    if (!this.isListening) return;

    console.log('🛑 Deteniendo escucha de botón Bluetooth...');

    if (this.buttonPressListener) {
      this.buttonPressListener.remove();
      this.buttonPressListener = null;
    }

    if (this.connectionListener) {
      this.connectionListener.remove();
      this.connectionListener = null;
    }

    if (this.disconnectionListener) {
      this.disconnectionListener.remove();
      this.disconnectionListener = null;
    }

    this.isListening = false;
    console.log('✅ Escucha detenida');
  }

  /**
   * Maneja el evento de presión del botón
   */
  private async handleButtonPress(data: any) {
    console.log('🔴 BOTÓN PRESIONADO:', data);

    try {
      // Mostrar notificación inmediata
      await this.showNotification(
        '📸 Capturando Evento...',
        'Guardando información del incidente'
      );

      // Capturar evento automáticamente
      // Asumimos que es un evento de "coche" por defecto
      const event = await EventCaptureService.captureEvent('car');

      console.log('✅ Evento capturado desde botón BT:', event.id);

      // Notificación de éxito
      await this.showNotification(
        '✅ Evento Capturado',
        'Revísalo más tarde en Eventos Pendientes',
        event.id
      );

    } catch (error) {
      console.error('❌ Error capturando evento desde botón:', error);
      
      await this.showNotification(
        '❌ Error',
        'No se pudo capturar el evento. Inténtalo de nuevo.'
      );
    }
  }

  /**
   * Maneja conexión de dispositivo
   */
  private handleDeviceConnected(data: any) {
    console.log('🔗 Dispositivo conectado:', data);
    this.showNotification(
      '🔗 Dispositivo Conectado',
      'Botón Bluetooth listo para usar'
    );
  }

  /**
   * Maneja desconexión de dispositivo
   */
  private handleDeviceDisconnected(data: any) {
    console.log('🔌 Dispositivo desconectado:', data);
    
    // Remover de lista
    this.connectedDevices = this.connectedDevices.filter(
      device => device.id !== data.peripheral
    );

    this.showNotification(
      '🔌 Dispositivo Desconectado',
      'Botón Bluetooth desconectado'
    );
  }

  /**
   * Muestra una notificación local
   */
  private async showNotification(title: string, body: string, data?: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data ? { eventId: data } : undefined,
          sound: true,
        },
        trigger: null, // Inmediata
      });
    } catch (error) {
      console.error('❌ Error mostrando notificación:', error);
    }
  }

  /**
   * Escanea y muestra dispositivos Bluetooth disponibles
   * Útil para que el usuario encuentre su botón BT
   */
  async scanForDevices(): Promise<any[]> {
    if (!BleManager) return [];

    try {
      console.log('🔍 Escaneando dispositivos Bluetooth...');
      
      await BleManager.scan([], 5, true); // allowDuplicates = true
      
      // Esperar a que termine el escaneo
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const peripherals = await BleManager.getDiscoveredPeripherals();
      console.log(`📱 Encontrados ${peripherals.length} dispositivos`);
      
      return peripherals;
    } catch (error) {
      console.error('❌ Error escaneando dispositivos:', error);
      return [];
    }
  }

  /**
   * Obtiene lista de dispositivos conectados
   */
  getConnectedDevices(): ConnectedDevice[] {
    return this.connectedDevices;
  }

  /**
   * Verifica si está escuchando
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Limpia el servicio
   */
  cleanup() {
    console.log('🧹 Limpiando BluetoothButtonService...');
    this.stopListening();
    this.connectedDevices = [];
    this.currentUserId = null;
  }
}

export default new BluetoothButtonService();

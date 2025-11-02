// src/services/ABShutter3Service.ts
// ✅ Servicio para AB Shutter 3 usando react-native-keyevent

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import EventCaptureService from './EventCaptureService';

// Import condicional de react-native-keyevent
let KeyEvent: any = null;
if (Platform.OS !== 'web') {
  try {
    KeyEvent = require('react-native-keyevent').default;
  } catch (error) {
    console.warn('⚠️ react-native-keyevent no disponible');
  }
}

class ABShutter3Service {
  private isListening: boolean = false;
  private keyEventListener: any = null;
  private currentUserId: string | null = null;
  private lastCaptureTime: number = 0;
  private DEBOUNCE_MS = 2000;

  /**
   * Inicializa el servicio
   */
  async initialize(userId: string) {
    if (Platform.OS === 'web') {
      console.log('ℹ️ ABShutter3Service no disponible en Web');
      return;
    }

    if (!KeyEvent) {
      console.warn('⚠️ react-native-keyevent no está instalado');
      return;
    }

    this.currentUserId = userId;
    console.log('🎮 ABShutter3Service inicializado');

    // Configurar notificaciones
    await this.setupNotifications();
  }

  /**
   * Configurar notificaciones
   */
  private async setupNotifications() {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Permisos de notificaciones no concedidos');
    }
  }

  /**
   * Inicia la escucha del AB Shutter 3
   */
  startListening() {
    if (Platform.OS === 'web' || !KeyEvent) {
      console.warn('⚠️ No se puede iniciar AB Shutter 3');
      return;
    }

    if (this.isListening) {
      console.log('ℹ️ Ya está escuchando AB Shutter 3');
      return;
    }

    console.log('👂 Iniciando escucha de AB Shutter 3...');

    // Escuchar eventos de teclas
    // El AB Shutter 3 envía KEYCODE_VOLUME_UP (24) o KEYCODE_VOLUME_DOWN (25)
    KeyEvent.onKeyDownListener((keyEvent: any) => {
      console.log('🔑 Tecla presionada:', keyEvent.keyCode, keyEvent.action);
      
      // KEYCODE_VOLUME_UP = 24
      // KEYCODE_VOLUME_DOWN = 25
      // KEYCODE_CAMERA = 27 (algunos botones selfie)
      if (keyEvent.keyCode === 24 || keyEvent.keyCode === 25 || keyEvent.keyCode === 27) {
        this.handleButtonPress();
      }
    });

    this.isListening = true;
    
    this.showNotification(
      '🎮 AB Shutter 3 Activo',
      'Presiona el botón Bluetooth para capturar eventos'
    );

    console.log('✅ Escuchando AB Shutter 3');
  }

  /**
   * Detiene la escucha
   */
  stopListening() {
    if (!this.isListening || !KeyEvent) return;

    console.log('🛑 Deteniendo escucha de AB Shutter 3...');

    try {
      KeyEvent.removeKeyDownListener();
    } catch (error) {
      console.warn('⚠️ Error removiendo listener:', error);
    }

    this.isListening = false;
    console.log('✅ Escucha detenida');
  }

  /**
   * Maneja presión del botón
   */
  private async handleButtonPress(): Promise<void> {
    const now = Date.now();

    // Debounce
    if (now - this.lastCaptureTime < this.DEBOUNCE_MS) {
      console.log('⏱️ Debounce: ignorando presión repetida');
      return;
    }

    this.lastCaptureTime = now;
    console.log('🔴 AB SHUTTER 3 PRESIONADO');

    try {
      await this.showNotification(
        '📸 Capturando Evento...',
        'Guardando información del incidente'
      );

      const event = await EventCaptureService.captureEvent('car');
      console.log('✅ Evento capturado desde AB Shutter 3:', event.id);

      await this.showNotification(
        '✅ Evento Capturado',
        'Revísalo más tarde en Eventos Pendientes',
        event.id
      );
    } catch (error) {
      console.error('❌ Error capturando evento:', error);
      await this.showNotification('❌ Error', 'No se pudo capturar el evento');
    }
  }

  /**
   * Muestra notificación
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
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Error mostrando notificación:', error);
    }
  }

  /**
   * Verifica si está activo
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Limpia el servicio
   */
  cleanup() {
    console.log('🧹 Limpiando ABShutter3Service...');
    this.stopListening();
    this.currentUserId = null;
  }
}

export default new ABShutter3Service();
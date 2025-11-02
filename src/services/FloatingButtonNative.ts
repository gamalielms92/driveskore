// src/services/FloatingButtonNative.ts

import { NativeModules, NativeEventEmitter, DeviceEventEmitter, Platform } from 'react-native';

const { FloatingButton } = NativeModules;

export interface FloatingButtonManager {
  checkPermission(): Promise<boolean>;
  requestPermission(): void;
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  isRunning(): Promise<boolean>;
  onCaptureEvent(callback: () => void): () => void;
}

class FloatingButtonNativeManager implements FloatingButtonManager {
  
  /**
   * Verificar si tenemos permiso para dibujar sobre otras apps
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('FloatingButton solo está disponible en Android');
      return false;
    }
    
    try {
      const hasPermission = await FloatingButton.checkPermission();
      return hasPermission;
    } catch (error) {
      console.error('Error checking FloatingButton permission:', error);
      return false;
    }
  }

  /**
   * Solicitar permiso para dibujar sobre otras apps
   * Abre la configuración del sistema para que el usuario conceda el permiso
   */
  requestPermission(): void {
    if (Platform.OS !== 'android') {
      console.warn('FloatingButton solo está disponible en Android');
      return;
    }
    
    try {
      FloatingButton.requestPermission();
    } catch (error) {
      console.error('Error requesting FloatingButton permission:', error);
    }
  }

  /**
   * Iniciar el servicio del botón flotante
   * @returns Promise que resuelve true si se inició correctamente
   */
  async start(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('FloatingButton solo está disponible en Android');
      return false;
    }
    
    try {
      // Verificar permiso primero
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        console.warn('No hay permiso para mostrar el botón flotante');
        return false;
      }
      
      const started = await FloatingButton.startFloatingButton();
      console.log('✅ Servicio de botón flotante iniciado');
      return started;
    } catch (error) {
      console.error('Error starting FloatingButton service:', error);
      return false;
    }
  }

  /**
   * Detener el servicio del botón flotante
   * @returns Promise que resuelve true si se detuvo correctamente
   */
  async stop(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('FloatingButton solo está disponible en Android');
      return false;
    }
    
    try {
      const stopped = await FloatingButton.stopFloatingButton();
      console.log('🛑 Servicio de botón flotante detenido');
      return stopped;
    } catch (error) {
      console.error('Error stopping FloatingButton service:', error);
      return false;
    }
  }

  /**
   * Verificar si el servicio está actualmente en ejecución
   * @returns Promise que resuelve true si el servicio está activo
   */
  async isRunning(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      const running = await FloatingButton.isServiceRunning();
      return running;
    } catch (error) {
      console.error('Error checking if service is running:', error);
      return false;
    }
  }

  /**
   * Escuchar eventos de captura desde el botón flotante nativo
   * @param callback Función que se ejecuta cuando el usuario toca el botón
   * @returns Función para desuscribirse del evento
   */
  onCaptureEvent(callback: () => void): () => void {
    if (Platform.OS !== 'android') {
      return () => {};
    }
    
    const subscription = DeviceEventEmitter.addListener(
      'onFloatingButtonCapture',
      callback
    );
    
    return () => subscription.remove();
  }
}

export default new FloatingButtonNativeManager();

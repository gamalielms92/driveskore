// src/services/FloatingButtonNative.ts
// Versión segura que no crashea si el módulo nativo no está compilado

import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

const { FloatingButton } = NativeModules;

export interface FloatingButtonManager {
  checkPermission(): Promise<boolean>;
  requestPermission(): void;
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  isRunning(): Promise<boolean>;
  onCaptureEvent(callback: () => void): () => void;
  isAvailable(): boolean;
}

class FloatingButtonNativeManager implements FloatingButtonManager {
  
  /**
   * Verifica si el módulo nativo está disponible
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && FloatingButton !== null && FloatingButton !== undefined;
  }

  /**
   * Verificar si tenemos permiso para dibujar sobre otras apps
   */
  async checkPermission(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('⚠️ FloatingButton módulo nativo no disponible');
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
   */
  requestPermission(): void {
    if (!this.isAvailable()) {
      console.warn('⚠️ FloatingButton módulo nativo no disponible');
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
   */
  async start(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('⚠️ FloatingButton módulo nativo no disponible');
      return false;
    }
    
    try {
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
   */
  async stop(): Promise<boolean> {
    if (!this.isAvailable()) {
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
   */
  async isRunning(): Promise<boolean> {
    if (!this.isAvailable()) {
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
   */
  onCaptureEvent(callback: () => void): () => void {
    if (!this.isAvailable()) {
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
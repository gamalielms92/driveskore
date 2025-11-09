// src/services/ABShutter3Service.ts
// VERSIÓN OPTIMIZADA PARA ANDROID - Funcionamiento completo en background

import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Analytics } from './Analytics';
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
  private persistentNotificationId: string | null = null;
  private appStateSubscription: any = null;
  private retryCount: number = 0;
  private MAX_RETRIES: number = 3;

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
    console.log('🎮 ABShutter3Service inicializado para usuario:', userId);

    // Configurar notificaciones
    await this.setupNotifications();
    
    // Reinicializar EventCaptureService por si acaso
    await EventCaptureService.initialize(userId);
  }

  /**
   * Configurar notificaciones con prioridad máxima para Android
   */
  private async setupNotifications() {
    // Handler para mantener la app activa
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,  // Añadido
        shouldShowList: true,    // Añadido
        // priority no va aquí, es para el contenido de la notificación
      }),
    });

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Permisos de notificaciones no concedidos');
    }

    // Crear canal de notificación para Android con importancia MÁXIMA
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('abshutter3-foreground', {
        name: '🎮 Control AB Shutter 3',
        description: 'Mantiene el botón Bluetooth activo en segundo plano',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        bypassDnd: false,
        showBadge: true,
      });
      
      console.log('✅ Canal de notificación configurado con prioridad MÁXIMA');
    }
  }

  /**
   * Inicia la escucha del AB Shutter 3
   */
  async startListening() {
    if (Platform.OS === 'web' || !KeyEvent) {
      console.warn('⚠️ No se puede iniciar AB Shutter 3');
      return;
    }

    if (this.isListening) {
      console.log('ℹ️ Ya está escuchando AB Shutter 3');
      return;
    }

    console.log('🚀 Iniciando escucha de AB Shutter 3...');

    try {
      // Registrar listener de teclas
      this.registerKeyListener();

      // Para ANDROID: Configurar para background
      if (Platform.OS === 'android') {
        // Mostrar notificación persistente INMEDIATAMENTE
        await this.showPersistentNotification();
        
        // Escuchar cambios de estado de la app
        this.appStateSubscription = AppState.addEventListener(
          'change', 
          this.handleAppStateChange
        );
        
        console.log('✅ Configuración Android completada');
      } else if (Platform.OS === 'ios') {
        // iOS: Notificar limitación
        console.log('⚠️ iOS: El botón solo funciona con la app abierta o recién minimizada');
      }

      this.isListening = true;
      
      // Analytics
      await Analytics.trackABShutter3Started();
      
      console.log('✅ AB Shutter 3 ACTIVO - Funcionará en background (Android)');
      
    } catch (error) {
      console.error('❌ Error iniciando AB Shutter 3:', error);
      this.isListening = false;
    }
  }

  /**
   * Registra el listener de teclas con reintentos
   */
  private registerKeyListener() {
    console.log('📡 Registrando listener de teclas...');
    
    KeyEvent.onKeyDownListener((keyEvent: any) => {
      console.log(`🔑 Tecla detectada: ${keyEvent.keyCode} (action: ${keyEvent.action})`);
      
      // AB Shutter 3 envía estos códigos:
      // KEYCODE_VOLUME_UP = 24
      // KEYCODE_VOLUME_DOWN = 25  
      // KEYCODE_CAMERA = 27
      // KEYCODE_ENTER = 66 (algunos modelos)
      
      const validKeyCodes = [24, 25, 27, 66];
      if (validKeyCodes.includes(keyEvent.keyCode)) {
        console.log('✅ Código válido de AB Shutter 3 detectado');
        this.handleButtonPress();
      }
    });
    
    console.log('✅ Listener de teclas registrado');
  }

  /**
   * Maneja cambios de estado de la app (para Android)
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log(`📱 Estado de app cambió a: ${nextAppState}`);
    
    if (Platform.OS !== 'android') return;
    
    switch(nextAppState) {
      case 'background':
        console.log('📱 App en BACKGROUND - AB Shutter 3 sigue activo');
        this.reinforceBackgroundService();
        break;
        
      case 'inactive':
        console.log('📱 App INACTIVA - Manteniendo servicio...');
        break;
        
      case 'active':
        console.log('📱 App ACTIVA - Verificando servicio...');
        if (this.isListening && !KeyEvent.isListening) {
          console.log('🔄 Re-activando listener...');
          this.registerKeyListener();
        }
        break;
    }
  }

  /**
   * Refuerza el servicio en background (Android)
   */
  private async reinforceBackgroundService() {
    if (Platform.OS !== 'android') return;
    
    console.log('💪 Reforzando servicio en background...');
    
    // Actualizar notificación para mantenerla activa
    if (this.persistentNotificationId) {
      await this.updatePersistentNotification();
    }
    
    // Verificar que el listener sigue activo
    if (!KeyEvent.isListening) {
      console.log('⚠️ Listener perdido, re-registrando...');
      this.registerKeyListener();
    }
  }

  /**
   * Muestra notificación persistente para Android (Foreground Service)
   */
  private async showPersistentNotification() {
    if (Platform.OS !== 'android') return;
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎮 AB Shutter 3 Activo',
          body: 'Presiona tu botón para capturar eventos',
          subtitle: 'DriveSkore está escuchando',
          sound: false, // Sin sonido para no molestar
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true, // No se puede deslizar
          // ongoing: true, // Esta propiedad no existe en el tipo, usar sticky
          color: '#007AFF',
          categoryIdentifier: 'service',
        },
        trigger: null,
      });

      this.persistentNotificationId = notificationId;
      console.log('✅ Notificación persistente mostrada (Foreground Service activo)');
      
    } catch (error) {
      console.error('❌ Error con notificación persistente:', error);
    }
  }

  /**
   * Actualiza la notificación persistente (para mantenerla viva)
   */
  private async updatePersistentNotification() {
    if (!this.persistentNotificationId) return;
    
    try {
      // Cancelar la anterior
      await Notifications.dismissNotificationAsync(this.persistentNotificationId);
      
      // Crear nueva con timestamp actualizado
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎮 AB Shutter 3 Activo',
          body: `Capturando eventos • ${new Date().toLocaleTimeString()}`,
          subtitle: 'DriveSkore en background',
          sound: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
          color: '#007AFF',
        },
        trigger: null,
      });
      
      this.persistentNotificationId = notificationId;
      console.log('🔄 Notificación actualizada');
      
    } catch (error) {
      console.error('❌ Error actualizando notificación:', error);
    }
  }

  /**
   * Detiene la escucha
   */
  async stopListening() {
    if (!this.isListening || !KeyEvent) return;

    console.log('🛑 Deteniendo AB Shutter 3...');

    try {
      // Remover listener de teclas
      KeyEvent.removeKeyDownListener();
      
      // Cancelar notificación persistente
      if (this.persistentNotificationId) {
        await Notifications.dismissNotificationAsync(this.persistentNotificationId);
        this.persistentNotificationId = null;
      }
      
      // Remover listener de AppState
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      this.isListening = false;
      
      // Analytics
      await Analytics.trackABShutter3Stopped();
      
      console.log('✅ AB Shutter 3 detenido completamente');
      
    } catch (error) {
      console.warn('⚠️ Error deteniendo AB Shutter 3:', error);
    }
  }

  /**
   * Maneja la presión del botón con reintentos
   */
  private async handleButtonPress(): Promise<void> {
    const now = Date.now();

    // Debounce para evitar múltiples capturas
    if (now - this.lastCaptureTime < this.DEBOUNCE_MS) {
      console.log('⏱️ Debounce: ignorando presión repetida');
      return;
    }

    this.lastCaptureTime = now;
    console.log('🔴 ¡AB SHUTTER 3 PRESIONADO!');
    console.log(`📱 Estado de app: ${AppState.currentState}`);

    try {
      // Notificación de inicio
      await this.showTemporaryNotification(
        '📸 Capturando Evento...',
        'Procesando información del incidente'
      );

      // Asegurar que EventCaptureService está inicializado
      if (!this.currentUserId) {
        throw new Error('Usuario no inicializado');
      }
      
      // Reintentos si falla
      let event = null;
      let attempts = 0;
      
      while (!event && attempts < this.MAX_RETRIES) {
        try {
          attempts++;
          console.log(`🔄 Intento ${attempts}/${this.MAX_RETRIES}`);
          
          // Reinicializar si es necesario
          if (attempts > 1) {
            await EventCaptureService.initialize(this.currentUserId);
          }
          
          event = await EventCaptureService.captureEvent('car');
          
        } catch (error) {
          console.error(`❌ Intento ${attempts} falló:`, error);
          if (attempts >= this.MAX_RETRIES) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 seg
        }
      }

      if (event) {
        console.log('✅ Evento capturado exitosamente:', event.id);
        
        // Analytics
        await Analytics.trackABShutter3Capture();
        
        // Notificación de éxito
        await this.showTemporaryNotification(
          '✅ Evento Capturado',
          `ID: ${event.id.slice(0, 8)}... • Guardado correctamente`,
          event.id
        );
      }
      
    } catch (error: any) {
      console.error('❌ Error capturando evento:', error);
      
      await this.showTemporaryNotification(
        '❌ Error al Capturar',
        error?.message || 'Intenta de nuevo'
      );
    }
  }

  /**
   * Muestra notificación temporal (no persistente)
   */
  private async showTemporaryNotification(title: string, body: string, eventId?: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: eventId ? { eventId } : undefined,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
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
  async cleanup() {
    console.log('🧹 Limpiando ABShutter3Service...');
    await this.stopListening();
    this.currentUserId = null;
    this.retryCount = 0;
  }
}

export default new ABShutter3Service();
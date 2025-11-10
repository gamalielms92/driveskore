// src/services/NotificationManager.ts - VERSIÓN CORREGIDA
// Gestor unificado de notificaciones para evitar saturación
// Con tipos correctos para Expo Notifications

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

interface ActiveServices {
  driverMode: boolean;
  floatingButton: boolean;
  abShutter3: boolean;
}

class NotificationManager {
  private static instance: NotificationManager;
  private persistentNotificationId: string | null = null;
  private activeServices: ActiveServices = {
    driverMode: false,
    floatingButton: false,
    abShutter3: false,
  };
  private NOTIFICATION_CHANNEL = 'driveskore-services';

  constructor() {
    if (NotificationManager.instance) {
      return NotificationManager.instance;
    }
    NotificationManager.instance = this;
    this.initialize();
  }

  /**
   * Inicializa el gestor de notificaciones
   */
  private async initialize() {
    // Configurar handler silencioso para notificación persistente
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false, // No mostrar alerta
        shouldPlaySound: false, // Sin sonido
        shouldSetBadge: false,  // Sin badge
        shouldShowBanner: false, // Sin banner
        shouldShowList: true,    // Mostrar en lista de notificaciones
      }),
    });

    // Crear canal unificado para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(this.NOTIFICATION_CHANNEL, {
        name: 'DriveSkore Servicios',
        description: 'Estado de los servicios activos de DriveSkore',
        importance: Notifications.AndroidImportance.LOW, // Baja prioridad para no molestar
        sound: undefined, // CORRECCIÓN: usar undefined para sin sonido (no false)
        vibrationPattern: [0], // Array [0] para sin vibración
        lightColor: '#007AFF',
      });
      
      console.log('✅ Canal de notificaciones unificado creado');
    }
  }

  /**
   * Actualiza el estado de un servicio
   */
  async updateServiceStatus(service: keyof ActiveServices, isActive: boolean) {
    this.activeServices[service] = isActive;
    
    // Si hay algún servicio activo, mostrar/actualizar notificación
    if (this.hasActiveServices()) {
      await this.showOrUpdateNotification();
    } else {
      // Si no hay servicios activos, eliminar notificación
      await this.dismissNotification();
    }
  }

  /**
   * Verifica si hay algún servicio activo
   */
  private hasActiveServices(): boolean {
    return Object.values(this.activeServices).some(active => active === true);
  }

  /**
   * Muestra o actualiza la notificación persistente unificada
   */
  private async showOrUpdateNotification() {
    if (Platform.OS !== 'android') return;

    try {
      // Cancelar notificación anterior si existe
      if (this.persistentNotificationId) {
        await Notifications.dismissNotificationAsync(this.persistentNotificationId);
      }

      // Construir el contenido basado en servicios activos
      const { title, body, subtitle } = this.buildNotificationContent();

      // Crear nueva notificación actualizada
      this.persistentNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          subtitle,
          sound: false, // AQUÍ SÍ puede ser boolean
          priority: Notifications.AndroidNotificationPriority.LOW, // Prioridad baja
          sticky: true, // Persistente
          color: '#007AFF',
          categoryIdentifier: 'service',
          data: {
            type: 'unified-services',
            services: this.activeServices,
          },
        },
        trigger: null, // Mostrar inmediatamente
      });

      console.log('📱 Notificación unificada actualizada:', {
        driverMode: this.activeServices.driverMode,
        floatingButton: this.activeServices.floatingButton,
        abShutter3: this.activeServices.abShutter3,
      });
      
    } catch (error) {
      console.error('❌ Error actualizando notificación unificada:', error);
    }
  }

  /**
   * Construye el contenido de la notificación basado en servicios activos
   */
  private buildNotificationContent(): {
    title: string;
    body: string;
    subtitle: string;
  } {
    const activeList: string[] = [];
    
    if (this.activeServices.driverMode) {
      activeList.push('🚗 Modo Conductor');
    }
    if (this.activeServices.floatingButton) {
      activeList.push('🎯 Botón Flotante');
    }
    if (this.activeServices.abShutter3) {
      activeList.push('🎮 AB Shutter 3');
    }

    // Título simple y claro
    const title = 'DriveSkore Activo';
    
    // Cuerpo con los servicios activos
    const body = activeList.length > 0 
      ? activeList.join(' • ')
      : 'Servicios en espera';
    
    // Subtítulo informativo
    const subtitle = `${activeList.length} servicio${activeList.length !== 1 ? 's' : ''} activo${activeList.length !== 1 ? 's' : ''}`;

    return { title, body, subtitle };
  }

  /**
   * Elimina la notificación persistente
   */
  private async dismissNotification() {
    if (!this.persistentNotificationId) return;

    try {
      await Notifications.dismissNotificationAsync(this.persistentNotificationId);
      this.persistentNotificationId = null;
      console.log('📱 Notificación unificada eliminada');
    } catch (error) {
      console.error('❌ Error eliminando notificación:', error);
    }
  }

  /**
   * Limpia todas las notificaciones y resetea el estado
   */
  async clearAll() {
    this.activeServices = {
      driverMode: false,
      floatingButton: false,
      abShutter3: false,
    };
    
    await this.dismissNotification();
    await Notifications.dismissAllNotificationsAsync();
    
    console.log('🧹 Todas las notificaciones limpiadas');
  }

  /**
   * Obtiene el estado actual de los servicios
   */
  getActiveServices(): ActiveServices {
    return { ...this.activeServices };
  }

  /**
   * Muestra una notificación temporal (no persistente) para feedback
   */
  async showTemporaryNotification(
    title: string,
    body: string,
    duration: number = 3000
  ) {
    if (Platform.OS === 'web') return;

    try {
      const tempId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default', // Para temporales sí queremos sonido
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });

      // Auto-eliminar después del tiempo especificado
      setTimeout(async () => {
        await Notifications.dismissNotificationAsync(tempId);
      }, duration);
      
    } catch (error) {
      console.error('❌ Error mostrando notificación temporal:', error);
    }
  }

  /**
   * Muestra notificación de evento capturado (feedback al usuario)
   */
  async notifyEventCaptured() {
    await this.showTemporaryNotification(
      '📸 Evento Capturado',
      'Evalúa al conductor en la pestaña Pendientes',
      4000
    );
  }

  /**
   * Muestra notificación de error
   */
  async notifyError(message: string) {
    await this.showTemporaryNotification(
      '⚠️ Error',
      message,
      5000
    );
  }
}

export default new NotificationManager();
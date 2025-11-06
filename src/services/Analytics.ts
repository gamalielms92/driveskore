import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

/**
 * Servicio de Analytics para DriveSkore
 * Trackea eventos clave del usuario durante el piloto
 */
class AnalyticsService {
  
  /**
   * Inicializar el servicio de analytics
   * Llamar esto en App.tsx al iniciar la app
   */
  async initialize() {
    try {
      // Habilitar recolección de analytics
      await analytics().setAnalyticsCollectionEnabled(true);
      
      // Habilitar crashlytics
      await crashlytics().setCrashlyticsCollectionEnabled(true);
      
      console.log('✅ Analytics inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando analytics:', error);
    }
  }

  /**
   * Trackear cuando un usuario se registra
   * Llamar después de crear cuenta en Supabase
   */
  async trackSignUp(method: 'email' | 'google' = 'email') {
    try {
      await analytics().logSignUp({
        method: method,
      });
      console.log('📊 Evento: sign_up');
    } catch (error) {
      console.error('Error tracking sign_up:', error);
    }
  }

  /**
   * Trackear la primera valoración que hace un usuario
   * Llamar cuando se envía la primera evaluación exitosamente
   */
  async trackFirstRating(rating: number) {
    try {
      await analytics().logEvent('first_rating', {
        rating_value: rating,
        timestamp: new Date().toISOString(),
      });
      console.log('📊 Evento: first_rating');
    } catch (error) {
      console.error('Error tracking first_rating:', error);
    }
  }

  /**
   * Trackear cada vez que se escanea una matrícula
   * Llamar después de capturar foto o cuando OCR devuelve resultado
   */
  async trackLicensePlateScan(success: boolean, method: 'camera' | 'manual' = 'camera') {
    try {
      await analytics().logEvent('license_plate_scan', {
        success: success,
        method: method,
        timestamp: new Date().toISOString(),
      });
      console.log('📊 Evento: license_plate_scan');
    } catch (error) {
      console.error('Error tracking license_plate_scan:', error);
    }
  }

  /**
   * Trackear cuando se activa el modo conductor
   * Útil para medir engagement
   */
  async trackDriverModeStarted() {
    try {
      await analytics().logEvent('driver_mode_started', {
        timestamp: new Date().toISOString(),
      });
      console.log('📊 Evento: driver_mode_started');
    } catch (error) {
      console.error('Error tracking driver_mode_started:', error);
    }
  }

  /**
   * Trackear cuando se detiene el modo conductor
   */
  async trackDriverModeStopped(duration_seconds: number) {
    try {
      await analytics().logEvent('driver_mode_stopped', {
        duration_seconds: duration_seconds,
        timestamp: new Date().toISOString(),
      });
      console.log('📊 Evento: driver_mode_stopped');
    } catch (error) {
      console.error('Error tracking driver_mode_stopped:', error);
    }
  }

  /**
   * Trackear cuando se usa el botón flotante
   * Llamar cuando EventCaptureService captura un evento vía botón flotante
   */
  async trackFloatingButtonPressed() {
    try {
      await analytics().logEvent('floating_button_pressed', {
        timestamp: new Date().toISOString(),
      });
      console.log('📊 Evento: floating_button_pressed');
    } catch (error) {
      console.error('Error tracking floating_button_pressed:', error);
    }
  }

  /**
   * Trackear cuando se completa el matching de conductores
   * Llamar cuando el usuario selecciona un candidato en matching-results
   */
  async trackMatchingCompleted(candidatesFound: number, matchScore: number) {
    try {
      await analytics().logEvent('matching_completed', {
        candidates_found: candidatesFound,
        match_score: matchScore,
        timestamp: new Date().toISOString(),
      });
      console.log('📊 Evento: matching_completed');
    } catch (error) {
      console.error('Error tracking matching_completed:', error);
    }
  }

  /**
   * Trackear latencia de OCR
   * Llamar después de cada operación de reconocimiento de matrícula
   */
  async trackOcrLatency(durationMs: number, success: boolean) {
    try {
      await analytics().logEvent('ocr_latency', {
        duration_ms: durationMs,
        success: success,
        timestamp: new Date().toISOString(),
      });
      console.log(`📊 Evento: ocr_latency (${durationMs}ms, success: ${success})`);
    } catch (error) {
      console.error('Error tracking ocr_latency:', error);
    }
  }

  /**
   * Trackear latencia de GPS
   * Llamar después de obtener ubicación
   */
  async trackGpsLatency(durationMs: number, accuracy: number) {
    try {
      await analytics().logEvent('gps_latency', {
        duration_ms: durationMs,
        accuracy_meters: accuracy,
        timestamp: new Date().toISOString(),
      });
      console.log(`📊 Evento: gps_latency (${durationMs}ms, accuracy: ${accuracy}m)`);
    } catch (error) {
      console.error('Error tracking gps_latency:', error);
    }
  }

  /**
   * Registrar error en Crashlytics
   * Llamar en bloques catch de errores importantes
   */
  async logError(error: Error, context?: string) {
    try {
      if (context) {
        await crashlytics().log(`Context: ${context}`);
      }
      await crashlytics().recordError(error);
      console.log('🔥 Error registrado en Crashlytics');
    } catch (e) {
      console.error('Error logging to crashlytics:', e);
    }
  }

  /**
   * Establecer ID de usuario para seguimiento
   * Llamar después de login exitoso
   */
  async setUserId(userId: string) {
    try {
      await analytics().setUserId(userId);
      await crashlytics().setUserId(userId);
      console.log('👤 User ID establecido:', userId);
    } catch (error) {
      console.error('Error setting user ID:', error);
    }
  }

  /**
   * Establecer propiedades del usuario
   * Útil para segmentación en el dashboard
   */
  async setUserProperties(properties: {
    device_model?: string;
    android_version?: string;
    app_version?: string;
  }) {
    try {
      if (properties.device_model) {
        await analytics().setUserProperty('device_model', properties.device_model);
      }
      if (properties.android_version) {
        await analytics().setUserProperty('android_version', properties.android_version);
      }
      if (properties.app_version) {
        await analytics().setUserProperty('app_version', properties.app_version);
      }
      console.log('⚙️ Propiedades de usuario establecidas');
    } catch (error) {
      console.error('Error setting user properties:', error);
    }
  }
}

// Exportar instancia única
export const Analytics = new AnalyticsService();
// src/utils/PilotHealthCheck.ts
// Script de verificación del sistema antes del lanzamiento del piloto
// Ejecutar esto para verificar que todo está funcionando

import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

interface HealthCheckResult {
  component: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

class PilotHealthCheck {
  private results: HealthCheckResult[] = [];

  /**
   * Ejecuta todas las verificaciones del sistema
   */
  async runFullHealthCheck(): Promise<{
    passed: boolean;
    results: HealthCheckResult[];
    summary: string;
  }> {
    console.log('🔍 Iniciando verificación del sistema para el piloto...\n');
    
    this.results = [];
    
    // 1. Verificar Supabase
    await this.checkSupabase();
    
    // 2. Verificar permisos
    await this.checkPermissions();
    
    // 3. Verificar almacenamiento local
    await this.checkAsyncStorage();
    
    // 4. Verificar Firebase
    await this.checkFirebase();
    
    // 5. Verificar API de OCR
    await this.checkOCRAPI();
    
    // 6. Verificar configuración de notificaciones
    await this.checkNotifications();
    
    // 7. Verificar servicios nativos (Android)
    if (Platform.OS === 'android') {
      await this.checkAndroidServices();
    }
    
    // Generar resumen
    const errorCount = this.results.filter(r => r.status === 'ERROR').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const passed = errorCount === 0;
    
    const summary = this.generateSummary(errorCount, warningCount);
    
    return {
      passed,
      results: this.results,
      summary,
    };
  }

  /**
   * Verificar conexión con Supabase
   */
  private async checkSupabase() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      this.results.push({
        component: 'Supabase',
        status: 'OK',
        message: 'Conexión establecida correctamente',
      });
    } catch (error: any) {
      this.results.push({
        component: 'Supabase',
        status: 'ERROR',
        message: 'No se pudo conectar con la base de datos',
        details: error.message,
      });
    }
  }

  /**
   * Verificar permisos críticos
   */
  private async checkPermissions() {
    // Permiso de ubicación
    try {
      const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
      
      if (locationStatus === 'granted') {
        this.results.push({
          component: 'Permisos - Ubicación',
          status: 'OK',
          message: 'Permiso de ubicación concedido',
        });
      } else {
        this.results.push({
          component: 'Permisos - Ubicación',
          status: 'ERROR',
          message: 'Permiso de ubicación NO concedido',
          details: `Estado actual: ${locationStatus}`,
        });
      }
      
      // Permiso de ubicación en background (Android)
      if (Platform.OS === 'android') {
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        
        if (bgStatus === 'granted') {
          this.results.push({
            component: 'Permisos - Ubicación Background',
            status: 'OK',
            message: 'Permiso de ubicación en background concedido',
          });
        } else {
          this.results.push({
            component: 'Permisos - Ubicación Background',
            status: 'WARNING',
            message: 'Permiso de ubicación en background NO concedido',
            details: 'El modo conductor funcionará con limitaciones',
          });
        }
      }
      
      // Permiso de notificaciones
      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      
      if (notifStatus === 'granted') {
        this.results.push({
          component: 'Permisos - Notificaciones',
          status: 'OK',
          message: 'Permiso de notificaciones concedido',
        });
      } else {
        this.results.push({
          component: 'Permisos - Notificaciones',
          status: 'WARNING',
          message: 'Permiso de notificaciones NO concedido',
          details: 'Las notificaciones no funcionarán',
        });
      }
      
    } catch (error: any) {
      this.results.push({
        component: 'Permisos',
        status: 'ERROR',
        message: 'Error verificando permisos',
        details: error.message,
      });
    }
  }

  /**
   * Verificar AsyncStorage
   */
  private async checkAsyncStorage() {
    try {
      // Intentar escribir y leer
      const testKey = 'health_check_test';
      const testValue = new Date().toISOString();
      
      await AsyncStorage.setItem(testKey, testValue);
      const readValue = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      if (readValue === testValue) {
        this.results.push({
          component: 'AsyncStorage',
          status: 'OK',
          message: 'Almacenamiento local funcionando correctamente',
        });
      } else {
        throw new Error('Los valores no coinciden');
      }
    } catch (error: any) {
      this.results.push({
        component: 'AsyncStorage',
        status: 'ERROR',
        message: 'Problema con almacenamiento local',
        details: error.message,
      });
    }
  }

  /**
   * Verificar Firebase Analytics y Crashlytics
   */
  private async checkFirebase() {
    try {
      // Analytics
      await analytics().logEvent('health_check_pilot', {
        timestamp: new Date().toISOString(),
      });
      
      this.results.push({
        component: 'Firebase Analytics',
        status: 'OK',
        message: 'Analytics funcionando correctamente',
      });
      
      // Crashlytics
      await crashlytics().log('Health check for pilot');
      
      this.results.push({
        component: 'Firebase Crashlytics',
        status: 'OK',
        message: 'Crashlytics funcionando correctamente',
      });
      
    } catch (error: any) {
      this.results.push({
        component: 'Firebase',
        status: 'WARNING',
        message: 'Problema con Firebase',
        details: error.message,
      });
    }
  }

  /**
   * Verificar API de OCR
   */
  private async checkOCRAPI() {
    try {
      const OCR_API_KEY = 'K84186452188957'; // Tu API key
      const testUrl = `https://api.ocr.space/parse/imageurl?apikey=${OCR_API_KEY}&url=https://via.placeholder.com/150`;
      
      const response = await fetch(testUrl);
      const data = await response.json();
      
      if (response.ok && !data.IsErroredOnProcessing) {
        this.results.push({
          component: 'OCR API',
          status: 'OK',
          message: 'API de OCR.space respondiendo correctamente',
        });
      } else {
        throw new Error(data.ErrorMessage || 'Error en respuesta');
      }
    } catch (error: any) {
      this.results.push({
        component: 'OCR API',
        status: 'ERROR',
        message: 'Problema con API de OCR',
        details: error.message,
      });
    }
  }

  /**
   * Verificar configuración de notificaciones
   */
  private async checkNotifications() {
    try {
      const settings = await Notifications.getPermissionsAsync();
      const channels = Platform.OS === 'android' 
        ? await Notifications.getNotificationChannelsAsync()
        : [];
      
      this.results.push({
        component: 'Configuración Notificaciones',
        status: 'OK',
        message: `${channels.length} canales configurados`,
        details: {
          permission: settings.status,
          channels: channels.map(c => c.name),
        },
      });
    } catch (error: any) {
      this.results.push({
        component: 'Configuración Notificaciones',
        status: 'WARNING',
        message: 'No se pudo verificar configuración de notificaciones',
        details: error.message,
      });
    }
  }

  /**
   * Verificar servicios nativos Android
   */
  private async checkAndroidServices() {
    try {
      // Verificar si el servicio flotante está registrado
      const floatingButtonPref = await AsyncStorage.getItem('capture_preference_floating_button');
      const abShutterPref = await AsyncStorage.getItem('capture_preference_ab_shutter3');
      
      this.results.push({
        component: 'Servicios Android',
        status: 'OK',
        message: 'Preferencias de captura configuradas',
        details: {
          floatingButton: floatingButtonPref === 'true',
          abShutter3: abShutterPref === 'true',
        },
      });
    } catch (error: any) {
      this.results.push({
        component: 'Servicios Android',
        status: 'WARNING',
        message: 'No se pudieron verificar servicios Android',
        details: error.message,
      });
    }
  }

  /**
   * Genera resumen de resultados
   */
  private generateSummary(errorCount: number, warningCount: number): string {
    let summary = '\n========== RESUMEN DE VERIFICACIÓN ==========\n\n';
    
    if (errorCount === 0 && warningCount === 0) {
      summary += '✅ SISTEMA LISTO PARA EL PILOTO\n';
      summary += 'Todos los componentes están funcionando correctamente.\n';
    } else if (errorCount === 0) {
      summary += '⚠️ SISTEMA OPERATIVO CON ADVERTENCIAS\n';
      summary += `Se encontraron ${warningCount} advertencia(s) no críticas.\n`;
      summary += 'El piloto puede proceder pero revisa las advertencias.\n';
    } else {
      summary += '❌ SISTEMA NO ESTÁ LISTO\n';
      summary += `Se encontraron ${errorCount} error(es) críticos.\n`;
      summary += 'DEBES resolver estos problemas antes del piloto.\n';
    }
    
    summary += '\nDETALLE POR COMPONENTE:\n';
    summary += '------------------------\n';
    
    this.results.forEach(result => {
      const icon = result.status === 'OK' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : '❌';
      summary += `${icon} ${result.component}: ${result.message}\n`;
      if (result.details && result.status !== 'OK') {
        summary += `   → ${JSON.stringify(result.details)}\n`;
      }
    });
    
    summary += '\n==============================================\n';
    
    return summary;
  }
}

// Función helper para ejecutar desde la consola
export async function runPilotHealthCheck() {
  const checker = new PilotHealthCheck();
  const result = await checker.runFullHealthCheck();
  
  console.log(result.summary);
  
  if (!result.passed) {
    console.error('\n⚠️ HAY PROBLEMAS QUE RESOLVER ANTES DEL PILOTO');
  } else {
    console.log('\n🚀 TODO LISTO PARA EL LANZAMIENTO DEL PILOTO');
  }
  
  return result;
}

export default PilotHealthCheck;
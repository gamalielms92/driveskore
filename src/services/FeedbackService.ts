// src/services/FeedbackService.ts

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import type {
  FeedbackMetadata,
  FeedbackRecord,
  FeedbackSubmission,
  FormspreeResponse,
} from '../types/feedback';

/**
 * Servicio de Feedback para DriveSkore
 * 
 * FUNCIONALIDADES:
 * 1. Captura automática de metadata del dispositivo
 * 2. Envío a Formspree (email a gamaliel.ms92@gmail.com)
 * 3. Guardado en Supabase (tabla feedback)
 * 4. Upload opcional de capturas de pantalla
 * 
 * FLUJO:
 * Usuario completa formulario → Captura metadata → Sube screenshot (si hay) 
 * → Envía a Formspree → Guarda en Supabase → Confirmación
 */
class FeedbackService {
  private readonly FORMSPREE_ENDPOINT = 'https://formspree.io/f/xjkpnglk';
  private readonly SCREENSHOT_BUCKET = 'feedback-screenshots';

  /**
   * Captura metadata automática del dispositivo
   */
  private async getDeviceMetadata(): Promise<FeedbackMetadata> {
    const appVersion = Application.nativeApplicationVersion || 'unknown';
    const buildNumber = Application.nativeBuildVersion || 'unknown';
    
    // Obtener información del dispositivo usando Constants
    const deviceName = Constants.deviceName || 'Unknown Device';
    const osVersion = Platform.Version || 'unknown';
    
    return {
      device_model: deviceName,
      os_version: `${Platform.OS} ${osVersion}`,
      app_version: `${appVersion} (build ${buildNumber})`,
    };
  }

  /**
   * Sube captura de pantalla a Supabase Storage usando ImageCompressionService
   */
  private async uploadScreenshot(
    userId: string,
    screenshotUri: string
  ): Promise<string | null> {
    try {
      console.log('📸 Subiendo captura de pantalla...');

      // Usar el servicio existente de compresión y upload
      const { default: ImageCompressionService } = await import('./ImageCompressionService');
      
      // Comprimir imagen primero
      const compressed = await ImageCompressionService.compressImage(screenshotUri);
      
      // Subir usando el método existente
      const result = await ImageCompressionService.uploadImage(
        compressed.uri,
        'feedback-screenshots' as any, // Cast porque el tipo no incluye este bucket
        userId,
        'feedback/'
      );

      console.log('✅ Captura subida correctamente:', result.publicUrl);
      return result.publicUrl;
    } catch (error) {
      console.error('❌ Error en uploadScreenshot:', error);
      return null;
    }
  }

  /**
   * Envía feedback a Formspree (email)
   */
  private async sendToFormspree(
    submission: FeedbackSubmission,
    metadata: FeedbackMetadata,
    screenshotUrl?: string | null
  ): Promise<FormspreeResponse> {
    try {
      console.log('📧 Enviando a Formspree...');

      const formData = new FormData();
      formData.append('category', this.getCategoryLabel(submission.category));
      formData.append('description', submission.description);
      formData.append('user_email', submission.user_email || 'No proporcionado');
      formData.append('device_model', metadata.device_model);
      formData.append('os_version', metadata.os_version);
      formData.append('app_version', metadata.app_version);
      
      if (screenshotUrl) {
        formData.append('screenshot_url', screenshotUrl);
      }

      const response = await fetch(this.FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data: FormspreeResponse = await response.json();

      if (data.ok) {
        console.log('✅ Enviado a Formspree correctamente');
      } else {
        console.error('❌ Error en Formspree:', data.errors);
      }

      return data;
    } catch (error) {
      console.error('❌ Error en sendToFormspree:', error);
      return { ok: false };
    }
  }

  /**
   * Guarda feedback en Supabase
   */
  private async saveToSupabase(
    submission: FeedbackSubmission,
    metadata: FeedbackMetadata,
    screenshotUrl?: string | null
  ): Promise<FeedbackRecord | null> {
    try {
      console.log('💾 Guardando en Supabase...');

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ Usuario no autenticado');
        return null;
      }

      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          user_email: submission.user_email || user.email,
          category: submission.category,
          description: submission.description,
          screenshot_url: screenshotUrl,
          device_model: metadata.device_model,
          os_version: metadata.os_version,
          app_version: metadata.app_version,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error guardando en Supabase:', error);
        return null;
      }

      console.log('✅ Guardado en Supabase correctamente');
      return data;
    } catch (error) {
      console.error('❌ Error en saveToSupabase:', error);
      return null;
    }
  }

  /**
   * Método principal: Enviar feedback completo
   */
  async submitFeedback(submission: FeedbackSubmission): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('🚀 Iniciando envío de feedback...');

      // 1. Capturar metadata del dispositivo
      const metadata = await this.getDeviceMetadata();
      console.log('📱 Metadata capturada:', metadata);

      // 2. Subir captura si existe
      let screenshotUrl: string | null = null;
      if (submission.screenshot_uri) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          screenshotUrl = await this.uploadScreenshot(user.id, submission.screenshot_uri);
        }
      }

      // 3. Enviar a Formspree (email)
      const formspreeResult = await this.sendToFormspree(
        submission,
        metadata,
        screenshotUrl
      );

      // 4. Guardar en Supabase
      const supabaseRecord = await this.saveToSupabase(
        submission,
        metadata,
        screenshotUrl
      );

      // 5. Evaluar resultado
      if (formspreeResult.ok && supabaseRecord) {
        return {
          success: true,
          message: '¡Gracias por tu feedback! Lo hemos recibido correctamente.',
        };
      } else if (formspreeResult.ok) {
        return {
          success: true,
          message: 'Feedback enviado. Guardado local no disponible.',
        };
      } else if (supabaseRecord) {
        return {
          success: true,
          message: 'Feedback guardado localmente. Email no enviado.',
        };
      } else {
        return {
          success: false,
          message: 'Error al enviar feedback. Por favor, intenta de nuevo.',
        };
      }
    } catch (error) {
      console.error('❌ Error general en submitFeedback:', error);
      return {
        success: false,
        message: 'Error inesperado. Por favor, intenta más tarde.',
      };
    }
  }

  /**
   * Obtiene el historial de feedback del usuario actual
   */
  async getUserFeedbackHistory(): Promise<FeedbackRecord[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo historial:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getUserFeedbackHistory:', error);
      return [];
    }
  }

  /**
   * Convierte código de categoría a etiqueta legible
   */
  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      bug: '🐛 Bug',
      suggestion: '💡 Sugerencia',
      other: '📝 Otro',
    };
    return labels[category] || category;
  }
}

export default new FeedbackService();
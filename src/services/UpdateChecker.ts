import { Alert, Linking } from 'react-native';
import { supabase } from '../config/supabase';

const CURRENT_VERSION = '1.0.0-beta';
const CURRENT_VERSION_CODE = 1; // Incrementar con cada build

export async function checkForUpdates() {
    try {
      console.log('🔍 Verificando actualizaciones en Supabase...');
      
      // Obtener última versión de Supabase
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .order('version_code', { ascending: false })
        .limit(1)
        .single();
  
      if (error) {
        console.log('⚠️ Error obteniendo versiones:', error.message);
        return;
      }
  
      if (!data) {
        console.log('⚠️ No se encontraron versiones en BD');
        return;
      }
  
      const latestVersion = data.version;
      const latestVersionCode = data.version_code;
      const isRequired = data.required;
      const downloadUrl = data.download_url;
      const releaseNotes = data.release_notes || 'Mejoras y correcciones';
  
      // 🔥 LOGS MÁS DETALLADOS
      console.log('📦 Versión actual:', CURRENT_VERSION, `(code: ${CURRENT_VERSION_CODE})`);
      console.log('🆕 Última versión:', latestVersion, `(code: ${latestVersionCode})`);
      console.log('⚖️ Comparación:', latestVersionCode, '>', CURRENT_VERSION_CODE, '=', latestVersionCode > CURRENT_VERSION_CODE);
      console.log('⚠️ Actualización requerida:', isRequired);
      console.log('🔗 URL descarga:', downloadUrl);
  
      // Comparar por version_code (más confiable que string)
      if (latestVersionCode > CURRENT_VERSION_CODE) {
        console.log('✨ ¡Nueva versión disponible!');
        
        showUpdateAlert(
          latestVersion,
          releaseNotes,
          downloadUrl,
          isRequired
        );
      } else {
        console.log('✅ App actualizada (versión más reciente instalada)');
      }
    } catch (error) {
      console.log('❌ Error verificando actualizaciones:', error);
    }
  }

function showUpdateAlert(
  version: string,
  notes: string,
  downloadUrl: string,
  required: boolean
) {
  Alert.alert(
    required ? '⚠️ Actualización requerida' : '🎉 Nueva versión disponible',
    `Versión ${version}\n\n${notes}`,
    [
      // Solo mostrar "Ahora no" si NO es requerida
      ...(!required ? [
        { 
          text: 'Ahora no', 
          style: 'cancel' as const,
          onPress: () => console.log('Update postponed')
        }
      ] : []),
      { 
        text: required ? 'Actualizar ahora' : 'Descargar',
        onPress: async () => {
          console.log('📥 Abriendo descarga:', downloadUrl);
          try {
            const supported = await Linking.canOpenURL(downloadUrl);
            if (supported) {
              await Linking.openURL(downloadUrl);
            } else {
              Alert.alert('Error', 'No se puede abrir el enlace de descarga');
            }
          } catch (error) {
            console.error('Error abriendo descarga:', error);
            Alert.alert('Error', 'No se pudo abrir la descarga');
          }
        }
      }
    ],
    { cancelable: !required } // No se puede cancelar si es requerida
  );
}

// Utilidad para comparar versiones semánticas (opcional)
export function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/[^0-9.]/g, '');
  const cleanV2 = v2.replace(/[^0-9.]/g, '');
  
  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
import { Alert, Linking } from 'react-native';

const CURRENT_VERSION = '1.0.0-beta'; // Cambiar según tu versión actual
const GITHUB_REPO = 'gamalielms92/driveskore';

export async function checkForUpdates() {
  try {
    console.log('🔍 Verificando actualizaciones...');
    
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { 
        headers: { 
          'Accept': 'application/vnd.github.v3+json' 
        } 
      }
    );
    
    if (!response.ok) {
      console.log('⚠️ No se pudo verificar actualizaciones');
      return;
    }
    
    const data = await response.json();
    const latestVersion = data.tag_name.replace('v', ''); // v1.0.0 → 1.0.0
    const downloadUrl = data.assets[0]?.browser_download_url;
    const releaseNotes = data.body || 'Mejoras y correcciones';
    
    console.log('📦 Versión actual:', CURRENT_VERSION);
    console.log('🆕 Última versión:', latestVersion);
    
    if (!downloadUrl) {
      console.log('⚠️ No hay archivo de descarga disponible');
      return;
    }
    
    // Comparar versiones (simple)
    if (latestVersion !== CURRENT_VERSION) {
      console.log('✨ Nueva versión disponible!');
      
      Alert.alert(
        '🎉 Actualización disponible',
        `Versión ${latestVersion}\n\n${truncateReleaseNotes(releaseNotes)}`,
        [
          { 
            text: 'Ahora no', 
            style: 'cancel',
            onPress: () => console.log('Update postponed')
          },
          { 
            text: 'Descargar', 
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
        ]
      );
    } else {
      console.log('✅ App actualizada');
    }
  } catch (error) {
    // Silencioso - no molestar al usuario si falla
    console.log('❌ Error verificando actualizaciones:', error);
  }
}

// Limitar notas de release a 150 caracteres
function truncateReleaseNotes(notes: string): string {
  const maxLength = 150;
  if (notes.length <= maxLength) return notes;
  return notes.substring(0, maxLength) + '...';
}

// Comparar versiones semánticas (opcional - más preciso)
export function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/[^0-9.]/g, ''); // Quitar -beta, -alpha, etc
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
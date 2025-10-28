import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/config/supabase';
import EventCaptureService from '../../src/services/EventCaptureService';
import { detectPlateFromImage } from '../../src/services/ocrService';
import { formatPlate, validateSpanishPlate } from '../../src/utils/plateValidator';

export default function CaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [plateValidation, setPlateValidation] = useState<any>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false); // NUEVO: Estado separado para OCR

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webIcon}>🌐</Text>
        <Text style={styles.webTitle}>Captura no disponible en web</Text>
        <Text style={styles.webMessage}>
          Esta funcionalidad requiere acceso a la cámara del dispositivo.
          Por favor, usa la aplicación móvil.
        </Text>
        <TouchableOpacity 
          style={styles.webButton}
          onPress={() => router.back()}
        >
          <Text style={styles.webButtonText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container}><Text>Cargando permisos...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>📷 Necesitamos acceso a tu cámara</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>✓ Permitir acceso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.takePictureAsync({ quality: 0.5 });
        setPhoto(photo.uri);
        setIsCapturing(false); // ← LIBERAR INMEDIATAMENTE después de capturar
        
        // OCR en background con su propio estado de loading
        setIsProcessingOCR(true);
        console.log('🔍 Iniciando detección OCR en background...');
        
        try {
          const detectedPlate = await detectPlateFromImage(photo.uri);
          
          if (detectedPlate && detectedPlate !== 'ERROR' && detectedPlate.length >= 4) {
            setPlate(detectedPlate);
            
            const validation = validateSpanishPlate(detectedPlate);
            setPlateValidation(validation);
            
            Alert.alert('✅ Matrícula detectada', `Se detectó: ${detectedPlate}\n\nPuedes editarla si es incorrecta.`);
          } else {
            console.log('ℹ️ OCR no detectó matrícula válida');
            Alert.alert(
              'ℹ️ Matrícula no detectada', 
              'Por favor, introduce la matrícula manualmente.',
              [{ text: 'OK', style: 'default' }]
            );
          }
        } catch (ocrError: any) {
          console.log('ℹ️ OCR no disponible:', ocrError?.message || ocrError);
          Alert.alert(
            'ℹ️ OCR no disponible', 
            'Introduce la matrícula manualmente.',
            [{ text: 'OK', style: 'default' }]
          );
        } finally {
          setIsProcessingOCR(false);
        }
        
      } catch (error) {
        console.log('ℹ️ No se pudo capturar foto:', error);
        Alert.alert('Error', 'No se pudo capturar la foto');
        setIsCapturing(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
        
        // OCR en background
        setIsProcessingOCR(true);
        
        try {
          const detectedPlate = await detectPlateFromImage(result.assets[0].uri);
          
          if (detectedPlate && detectedPlate !== 'ERROR' && detectedPlate.length >= 4) {
            setPlate(detectedPlate);
            
            const validation = validateSpanishPlate(detectedPlate);
            setPlateValidation(validation);
            
            Alert.alert('✅ Matrícula detectada', `Se detectó: ${detectedPlate}\n\nPuedes editarla si es incorrecta.`);
          } else {
            console.log('ℹ️ OCR no detectó matrícula válida en imagen de galería');
            Alert.alert(
              'ℹ️ Matrícula no detectada', 
              'Por favor, introduce la matrícula manualmente.',
              [{ text: 'OK', style: 'default' }]
            );
          }
        } catch (ocrError: any) {
          console.log('ℹ️ OCR no disponible en galería:', ocrError?.message || ocrError);
          Alert.alert(
            'ℹ️ OCR no disponible', 
            'Introduce la matrícula manualmente.',
            [{ text: 'OK', style: 'default' }]
          );
        } finally {
          setIsProcessingOCR(false);
        }
      }
    } catch (error) {
      console.log('ℹ️ No se pudo seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handlePlateChange = (text: string) => {
    const formatted = formatPlate(text);
    setPlate(formatted);
    
    if (formatted.length >= 4) {
      const validation = validateSpanishPlate(formatted);
      setPlateValidation(validation);
    } else {
      setPlateValidation(null);
    }
  };

const handleNext = async () => {
  if (!plate || plate.trim().length < 4) {
    Alert.alert('Error', 'Introduce una matrícula válida (mínimo 4 caracteres)');
    return;
  }

  try {
    setIsCapturing(true);

    // Obtener usuario autenticado
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      Alert.alert('Error', 'Debes iniciar sesión para capturar eventos');
      setIsCapturing(false);
      return;
    }

    // Inicializar servicio con userId real
    await EventCaptureService.initialize(userId);

    // IMPORTANTE: Pasar matrícula y foto al capturar evento
    const capturedEvent = await EventCaptureService.captureEvent(
      'bicycle',
      plate.toUpperCase(), // ← Matrícula
      photo || undefined    // ← URI de la foto
    );

    console.log('✅ Evento capturado con ID:', capturedEvent.id);
    console.log('📋 Matrícula guardada:', capturedEvent.plate);

    // Mostrar opciones al usuario
    Alert.alert(
      '📍 Evento Capturado',
      `Matrícula: ${plate.toUpperCase()}\n\nSe ha guardado el evento con tu ubicación y contexto.\n\n¿Qué deseas hacer?`,
      [
        {
          text: '📝 Evaluar Ahora',
          onPress: async () => {
            // Eliminar de pendientes antes de evaluar
            await EventCaptureService.removeEvent(capturedEvent.id);
            
            // Ir directamente a evaluar con los datos del evento
            router.push({
              pathname: '/rate',
              params: { 
                plate: capturedEvent.plate || plate.toUpperCase(), 
                photoUri: capturedEvent.photo_uri || photo || '',
                eventId: capturedEvent.id,
                fromCapture: 'true'
              }
            });
          }
        },
        {
          text: '⏰ Revisar Después',
          onPress: () => {
            // El evento YA está guardado con matrícula y foto
            console.log('💾 Evento guardado en pendientes con matrícula:', capturedEvent.plate);
            
            // Resetear para nueva captura
            setPhoto(null);
            setPlate('');
            setPlateValidation(null);
            
            // Ir a pendientes
            router.push('/(tabs)/pending');
          }
        },
        {
          text: '📸 Nueva Captura',
          onPress: () => {
            // El evento queda guardado en pendientes
            // Solo reseteamos el formulario
            setPhoto(null);
            setPlate('');
            setPlateValidation(null);
          }
        }
      ]
    );

  } catch (error) {
    console.log('ℹ️ Error capturando evento:', error);
    
    // Si falla la captura GPS/BT, permitir evaluar de todos modos
    Alert.alert(
      'Aviso',
      'No se pudo capturar la ubicación. ¿Continuar con la evaluación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          onPress: () => {
            router.push({
              pathname: '/rate',
              params: { 
                plate: plate.toUpperCase(), 
                photoUri: photo || '',
                fromCapture: 'true'
              }
            });
          }
        }
      ]
    );
  } finally {
    setIsCapturing(false);
  }
};

  const navigateToRate = () => {
    router.push({
      pathname: '/rate',
      params: { 
        plate: plate.toUpperCase(), 
        photoUri: photo || '' 
      }
    });
  };

  if (photo) {
    return (
      <ScrollView contentContainerStyle={styles.reviewContainer}>
        <Text style={styles.title}>Confirmar matrícula</Text>
        
        <Image source={{ uri: photo }} style={styles.preview} />
        
        {/* NUEVO: Indicador de OCR procesando */}
        {isProcessingOCR && (
          <View style={styles.ocrLoadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.ocrLoadingText}>🔍 Detectando matrícula...</Text>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Matrícula del vehículo:</Text>
          <TextInput
            style={[
              styles.input,
              plateValidation?.isValid && styles.inputValid,
              plateValidation && !plateValidation.isValid && styles.inputInvalid,
            ]}
            placeholder="Ej: 1234 ABC"
            value={plate}
            onChangeText={handlePlateChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            editable={!isProcessingOCR} // Deshabilitar mientras procesa OCR
          />
          
          {plateValidation && (
            <View style={styles.validationContainer}>
              <Text style={plateValidation.isValid ? styles.validationValid : styles.validationInvalid}>
                {plateValidation.isValid ? '✓ Matrícula válida' : '⚠ ' + plateValidation.error}
              </Text>
              {plateValidation.info && (
                <Text style={styles.validationInfo}>{plateValidation.info}</Text>
              )}
            </View>
          )}
          
          {/* CAMBIADO: Indicador específico para captura de ubicación */}
          {isCapturing && (
            <View style={styles.capturingContainer}>
              <ActivityIndicator size="small" color="#1976d2" />
              <Text style={styles.capturingText}>📍 Capturando ubicación y contexto...</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => {
              setPhoto(null);
              setPlate('');
              setPlateValidation(null);
            }}
            disabled={isCapturing || isProcessingOCR}
          >
            <Text style={styles.buttonSecondaryText}>← Repetir</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button, 
              styles.buttonPrimary,
              (!plate || plate.length < 4 || isCapturing || isProcessingOCR) && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={!plate || plate.length < 4 || isCapturing || isProcessingOCR}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Siguiente →</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera}
          facing="back"
          ref={(ref) => setCameraRef(ref)}
        />
        <View style={styles.cameraOverlay}>
          <View style={styles.frame} />
          <Text style={styles.hint}>
            📷 Consejos para mejor detección:{'\n'}
            • Luz natural o buena iluminación{'\n'}
            • Matrícula centrada y perpendicular{'\n'}
            • Sin reflejos ni sombras{'\n'}
            • Enfoque nítido
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.galleryButton} 
          onPress={pickImage}
          disabled={isCapturing}
        >
          <Text style={styles.galleryButtonText}>🖼️ Galería</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.captureButton} 
          onPress={takePicture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={isCapturing}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  frame: {
    width: 280,
    height: 140,
    borderWidth: 3,
    borderColor: '#00ff00',
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  hint: {
    marginTop: 20,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: '80%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
  },
  galleryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  reviewContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    backgroundColor: '#fff',
    textTransform: 'uppercase',
  },
  inputValid: {
    borderColor: '#4CAF50',
  },
  inputInvalid: {
    borderColor: '#ff9800',
  },
  validationContainer: {
    marginTop: 8,
  },
  validationValid: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  validationInvalid: {
    color: '#ff9800',
    fontSize: 14,
    fontWeight: '600',
  },
  validationInfo: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  // NUEVO: Estilos para indicador de OCR
  ocrLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  ocrLoadingText: {
    marginLeft: 10,
    color: '#1976d2',
    fontSize: 14,
  },
  // CAMBIADO: Renombrado de capturingContainer
  capturingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fff3e0', // Color diferente para diferenciar
    borderRadius: 8,
  },
  capturingText: {
    marginLeft: 10,
    color: '#e65100', // Color diferente
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    paddingHorizontal: 20,
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  webIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  webMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  webButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  webButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

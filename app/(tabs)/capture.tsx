import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useRef, useState } from 'react';
import {
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
import { detectPlateFromImage } from '../../src/services/ocrService';
import { formatPlate, validateSpanishPlate } from '../../src/utils/plateValidator';

export default function CaptureScreen() {
  const router = useRouter();
  const route = useLocalSearchParams();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [plateValidation, setPlateValidation] = useState<any>(null);
  const cameraRef = useRef<any>(null);

  // Estados para confirmación por voz
  const [awaitingVoiceConfirmation, setAwaitingVoiceConfirmation] = useState(false);
  const [pendingPlate, setPendingPlate] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);

  // Detectar si viene de modo conducción
  const isDrivingMode = route.drivingMode === 'true';
  const isViaVoice = route.viaVoice === 'true';

  // Escuchar eventos de voz para confirmación
  useSpeechRecognitionEvent('result', (event) => {
    if (!awaitingVoiceConfirmation) return;
    
    const text = event.results?.[0]?.transcript?.toLowerCase() || '';
    console.log('🎤 Confirmación escuchada:', text);

    if (text.includes('si') || text.includes('sí') || text.includes('correcto') || 
        text.includes('confirmar') || text.includes('vale') || text.includes('ok')) {
      handleConfirmYes();
    } else if (text.includes('no') || text.includes('repetir') || 
               text.includes('cambiar') || text.includes('mal')) {
      handleConfirmNo();
    }
  });

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
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Necesitamos acceso a tu cámara</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        setPhoto(photo.uri);
        
        Alert.alert('📸 Foto capturada', 'Analizando matrícula con OCR...');
        
        try {
          const detectedPlate = await detectPlateFromImage(photo.uri);
          
          if (detectedPlate && detectedPlate !== 'ERROR') {
            setPlate(detectedPlate);
            
            const validation = validateSpanishPlate(detectedPlate);
            setPlateValidation(validation);

            if (isDrivingMode || isViaVoice) {
              // FLUJO POR VOZ
              handleVoiceConfirmation(detectedPlate, photo.uri, validation);
            } else {
              // FLUJO TÁCTIL NORMAL
              handleTactileConfirmation(detectedPlate, photo.uri, validation);
            }
          } else {
            Alert.alert('⚠️ No se pudo detectar', 'Introduce la matrícula manualmente');
          }
        } catch (ocrError) {
          console.log('Error OCR:', ocrError);
          Alert.alert('⚠️ Error en OCR', 'Introduce la matrícula manualmente');
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo capturar la foto');
      }
    }
  };

  const handleVoiceConfirmation = async (
    detectedPlate: string, 
    photoUri: string,
    validation: any
  ) => {
    // Hablar la matrícula letra por letra
    const plateSpoken = detectedPlate.split('').join(' ');
    
    await Speech.speak(
      `He detectado la matrícula ${plateSpoken}. ¿Es correcto?`,
      { language: 'es-ES', rate: 0.85 }
    );

    // Guardar datos pendientes
    setPendingPlate(detectedPlate);
    setPendingPhotoUri(photoUri);
    setAwaitingVoiceConfirmation(true);

    // Iniciar escucha para confirmación
    try {
      await ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (error) {
      console.error('Error iniciando reconocimiento:', error);
      // Fallback a táctil
      handleTactileConfirmation(detectedPlate, photoUri, validation);
    }

    // Timeout de 10 segundos
    setTimeout(() => {
      if (awaitingVoiceConfirmation) {
        Speech.speak('No he escuchado respuesta. Intenta de nuevo');
        setAwaitingVoiceConfirmation(false);
        ExpoSpeechRecognitionModule.stop();
      }
    }, 10000);
  };

  const handleConfirmYes = async () => {
    setAwaitingVoiceConfirmation(false);
    await ExpoSpeechRecognitionModule.stop();
    
    await Speech.speak('Perfecto, continuando con la evaluación');

    // Ir a evaluación por voz
    setTimeout(() => {
      router.push({
        pathname: '/rate',
        params: {
          plate: pendingPlate!,
          photoUri: pendingPhotoUri!,
          viaVoice: 'true',
          drivingMode: isDrivingMode ? 'true' : 'false',
        }
      });
    }, 1500);
  };

  const handleConfirmNo = async () => {
    setAwaitingVoiceConfirmation(false);
    await ExpoSpeechRecognitionModule.stop();
    
    await Speech.speak('De acuerdo. Captura de nuevo la foto o introduce la matrícula manualmente');

    // Volver a capturar
    setTimeout(() => {
      setPhoto(null);
      setPlate('');
    }, 2000);
  };

  const handleTactileConfirmation = (
    detectedPlate: string,
    photoUri: string, 
    validation: any
  ) => {
    let message = `Se detectó: ${detectedPlate}\n\n`;
    
    if (validation.isValid) {
      message += `✅ Formato: ${validation.format === 'current' ? 'Actual (2000+)' : 'Provincial (1971-2000)'}\n`;
      if (validation.year) {
        message += `📅 Época: ${validation.year}\n`;
      }
    }
    
    message += '\nPuedes editarla si es incorrecta.';
    
    Alert.alert('✅ Matrícula detectada', message);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
      
      try {
        const detectedPlate = await detectPlateFromImage(result.assets[0].uri);
        
        if (detectedPlate && detectedPlate !== 'ERROR') {
          setPlate(detectedPlate);
          
          const validation = validateSpanishPlate(detectedPlate);
          setPlateValidation(validation);
          
          Alert.alert('✅ Matrícula detectada', `Se detectó: ${detectedPlate}\n\nPuedes editarla si es incorrecta.`);
        } else {
          Alert.alert('⚠️ No se pudo detectar', 'Introduce la matrícula manualmente');
        }
      } catch (error) {
        console.log('Error OCR:', error);
        Alert.alert('⚠️ Error en OCR', 'Introduce la matrícula manualmente');
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const retake = () => {
    setPhoto(null);
    setPlate('');
    setPlateValidation(null);
  };

  const handlePlateChange = (text: string) => {
    const upperText = text.toUpperCase();
    setPlate(upperText);
    
    const validation = validateSpanishPlate(upperText);
    setPlateValidation(validation);
  };

  const handleContinue = () => {
    if (!plate.trim()) {
      Alert.alert('Error', 'Por favor introduce una matrícula');
      return;
    }

    const validation = validateSpanishPlate(plate);
    
    if (!validation.isValid) {
      Alert.alert(
        'Matrícula inválida',
        validation.error || 'El formato de la matrícula no es correcto',
        [
          { text: 'Corregir', style: 'cancel' },
          { text: 'Continuar de todas formas', onPress: () => goToRate() }
        ]
      );
      return;
    }

    goToRate();
  };

  const goToRate = () => {
    const formattedPlate = formatPlate(plate);
    
    router.push({
      pathname: '/rate',
      params: {
        plate: formattedPlate,
        photoUri: photo || '',
        viaVoice: isViaVoice ? 'true' : 'false',
        drivingMode: isDrivingMode ? 'true' : 'false',
      }
    });
  };

  if (photo) {
    return (
      <ScrollView style={styles.container}>
        {awaitingVoiceConfirmation && (
          <View style={styles.voiceConfirmationOverlay}>
            <Text style={styles.voiceConfirmationIcon}>🎤</Text>
            <Text style={styles.voiceConfirmationText}>
              Escuchando confirmación...
            </Text>
            <Text style={styles.voiceConfirmationHint}>
              Di "Sí" o "No"
            </Text>
          </View>
        )}

        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          
          <View style={styles.plateInputContainer}>
            <Text style={styles.label}>Matrícula detectada:</Text>
            <TextInput
              style={[
                styles.plateInput,
                plateValidation?.isValid === false && styles.plateInputInvalid,
                plateValidation?.isValid === true && styles.plateInputValid
              ]}
              value={plate}
              onChangeText={handlePlateChange}
              placeholder="Ej: 1234 ABC"
              autoCapitalize="characters"
              maxLength={10}
            />
            
            {plateValidation && (
              <View style={styles.validationContainer}>
                {plateValidation.isValid ? (
                  <>
                    <Text style={styles.validationSuccess}>✅ Matrícula válida</Text>
                    <Text style={styles.validationInfo}>
                      Formato: {plateValidation.format === 'current' ? 'Actual (2000+)' : 'Provincial (1971-2000)'}
                    </Text>
                    {plateValidation.year && (
                      <Text style={styles.validationInfo}>Época: {plateValidation.year}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.validationError}>
                    ⚠️ {plateValidation.error}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <Text style={styles.retakeButtonText}>🔄 Repetir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.continueButton,
                !plate.trim() && styles.continueButtonDisabled
              ]} 
              onPress={handleContinue}
              disabled={!plate.trim()}
            >
              <Text style={styles.continueButtonText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.frameContainer}>
            <View style={styles.frame} />
            <Text style={styles.hint}>
              Centra la matrícula en el recuadro
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            <Text style={styles.galleryButtonText}>📁</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.flipButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  webIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  webMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  webButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  webButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
    fontSize: 18,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    margin: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    alignItems: 'center',
  },
  frame: {
    width: 300,
    height: 100,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  hint: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  captureButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#007AFF',
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 30,
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButtonText: {
    fontSize: 30,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
  },
  plateInputContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  plateInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  plateInputValid: {
    borderColor: '#34C759',
    backgroundColor: '#E8F5E9',
  },
  plateInputInvalid: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFEBEE',
  },
  validationContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  validationSuccess: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  validationInfo: {
    color: '#666',
    fontSize: 14,
    marginTop: 3,
  },
  validationError: {
    color: '#FF3B30',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    backgroundColor: '#fff',
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  voiceConfirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  voiceConfirmationIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  voiceConfirmationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  voiceConfirmationHint: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
});
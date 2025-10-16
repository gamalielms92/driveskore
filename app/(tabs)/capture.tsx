import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { detectPlateFromImage } from '../../src/services/ocrService';
import { isBlacklisted, validateSpanishPlate } from '../../src/utils/plateValidator';

export default function CaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [plateValidation, setPlateValidation] = useState<any>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({ quality: 0.5 });
        setPhoto(photo.uri);
        
        Alert.alert('📸 Foto capturada', 'Analizando matrícula con OCR...');
        
        try {
          const detectedPlate = await detectPlateFromImage(photo.uri);
          
          if (detectedPlate && detectedPlate !== 'ERROR') {
            setPlate(detectedPlate);
            
            const validation = validateSpanishPlate(detectedPlate);
            setPlateValidation(validation);
            
            let message = `Se detectó: ${detectedPlate}\n\n`;
            
            if (validation.isValid) {
              message += `✅ Formato: ${validation.format === 'current' ? 'Actual (2000+)' : 'Provincial (1971-2000)'}\n`;
              if (validation.year) {
                message += `📅 Época: ${validation.year}\n`;
              }
            }
            
            message += '\nPuedes editarla si es incorrecta.';
            
            Alert.alert('✅ Matrícula detectada', message);
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
      
      Alert.alert('📁 Imagen seleccionada', 'Analizando matrícula con OCR...');
      
      try {
        const detectedPlate = await detectPlateFromImage(result.assets[0].uri);
        
        if (detectedPlate && detectedPlate !== 'ERROR') {
          setPlate(detectedPlate);
          
          const validation = validateSpanishPlate(detectedPlate);
          setPlateValidation(validation);
          
          let message = `Se detectó: ${detectedPlate}\n\n`;
          
          if (validation.isValid) {
            message += `✅ Formato: ${validation.format === 'current' ? 'Actual (2000+)' : 'Provincial (1971-2000)'}\n`;
            if (validation.year) {
              message += `📅 Época: ${validation.year}\n`;
            }
          }
          
          message += '\nPuedes editarla si es incorrecta.';
          
          Alert.alert('✅ Matrícula detectada', message);
        } else {
          Alert.alert('⚠️ No se pudo detectar', 'Introduce la matrícula manualmente');
        }
      } catch (ocrError) {
        console.log('Error OCR:', ocrError);
        Alert.alert('⚠️ Error en OCR', 'Introduce la matrícula manualmente');
      }
    }
  };

  const handlePlateChange = (text: string) => {
    const cleanText = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    
    setPlate(cleanText);
    
    const validation = validateSpanishPlate(cleanText);
    setPlateValidation(validation);
    
    if (/^\d{4}[A-Z]{1,3}$/.test(cleanText)) {
      const formatted = cleanText.replace(/(\d{4})([A-Z]+)/, '$1 $2');
      setPlate(formatted);
    }
  };

  const handleNext = () => {
    if (!plate || plate.trim().length < 4) {
      Alert.alert('Error', 'Introduce una matrícula válida (mínimo 4 caracteres)');
      return;
    }

    const validation = validateSpanishPlate(plate);
    
    if (!validation.isValid) {
      Alert.alert(
        '⚠️ Matrícula no válida',
        `El formato "${plate}" no corresponde a una matrícula española.\n\n¿Quieres continuar de todas formas?`,
        [
          { text: 'Corregir', style: 'cancel' },
          { 
            text: 'Continuar',
            onPress: () => proceedToRate()
          }
        ]
      );
      return;
    }

    if (isBlacklisted(plate)) {
      Alert.alert(
        '🚫 Matrícula bloqueada',
        `La combinación de letras "${validation.letters}" está en la lista negra de la DGT.\n\nNo puede ser una matrícula válida.`
      );
      return;
    }

    proceedToRate();
  };

  const proceedToRate = () => {
    router.push({
      pathname: '/rate',
      params: { plate: plate.toUpperCase().trim(), photoUri: photo || '' }
    });
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷</Text>
          <Text style={styles.permissionTitle}>Necesitamos acceso a tu cámara</Text>
          <Text style={styles.permissionDesc}>
            Para capturar fotos de matrículas y evaluar conductores
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>✅ Permitir acceso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.galleryButton]} onPress={pickImage}>
            <Text style={styles.buttonText}>📁 Usar Galería</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!photo ? (
        <>
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
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <Text style={styles.captureButtonText}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryButtonBottom} onPress={pickImage}>
              <Text style={styles.buttonText}>📁 Galería</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          
          <Text style={styles.label}>Matrícula detectada:</Text>
          <TextInput
            style={[
              styles.input,
              plateValidation?.isValid === true && styles.inputValid,
              plateValidation?.isValid === false && plate.length >= 4 && styles.inputInvalid
            ]}
            placeholder="Ej: 1234ABC o 1234 ABC"
            value={plate}
            onChangeText={handlePlateChange}
            autoCapitalize="characters"
            maxLength={10}
          />
          
          {plate.length >= 4 && (
            <View style={styles.validationContainer}>
              {plateValidation?.isValid ? (
                <>
                  <Text style={styles.validationIcon}>✅</Text>
                  <Text style={styles.validationText}>
                    {plateValidation.format === 'current' 
                      ? `Formato actual (${plateValidation.year})`
                      : `Formato provincial (${plateValidation.year})`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.validationIcon}>⚠️</Text>
                  <Text style={styles.validationTextError}>
                    Formato no válido. Ej: 1234 ABC o M 1234 BC
                  </Text>
                </>
              )}
            </View>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.retakeButton]} 
              onPress={() => {
                setPhoto(null);
                setPlate('');
                setPlateValidation(null);
              }}
            >
              <Text style={styles.buttonText}>🔄 Repetir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.nextButton]} 
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>➡️ Siguiente</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 80,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#000',
  },
  permissionDesc: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
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
    width: 300,
    height: 150,
    borderWidth: 3,
    borderColor: '#34C759',
    borderRadius: 10,
  },
  hint: {
    color: 'white',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    maxWidth: '90%',
    lineHeight: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureButtonText: {
    fontSize: 40,
  },
  galleryButtonBottom: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    paddingHorizontal: 30,
  },
  previewContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  inputValid: {
    borderColor: '#34C759',
  },
  inputInvalid: {
    borderColor: '#FF3B30',
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  validationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  validationText: {
    flex: 1,
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  validationTextError: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  galleryButton: {
    backgroundColor: '#007AFF',
    marginTop: 10,
  },
  retakeButton: {
    backgroundColor: '#FF3B30',
  },
  nextButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
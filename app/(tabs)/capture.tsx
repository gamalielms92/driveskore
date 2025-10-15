import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { detectPlateFromImage } from '../../src/services/ocrService';


export default function CaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [cameraRef, setCameraRef] = useState<any>(null);

 // const takePicture = async () => {
 //   if (cameraRef) {
 //     try {
 //       const photo = await cameraRef.takePictureAsync({ quality: 0.5 });
 //       setPhoto(photo.uri);
 //       Alert.alert('Foto capturada', 'Introduce la matrícula manualmente');
 //     } catch (error) {
 //       Alert.alert('Error', 'No se pudo capturar la foto');
 //     }
 //   }
 // };

 const takePicture = async () => {
  if (cameraRef) {
    try {
      const photo = await cameraRef.takePictureAsync({ quality: 0.5 });
      setPhoto(photo.uri);
      
      // Mostrar alerta inicial
      Alert.alert('📸 Foto capturada', 'Analizando matrícula con OCR...');
      
      // Intentar detectar matrícula automáticamente
      try {
        const detectedPlate = await detectPlateFromImage(photo.uri);
        
        if (detectedPlate && detectedPlate !== 'ERROR') {
          setPlate(detectedPlate);
          Alert.alert(
            '✅ Matrícula detectada', 
            `Se detectó: ${detectedPlate}\n\nPuedes editarla si es incorrecta.`
          );
        } else {
          Alert.alert(
            '⚠️ No se pudo detectar', 
            'Introduce la matrícula manualmente'
          );
        }
      } catch (ocrError) {
        console.log('Error OCR:', ocrError);
        Alert.alert(
          '⚠️ Error en OCR', 
          'Introduce la matrícula manualmente'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo capturar la foto');
    }
  }
  };

//  const pickImage = async () => {
//    const result = await ImagePicker.launchImageLibraryAsync({
//      mediaTypes: ImagePicker.MediaTypeOptions.Images,
//      allowsEditing: true,
//      quality: 0.5,
//    });

//    if (!result.canceled) {
//      setPhoto(result.assets[0].uri);
//      Alert.alert('Imagen seleccionada', 'Introduce la matrícula manualmente');
//    }
//  };

  const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.5,
  });

  if (!result.canceled) {
    setPhoto(result.assets[0].uri);
    
    // Mostrar alerta inicial
    Alert.alert('📁 Imagen seleccionada', 'Analizando matrícula con OCR...');
    
    // Intentar detectar matrícula
    try {
      const detectedPlate = await detectPlateFromImage(result.assets[0].uri);
      
      if (detectedPlate && detectedPlate !== 'ERROR') {
        setPlate(detectedPlate);
        Alert.alert(
          '✅ Matrícula detectada', 
          `Se detectó: ${detectedPlate}\n\nPuedes editarla si es incorrecta.`
        );
      } else {
        Alert.alert(
          '⚠️ No se pudo detectar', 
          'Introduce la matrícula manualmente'
        );
      }
    } catch (ocrError) {
      console.log('Error OCR:', ocrError);
      Alert.alert(
        '⚠️ Error en OCR', 
        'Introduce la matrícula manualmente'
      );
    }
  }
  };

  const handleNext = () => {
    if (!plate || plate.trim().length < 4) {
      Alert.alert('Error', 'Introduce una matrícula válida (mínimo 4 caracteres)');
      return;
    }
    router.push({
      pathname: '/rate',
      params: { plate: plate.toUpperCase(), photoUri: photo || '' }
    });
  };

  // Verificar permisos
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
          <CameraView 
            style={styles.camera}
            facing="back"
            ref={(ref) => setCameraRef(ref)}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>Centra la matrícula en el recuadro</Text>
            </View>
          </CameraView>
          
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
            style={styles.input}
            placeholder="Ej: 1234ABC"
            value={plate}
            onChangeText={setPlate}
            autoCapitalize="characters"
            maxLength={10}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.retakeButton]} 
              onPress={() => {
                setPhoto(null);
                setPlate('');
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
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
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
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
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
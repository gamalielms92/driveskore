import OCRWebView from '@/components/OCRWebView';
import { correctOCRErrors, isBlacklisted, PlateValidation, validateSpanishPlate } from '@/utils/plateValidator';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ScannerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [plateValidation, setPlateValidation] = useState<PlateValidation | null>(null);

  // Convertir imagen a Base64 optimizada para OCR
  const convertToBase64 = async (uri: string): Promise<string> => {
    try {
      // Leer la imagen con calidad reducida para OCR más rápido
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      
      // Verificar tamaño (opcional, para debugging)
      const sizeInMB = (base64.length * 0.75) / (1024 * 1024);
      console.log(`📊 Tamaño de imagen: ${sizeInMB.toFixed(2)} MB`);
      
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error convirtiendo a base64:', error);
      throw error;
    }
  };

  // Seleccionar imagen de la galería
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8, // Reducir calidad para procesamiento más rápido
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setExtractedText('');
      setConfidence(null);
      setPlateValidation(null);
      
      // Convertir a base64 para el OCR
      try {
        const base64 = await convertToBase64(uri);
        setImageBase64(base64);
      } catch (error) {
        Alert.alert('Error', 'No se pudo procesar la imagen');
      }
    }
  };

  // Tomar foto con la cámara
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8, // Reducir calidad para procesamiento más rápido
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setExtractedText('');
      setConfidence(null);
      setPlateValidation(null);
      
      // Convertir a base64 para el OCR
      try {
        const base64 = await convertToBase64(uri);
        setImageBase64(base64);
      } catch (error) {
        Alert.alert('Error', 'No se pudo procesar la imagen');
      }
    }
  };

  // Callback cuando el OCR extrae texto
  const handleTextExtracted = (text: string, conf: number) => {
    console.log('Texto OCR original:', text);
    
    // Intentar corregir errores comunes del OCR
    const correctedText = correctOCRErrors(text);
    console.log('Texto corregido:', correctedText);
    
    // Validar si es una matrícula española
    const validation = validateSpanishPlate(correctedText);
    
    setExtractedText(correctedText);
    setConfidence(conf);
    setPlateValidation(validation);

    if (validation.isValid) {
      // Verificar si está en lista negra
      if (isBlacklisted(validation.plate!)) {
        Alert.alert(
          '⚠️ Matrícula no permitida',
          `La matrícula ${validation.plate} contiene combinación prohibida por la DGT`,
          [{ text: 'Entendido' }]
        );
      } else {
        // Mensaje según la confianza
        let confidenceMsg = '';
        if (conf < 50) {
          confidenceMsg = '\n\n⚠️ Confianza baja. Verifica que sea correcta.';
        } else if (conf < 70) {
          confidenceMsg = '\n\n⚡ Confianza media. Revisa el resultado.';
        } else {
          confidenceMsg = '\n\n✅ Alta confianza en el resultado.';
        }
        
        Alert.alert(
          '✅ Matrícula detectada',
          `Formato: ${validation.format}\n` +
          `Matrícula: ${validation.plate}\n` +
          `Período: ${validation.year}\n` +
          `Confianza: ${conf.toFixed(1)}%${confidenceMsg}`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Guardar', 
              onPress: () => handleSavePlate(validation)
            }
          ]
        );
      }
    } else {
      Alert.alert(
        '❌ No se detectó matrícula válida',
        `Texto detectado: "${correctedText}"\n` +
        `Confianza: ${conf.toFixed(1)}%\n\n` +
        '💡 Consejos para mejorar:\n' +
        '• Asegúrate de que la matrícula esté centrada\n' +
        '• Usa buena iluminación\n' +
        '• Evita reflejos y sombras\n' +
        '• La matrícula debe estar limpia\n' +
        '• Acércate más a la matrícula',
        [{ text: 'Reintentar' }]
      );
    }
  };

  // Callback de error
  const handleError = (error: string) => {
    console.error('Error completo del OCR:', error);
    Alert.alert(
      'Error de procesamiento', 
      `Detalles: ${error}\n\n¿Tienes conexión a internet?`,
      [
        { text: 'Reintentar', onPress: () => setImageUri(null) },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  // Guardar matrícula (aquí conectarías con Supabase)
  const handleSavePlate = (validation: PlateValidation) => {
    console.log('Guardando matrícula:', validation.plate);
    // TODO: Implementar guardado en Supabase
    Alert.alert('Éxito', 'Matrícula guardada correctamente');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🚗 Escáner de Matrículas</Text>

        {/* Botones */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.buttonText}>Tomar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={pickImage}>
            <Ionicons name="images" size={24} color="white" />
            <Text style={styles.buttonText}>Galería</Text>
          </TouchableOpacity>
        </View>

        {/* Preview de la imagen */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Text style={styles.subtitle}>Imagen seleccionada:</Text>
            <Image source={{ uri: imageUri }} style={styles.image} />
          </View>
        )}

        {/* Resultado del escaneo */}
        {extractedText ? (
          <View style={styles.resultContainer}>
            <Text style={styles.subtitle}>Resultado del escaneo:</Text>
            
            {/* Información de validación */}
            {plateValidation && plateValidation.isValid ? (
              <View style={styles.validPlateContainer}>
                <Text style={styles.validPlateTitle}>✅ Matrícula válida</Text>
                <Text style={styles.plateNumber}>{plateValidation.plate}</Text>
                <View style={styles.plateDetails}>
                  <Text style={styles.detailLabel}>Formato:</Text>
                  <Text style={styles.detailValue}>
                    {plateValidation.format === 'current' && 'Actual (2000+)'}
                    {plateValidation.format === 'provincial' && 'Provincial (1971-2000)'}
                    {plateValidation.format === 'old' && 'Antiguo (pre-1971)'}
                  </Text>
                </View>
                {plateValidation.numbers && (
                  <View style={styles.plateDetails}>
                    <Text style={styles.detailLabel}>Números:</Text>
                    <Text style={styles.detailValue}>{plateValidation.numbers}</Text>
                  </View>
                )}
                {plateValidation.letters && (
                  <View style={styles.plateDetails}>
                    <Text style={styles.detailLabel}>Letras:</Text>
                    <Text style={styles.detailValue}>{plateValidation.letters}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.invalidPlateContainer}>
                <Text style={styles.invalidPlateTitle}>❌ Formato no válido</Text>
                <Text style={styles.rawText}>Texto detectado: {extractedText}</Text>
              </View>
            )}

            {confidence && (
              <Text style={styles.confidence}>
                Confianza del OCR: {confidence.toFixed(1)}%
              </Text>
            )}
          </View>
        ) : null}

        {/* Instrucciones */}
        {!imageUri && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>📝 Instrucciones:</Text>
            <Text style={styles.instructionsText}>
              1. Toma una foto o selecciona una imagen de una matrícula{'\n'}
              2. Espera mientras se procesa (5-15 segundos){'\n'}
              3. La matrícula se validará automáticamente{'\n'}
              {'\n'}
              💡 Tips:{'\n'}
              • Centra la matrícula en la imagen{'\n'}
              • Usa buena iluminación{'\n'}
              • Evita reflejos y sombras{'\n'}
              • La matrícula debe estar limpia y legible{'\n'}
              {'\n'}
              📋 Formatos soportados:{'\n'}
              • Actual: 1234 ABC (desde 2000){'\n'}
              • Provincial: M 1234 BC (1971-2000){'\n'}
              • Antiguo: 1234 AB (pre-1971)
            </Text>
          </View>
        )}
      </ScrollView>

      {/* WebView oculto que hace el OCR */}
      <OCRWebView
        imageUri={imageBase64}
        onTextExtracted={handleTextExtracted}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonSecondary: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  resultContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  validPlateContainer: {
    backgroundColor: '#d4edda',
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#28a745',
    marginBottom: 10,
  },
  validPlateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 10,
  },
  plateNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 15,
    letterSpacing: 2,
  },
  plateDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
  detailValue: {
    fontSize: 14,
    color: '#155724',
  },
  invalidPlateContainer: {
    backgroundColor: '#f8d7da',
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dc3545',
    marginBottom: 10,
  },
  invalidPlateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 10,
  },
  rawText: {
    fontSize: 16,
    color: '#721c24',
    fontStyle: 'italic',
  },
  confidence: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  instructionsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
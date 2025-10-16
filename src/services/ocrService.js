// src/services/ocrService.js
import {
  correctOCRErrors,
  formatPlate,
  validateSpanishPlate
} from '../utils/plateValidator';
import { preprocessImageForOCR } from './imageProcessing';

// Leer API key desde variables de entorno
const OCR_API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY;

if (!OCR_API_KEY) {
  console.error('⚠️ FALTA OCR_API_KEY en archivo .env');
  throw new Error('OCR_API_KEY no está configurada. Añádela al archivo .env con el prefijo EXPO_PUBLIC_');
}

const OCR_API_URL = 'https://api.ocr.space/parse/image';

/**
 * Convierte imagen URI a base64
 */
const imageToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error convirtiendo a base64:', error);
    throw error;
  }
};

/**
 * Extrae texto de imagen usando OCR.space
 */
export const extractTextFromImage = async (imageUri) => {
  try {
    console.log('🔍 Iniciando OCR con OCR.space...');

    // Pre-procesar imagen
    const processedUri = await preprocessImageForOCR(imageUri);
    
    // Convertir a base64
    const base64Image = await imageToBase64(processedUri);

    // Crear FormData
    const formData = new FormData();
    formData.append('apikey', OCR_API_KEY);
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    console.log('📤 Enviando a OCR.space...');

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    console.log('📥 Respuesta OCR.space:', result);

    if (result.OCRExitCode === 1 && result.ParsedResults?.[0]?.ParsedText) {
      const text = result.ParsedResults[0].ParsedText.trim();
      console.log('✅ Texto extraído (raw):', text);
      return text;
    } else if (result.OCRExitCode === 99) {
      throw new Error(`Error OCR.space: ${result.ErrorMessage || 'Límite de API alcanzado'}`);
    } else {
      throw new Error('No se pudo extraer texto de la imagen');
    }
  } catch (error) {
    console.error('❌ Error en OCR:', error);
    throw error;
  }
};

/**
 * Extrae matrícula del texto OCR usando el validador avanzado
 */
export const extractPlateFromText = (text) => {
  console.log('🔍 Texto original OCR:', text);

  // PASO 1: Intentar validar directamente el texto original
  let validation = validateSpanishPlate(text);
  
  if (validation.isValid) {
    console.log('✅ Matrícula detectada directamente:', validation.plate);
    return validation.plate;
  }

  console.log('⚠️ No se detectó directamente, intentando corrección OCR...');

  // PASO 2: Si no funciona, aplicar correcciones de OCR
  const correctedText = correctOCRErrors(text);
  console.log('🔧 Texto corregido:', correctedText);

  validation = validateSpanishPlate(correctedText);

  if (validation.isValid) {
    console.log('✅ Matrícula detectada tras corrección:', validation.plate);
    return validation.plate;
  }

  console.log('⚠️ No se detectó con corrección, intentando limpieza básica...');

  // PASO 3: Limpieza muy básica y re-intento
  const cleanedText = text
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Solo alfanuméricos y espacios
    .replace(/\s+/g, ' ')
    .trim();

  console.log('🧹 Texto limpio:', cleanedText);

  validation = validateSpanishPlate(cleanedText);

  if (validation.isValid) {
    console.log('✅ Matrícula detectada tras limpieza:', validation.plate);
    return validation.plate;
  }

  // PASO 4: Último intento - buscar cualquier secuencia 4 dígitos + 3 letras
  const emergencyPattern = /(\d{4})\s?([A-Z]{3})/;
  const match = cleanedText.match(emergencyPattern);

  if (match) {
    const emergencyPlate = `${match[1]} ${match[2]}`;
    console.log('🆘 Matrícula detectada con patrón de emergencia:', emergencyPlate);
    return emergencyPlate;
  }

  console.log('❌ No se pudo detectar ninguna matrícula válida');
  
  // Devolver el texto limpio para que el usuario pueda editarlo
  return cleanedText.substring(0, 10) || 'ERROR';
};

/**
 * Función principal: detectar matrícula de imagen
 */
export const detectPlateFromImage = async (imageUri) => {
  try {
    console.log('📸 Procesando imagen:', imageUri);
    
    // Extraer texto con OCR
    const text = await extractTextFromImage(imageUri);
    
    // Extraer y validar matrícula
    const plate = extractPlateFromText(text);
    
    // Validar el resultado final
    const validation = validateSpanishPlate(plate);
    
    if (!validation.isValid) {
      throw new Error('No se detectó una matrícula válida');
    }
    
    // Devolver la matrícula formateada correctamente
    return formatPlate(plate);
    
  } catch (error) {
    console.error('❌ Error detectando matrícula:', error);
    throw error;
  }
};
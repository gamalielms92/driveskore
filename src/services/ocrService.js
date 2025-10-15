// src/services/ocrService.js
import { preprocessImageForOCR } from './imageProcessing';

const OCR_API_KEY = 'K88775413588957'; // API KEY de OCR.space
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
    formData.append('OCREngine', '2'); // Motor 2 es mejor para textos cortos

    console.log('📤 Enviando a OCR.space...');

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    console.log('📥 Respuesta OCR.space:', result);

    if (result.OCRExitCode === 1 && result.ParsedResults?.[0]?.ParsedText) {
      const text = result.ParsedResults[0].ParsedText.trim();
      console.log('✅ Texto extraído:', text);
      return text;
    } else if (result.OCRExitCode === 99) {
      // Error de API (rate limit, key inválida, etc.)
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
 * Extrae matrícula del texto OCR
 * Patrones mejorados para España y formatos comunes
 */
export const extractPlateFromText = (text) => {
  // Limpiar texto agresivamente
  const cleanText = text
    .replace(/[\n\r\s\-_.,:;]/g, '') // Quitar espacios y símbolos
    .toUpperCase()
    .replace(/O/g, '0') // OCR confunde O con 0
    .replace(/[IÍ]/g, '1') // I latina por 1
    .replace(/[SŞ]/g, '5') // S por 5 (a veces)
    .replace(/[ZŽ]/g, '2') // Z por 2
    .replace(/[B]/g, '8') // B por 8 (a veces)
    .replace(/[G]/g, '6'); // G por 6 (a veces)

  console.log('🧹 Texto limpio:', cleanText);

  // Patrones españoles (orden de más específico a más general)
  const patterns = [
    /\d{4}[A-Z]{3}/, // 1234ABC (formato actual español - MÁS COMÚN)
    /\d{4}[BCDFGHJKLMNPRSTVWXYZ]{3}/, // Sin vocales (formato real español)
    /[A-Z]{1,2}\d{4}[A-Z]{1,2}/, // A1234BC (formato antiguo)
    /\d{3,4}[A-Z]{2,4}/, // Más flexible
    /[A-Z0-9]{6,9}/, // Último recurso: 6-9 alfanuméricos
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      console.log('✅ Matrícula encontrada con patrón:', pattern, '→', match[0]);
      return match[0];
    }
  }

  // Si no encuentra nada con patrones, toma los primeros 7 caracteres alfanuméricos
  const fallback = cleanText.replace(/[^A-Z0-9]/g, '').substring(0, 10);
  console.log('⚠️ Sin patrón claro, usando fallback:', fallback);
  return fallback || 'ERROR';
};

/**
 * Función principal: detectar matrícula de imagen
 */
export const detectPlateFromImage = async (imageUri) => {
  try {
    console.log('📸 Procesando imagen:', imageUri);
    
    // Extraer texto con OCR
    const text = await extractTextFromImage(imageUri);
    
    // Extraer matrícula del texto
    const plate = extractPlateFromText(text);
    
    if (plate === 'ERROR' || plate.length < 4) {
      throw new Error('No se detectó una matrícula válida');
    }
    
    return plate;
  } catch (error) {
    console.error('❌ Error detectando matrícula:', error);
    throw error;
  }
};
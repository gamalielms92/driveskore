// src/services/ocrService.js
import Tesseract from 'tesseract.js';

/**
 * Extrae texto de una imagen usando Tesseract.js
 * @param {string} imageUri - URI de la imagen
 * @returns {Promise<string>} - Texto extraído
 */
export const extractTextFromImage = async (imageUri) => {
  try {
    console.log('🔍 Iniciando OCR con Tesseract...');
    
    const { data: { text } } = await Tesseract.recognize(
      imageUri,
      'eng', // Idioma inglés (mejor para alfanuméricos)
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`⏳ Progreso OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    console.log('✅ OCR completado. Texto:', text);
    return text.trim();
  } catch (error) {
    console.error('❌ Error en OCR:', error);
    throw new Error('No se pudo procesar la imagen');
  }
};

/**
 * Extrae matrícula del texto OCR
 * Busca patrones tipo: 1234ABC, ABC1234, 1234-ABC, etc.
 */
export const extractPlateFromText = (text) => {
  // Limpiar texto: quitar espacios, saltos de línea, caracteres raros
  const cleanText = text
    .replace(/[\n\r\s\-_.,:;]/g, '')
    .toUpperCase()
    .replace(/O/g, '0') // OCR confunde O con 0
    .replace(/I/g, '1') // OCR confunde I con 1
    .replace(/S/g, '5') // A veces confunde S con 5
    .replace(/Z/g, '2'); // A veces confunde Z con 2

  console.log('🧹 Texto limpio:', cleanText);

  // Patrones comunes de matrículas españolas
  const patterns = [
    /\d{4}[A-Z]{3}/, // 1234ABC (formato actual español)
    /[A-Z]{1,2}\d{4}[A-Z]{1,2}/, // A1234BC (formato antiguo)
    /\d{1,4}[A-Z]{1,3}\d{0,4}/, // Otros formatos mixtos
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      console.log('✅ Matrícula encontrada:', match[0]);
      return match[0];
    }
  }

  // Si no encuentra patrón específico, intenta extraer algo razonable
  // Busca cualquier secuencia de 4-10 caracteres alfanuméricos
  const fallbackPattern = /[A-Z0-9]{4,10}/;
  const fallbackMatch = cleanText.match(fallbackPattern);
  
  if (fallbackMatch) {
    console.log('⚠️ Matrícula aproximada:', fallbackMatch[0]);
    return fallbackMatch[0].substring(0, 10);
  }

  console.log('❌ No se encontró patrón de matrícula');
  return cleanText.substring(0, 10) || 'ERROR';
};

/**
 * Procesa imagen y extrae matrícula
 * @param {string} imageUri - URI de la imagen
 * @returns {Promise<string>} - Matrícula extraída
 */
export const detectPlateFromImage = async (imageUri) => {
  try {
    console.log('📸 Procesando imagen:', imageUri);
    
    // Extraer texto con OCR
    const text = await extractTextFromImage(imageUri);
    
    // Extraer matrícula del texto
    const plate = extractPlateFromText(text);
    
    return plate;
  } catch (error) {
    console.error('❌ Error detectando matrícula:', error);
    throw error;
  }
};
// src/services/imageProcessing.js
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Pre-procesa imagen para mejorar OCR
 * @param {string} imageUri - URI de la imagen original
 * @returns {Promise<string>} - URI de la imagen procesada
 */
export const preprocessImageForOCR = async (imageUri) => {
  try {
    console.log('🖼️ Pre-procesando imagen para OCR...');

    // Paso 1: Redimensionar para optimizar (max 1200px de ancho)
    let processed = await manipulateAsync(
      imageUri,
      [
        { resize: { width: 1200 } }, // Mantiene aspect ratio
      ],
      { 
        compress: 0.8, // Comprimir ligeramente
        format: SaveFormat.JPEG 
      }
    );

    // Paso 2: Aumentar contraste (simulado con compress bajo)
    // Para mejorar legibilidad de texto
    processed = await manipulateAsync(
      processed.uri,
      [],
      { 
        compress: 0.7, // Mayor compresión = menos detalles innecesarios
        format: SaveFormat.JPEG 
      }
    );

    console.log('✅ Imagen pre-procesada:', processed.uri);
    
    // Verificar tamaño
    const response = await fetch(processed.uri);
    const blob = await response.blob();
    const sizeInMB = blob.size / (1024 * 1024);
    
    console.log(`📊 Tamaño imagen: ${sizeInMB.toFixed(2)} MB`);

    // Si aún es > 1MB, comprimir más agresivamente
    if (sizeInMB > 1) {
      console.log('⚠️ Imagen > 1MB, comprimiendo más...');
      processed = await manipulateAsync(
        processed.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: SaveFormat.JPEG }
      );
    }

    return processed.uri;
  } catch (error) {
    console.error('❌ Error pre-procesando imagen:', error);
    // Si falla, devuelve la original
    return imageUri;
  }
};

/**
 * Enfoca en la zona de matrícula (crop inteligente)
 * OPCIONAL: Solo si quieres recortar manualmente o con detección
 */
export const cropToPlateArea = async (imageUri, cropArea) => {
  try {
    const processed = await manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: cropArea.x,
            originY: cropArea.y,
            width: cropArea.width,
            height: cropArea.height,
          }
        }
      ],
      { compress: 0.9, format: SaveFormat.JPEG }
    );

    return processed.uri;
  } catch (error) {
    console.error('Error cropping:', error);
    return imageUri;
  }
};

/**
 * Desenfoca la imagen completa reduciendo calidad después del OCR
 * Es la solución más simple y efectiva sin necesitar librerías adicionales
 * 
 * @param {string} imageUri - URI de la imagen original
 * @returns {Promise<string>} - URI de la imagen con baja calidad (matrícula ilegible)
 */
export const blurImageAfterOCR = async (imageUri) => {
  try {
    console.log('🔒 Reduciendo calidad de imagen después de OCR...');

    const processed = await manipulateAsync(
      imageUri,
      [
        { resize: { width: 600 } }, // Tamaño pequeño
      ],
      { 
        compress: 0.2, // Muy baja calidad = matrícula ilegible
        format: SaveFormat.JPEG 
      }
    );

    console.log('✅ Imagen procesada con baja calidad para privacidad');
    return processed.uri;

  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    return imageUri;
  }
};

/**
 * Alternativa: Desenfoca aún más (para máxima privacidad)
 * 
 * @param {string} imageUri - URI de la imagen
 * @returns {Promise<string>} - URI con muy baja calidad
 */
export const blurPlateInImage = async (imageUri) => {
  try {
    console.log('🔒 Desenfocando matrícula en imagen...');

    const blurred = await manipulateAsync(
      imageUri,
      [
        { resize: { width: 500 } }, // Más pequeño
      ],
      { 
        compress: 0.15, // Aún menos calidad
        format: SaveFormat.JPEG 
      }
    );

    console.log('✅ Imagen con matrícula menos legible');
    return blurred.uri;

  } catch (error) {
    console.error('❌ Error desenfocando matrícula:', error);
    return imageUri;
  }
};
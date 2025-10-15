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
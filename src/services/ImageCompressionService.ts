// src/services/ImageCompressionService.ts

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';

/**
 * Servicio para gestión de imágenes:
 * - Selección desde galería o cámara
 * - Compresión y redimensionamiento
 * - Validación de formato y tamaño
 * - Subida a Supabase Storage
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1024; // píxeles
const COMPRESSION_QUALITY = 0.8; // 80%
const VALID_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

// ============================================================================
// INTERFACES
// ============================================================================

export interface ImageCompressionResult {
  uri: string;
  width: number;
  height: number;
  size: number; // bytes estimados
}

export interface ImageUploadResult {
  publicUrl: string;
  path: string;
}

export type ImageSource = 'camera' | 'gallery';

// ============================================================================
// SERVICIO
// ============================================================================

export class ImageCompressionService {
  
  /**
   * Solicita permisos de cámara y galería
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraPermission.granted && galleryPermission.granted;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }
  
  /**
   * Selecciona una imagen desde cámara o galería
   */
  static async pickImage(source: ImageSource = 'gallery'): Promise<string | null> {
    try {
      // Verificar permisos
      const hasPermissions = await this.requestPermissions();
      
      if (!hasPermissions) {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a la cámara y galería para continuar'
        );
        return null;
      }
      
      let result: ImagePicker.ImagePickerResult;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      }
      
      if (result.canceled) {
        return null;
      }
      
      return result.assets[0].uri;
      
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
      return null;
    }
  }
  
  /**
   * Valida el formato y tamaño de la imagen
   */
  static async validateImage(uri: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Validar tamaño
      if (blob.size > MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: `Imagen muy grande. Máximo ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        };
      }
      
      // Validar formato
      if (!VALID_FORMATS.includes(blob.type)) {
        return {
          isValid: false,
          error: 'Formato no válido. Solo JPG, PNG o WEBP'
        };
      }
      
      return { isValid: true };
      
    } catch (error) {
      console.error('Error validando imagen:', error);
      return {
        isValid: false,
        error: 'No se pudo validar la imagen'
      };
    }
  }
  
  /**
   * Comprime y redimensiona la imagen
   */
  static async compressImage(uri: string): Promise<ImageCompressionResult> {
    try {
      console.log('🔧 Comprimiendo imagen:', uri);
      
      // Validar antes de comprimir
      const validation = await this.validateImage(uri);
      
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      // Comprimir y redimensionar
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: MAX_WIDTH } }],
        {
          compress: COMPRESSION_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );
      
      console.log('✅ Imagen comprimida:', compressed);
      
      return {
        uri: compressed.uri,
        width: compressed.width,
        height: compressed.height,
        size: Math.round(compressed.width * compressed.height * 0.3) // estimación
      };
      
    } catch (error) {
      console.error('❌ Error comprimiendo imagen:', error);
      throw error;
    }
  }
  
  /**
   * Sube imagen a Supabase Storage
   */
  static async uploadImage(
    compressedUri: string,
    bucket: 'vehicle-photos' | 'user-avatars' | 'feedback-screenshots',
    userId: string,
    additionalPath?: string
  ): Promise<ImageUploadResult> {
    try {
      console.log('📤 Subiendo imagen a bucket:', bucket);
      
      // Generar nombre único
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${userId}/${additionalPath || ''}${timestamp}_${randomStr}.jpg`;
      
      console.log('📁 Nombre de archivo:', fileName);
      
      // Leer archivo como ArrayBuffer (compatible con React Native)
      const response = await fetch(compressedUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Convertir ArrayBuffer a Uint8Array
      const fileData = new Uint8Array(arrayBuffer);
      
      // Subir a Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileData, {
          contentType: 'image/jpeg',
          upsert: false,
          cacheControl: '3600'
        });
      
      if (error) {
        console.error('❌ Error subiendo a Supabase:', error);
        throw error;
      }
      
      console.log('✅ Imagen subida:', data);
      
      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      console.log('🔗 URL pública:', urlData.publicUrl);
      
      return {
        publicUrl: urlData.publicUrl,
        path: fileName
      };
      
    } catch (error) {
      console.error('❌ Error en uploadImage:', error);
      throw error;
    }
  }
  
  /**
   * Elimina imagen de Supabase Storage
   */
  static async deleteImage(
    bucket: 'vehicle-photos' | 'user-avatars' | 'feedback-screenshots',
    path: string
  ): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando imagen:', path);
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) {
        console.error('❌ Error eliminando imagen:', error);
        return false;
      }
      
      console.log('✅ Imagen eliminada correctamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error en deleteImage:', error);
      return false;
    }
  }
  
  /**
   * Flujo completo: seleccionar + comprimir + subir
   */
  static async selectCompressAndUpload(
    source: ImageSource,
    bucket: 'vehicle-photos' | 'user-avatars',
    userId: string,
    additionalPath?: string
  ): Promise<ImageUploadResult | null> {
    try {
      // 1. Seleccionar imagen
      const selectedUri = await this.pickImage(source);
      
      if (!selectedUri) {
        return null;
      }
      
      // 2. Comprimir
      const compressed = await this.compressImage(selectedUri);
      
      // 3. Subir
      const uploaded = await this.uploadImage(
        compressed.uri,
        bucket,
        userId,
        additionalPath
      );
      
      return uploaded;
      
    } catch (error) {
      console.error('❌ Error en flujo completo:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen');
      return null;
    }
  }
}

export default ImageCompressionService;
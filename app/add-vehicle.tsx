// app/add-vehicle.tsx

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../src/config/supabase';
import ImageCompressionService from '../src/services/ImageCompressionService';
import VehicleValidationService from '../src/services/VehicleValidationService';
import { detectPlateFromImage } from '../src/services/ocrService';
import { VEHICLE_BRANDS, VEHICLE_COLORS, type VehicleFormData } from '../src/types/vehicle';
import { isBlacklisted, normalizePlate, validateSpanishPlate } from '../src/utils/plateValidator';

export default function AddVehicleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [plateValidation, setPlateValidation] = useState<any>(null);
  
  // Form data
  const [formData, setFormData] = useState<VehicleFormData>({
    vehicle_photo_url: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    vehicle_type: 'car',
    plate: '',
    serial_number: '',
    nickname: '',
    is_primary: false
  });

  const handlePhotoSelect = async (source: 'camera' | 'gallery') => {
    try {
      setUploadingPhoto(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      // Seleccionar imagen
      const selectedUri = await ImageCompressionService.pickImage(source);
      
      if (!selectedUri) {
        setUploadingPhoto(false);
        return;
      }
      
      // Comprimir imagen
      const compressed = await ImageCompressionService.compressImage(selectedUri);
      
      // Si es coche o moto, intentar OCR ANTES de subir
      if ((formData.vehicle_type === 'car' || formData.vehicle_type === 'motorcycle') && !formData.plate) {
        Alert.alert(
          '🔍 Detectando matrícula...',
          'Analizando la imagen para detectar la matrícula automáticamente'
        );
        
        try {
          const detectedPlate = await detectPlateFromImage(compressed.uri);
          
          if (detectedPlate && detectedPlate !== 'ERROR') {
            const validation = validateSpanishPlate(detectedPlate);
            
            if (validation.isValid && !isBlacklisted(detectedPlate)) {
              setFormData(prev => ({ ...prev, plate: detectedPlate }));
              setPlateValidation(validation);
              
              Alert.alert(
                '✅ ¡Matrícula detectada!',
                `Se detectó: ${detectedPlate}\n\nPuedes editarla si es incorrecta antes de guardar.`
              );
            }
          }
        } catch (ocrError) {
          console.log('ℹ️ No se pudo detectar matrícula automáticamente:', ocrError);
          // No mostrar error, el usuario puede introducirla manualmente
        }
      }
      
      // Subir imagen
      const uploaded = await ImageCompressionService.uploadImage(
        compressed.uri,
        'vehicle-photos',
        user.id,
        'vehicles/'
      );
      
      setFormData(prev => ({ ...prev, vehicle_photo_url: uploaded.publicUrl }));
      
      Alert.alert(
        '✅ Foto añadida', 
        formData.plate 
          ? 'La foto se ha subido correctamente'
          : 'Foto subida. Recuerda introducir la matrícula manualmente si no se detectó.'
      );
      
    } catch (error: any) {
      console.error('Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePlateChange = (text: string) => {
    const cleanText = text.toUpperCase().replace(/[^A-Z0-9\s-]/g, '');
    setFormData(prev => ({ ...prev, plate: cleanText }));
    
    // Validar en tiempo real
    if (cleanText.length >= 4) {
      const validation = validateSpanishPlate(cleanText);
      setPlateValidation(validation);
    } else {
      setPlateValidation(null);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Validar formulario
      const validation = VehicleValidationService.validateVehicleForm(formData);
      
      if (!validation.isValid) {
        Alert.alert(
          'Datos incompletos',
          validation.errors.join('\n')
        );
        setLoading(false);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        setLoading(false);
        return;
      }
      
      // ✅ NORMALIZAR matrícula (sin espacios ni guiones)
      const plateNormalized = formData.plate 
        ? normalizePlate(formData.plate)
        : null;
      
      // Si es el primer vehículo, marcarlo como primary y online
      const { data: existingVehicles } = await supabase
        .from('user_vehicles')
        .select('id')
        .eq('user_id', user.id);
      
      const isFirstVehicle = !existingVehicles || existingVehicles.length === 0;
      
      // Si se marca como primary, desmarcar los demás
      if (formData.is_primary || isFirstVehicle) {
        await supabase
          .from('user_vehicles')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }
      
      // Insertar vehículo
      const { error } = await supabase
        .from('user_vehicles')
        .insert({
          user_id: user.id,
          plate: plateNormalized, // ✅ SIN espacios ni guiones
          nickname: formData.nickname?.trim() || null,
          online: isFirstVehicle, // Primer vehículo activo por defecto
          vehicle_photo_url: formData.vehicle_photo_url,
          brand: formData.brand.trim(),
          model: formData.model.trim(),
          year: formData.year,
          color: formData.color,
          vehicle_type: formData.vehicle_type,
          serial_number: formData.serial_number?.trim() || null,
          is_primary: formData.is_primary || isFirstVehicle
        });
      
      if (error) throw error;
      
      Alert.alert(
        '✅ Vehículo añadido',
        `${formData.brand} ${formData.model} registrado correctamente`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error: any) {
      console.error('Error añadiendo vehículo:', error);
      Alert.alert('Error', error.message || 'No se pudo añadir el vehículo');
    } finally {
      setLoading(false);
    }
  };

  const currentBrands = VEHICLE_BRANDS[formData.vehicle_type];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>🚗 Añadir Vehículo</Text>
          <Text style={styles.subtitle}>
            Completa todos los campos para registrar tu vehículo
          </Text>

          {/* Foto del vehículo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              📷 Foto del vehículo <Text style={styles.required}>*</Text>
            </Text>
            
            {formData.vehicle_photo_url ? (
              <View style={styles.photoPreview}>
                <Image
                  source={{ uri: formData.vehicle_photo_url }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={() => setFormData(prev => ({ ...prev, vehicle_photo_url: '' }))}
                >
                  <Text style={styles.changePhotoText}>Cambiar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handlePhotoSelect('camera')}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#007AFF" />
                  ) : (
                    <>
                      <Text style={styles.photoButtonIcon}>📷</Text>
                      <Text style={styles.photoButtonText}>Tomar foto</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handlePhotoSelect('gallery')}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#007AFF" />
                  ) : (
                    <>
                      <Text style={styles.photoButtonIcon}>🖼️</Text>
                      <Text style={styles.photoButtonText}>Galería</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tipo de vehículo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🚗 Tipo de vehículo <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.typeButtons}>
              {(['car', 'motorcycle', 'bike', 'scooter'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.vehicle_type === type && styles.typeButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, vehicle_type: type }))}
                >
                  <Text style={styles.typeButtonIcon}>
                    {type === 'car' && '🚗'}
                    {type === 'motorcycle' && '🏍️'}
                    {type === 'bike' && '🚲'}
                    {type === 'scooter' && '🛴'}
                  </Text>
                  <Text style={[
                    styles.typeButtonText,
                    formData.vehicle_type === type && styles.typeButtonTextActive
                  ]}>
                    {type === 'car' && 'Coche'}
                    {type === 'motorcycle' && 'Moto'}
                    {type === 'bike' && 'Bici'}
                    {type === 'scooter' && 'Patinete'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Marca */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🏭 Marca <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.brandsScroll}
            >
              {currentBrands.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={[
                    styles.brandButton,
                    formData.brand === brand && styles.brandButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, brand }))}
                >
                  <Text style={[
                    styles.brandButtonText,
                    formData.brand === brand && styles.brandButtonTextActive
                  ]}>
                    {brand}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Modelo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🚙 Modelo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Ibiza, Civic, Mountain Bike..."
              value={formData.model}
              onChangeText={(text) => setFormData(prev => ({ ...prev, model: text }))}
              maxLength={50}
            />
          </View>

          {/* Año */}
          <View style={styles.section}>
            <Text style={styles.label}>
              📅 Año <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 2020"
              value={formData.year?.toString() || ''}
              onChangeText={(text) => {
                const year = parseInt(text);
                if (!isNaN(year) || text === '') {
                  setFormData(prev => ({ ...prev, year: year || new Date().getFullYear() }));
                }
              }}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🎨 Color <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.colorsScroll}
            >
              {VEHICLE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    formData.color === color && styles.colorButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, color }))}
                >
                  <Text style={[
                    styles.colorButtonText,
                    formData.color === color && styles.colorButtonTextActive
                  ]}>
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Matrícula o Número de Serie */}
          {(formData.vehicle_type === 'car' || formData.vehicle_type === 'motorcycle') ? (
            <View style={styles.section}>
              <Text style={styles.label}>
                🚙 Matrícula <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.plateInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    plateValidation?.isValid && !isBlacklisted(formData.plate) && styles.inputValid,
                    plateValidation && !plateValidation.isValid && styles.inputInvalid
                  ]}
                  placeholder="Ej: 1234ABC"
                  value={formData.plate}
                  onChangeText={handlePlateChange}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                {formData.plate && (
                  <View style={styles.plateValidationIcon}>
                    <Text style={styles.plateValidationIconText}>
                      {plateValidation?.isValid && !isBlacklisted(formData.plate) ? '✅' : '❌'}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Feedback de validación */}
              {plateValidation && formData.plate && (
                <>
                  {plateValidation.isValid && !isBlacklisted(formData.plate) ? (
                    <View style={styles.validationSuccess}>
                      <Text style={styles.validationSuccessText}>
                        ✓ Matrícula válida ({plateValidation.format === 'current' ? 'Formato actual' : 'Formato provincial'})
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.validationError}>
                      <Text style={styles.validationErrorText}>
                        {isBlacklisted(formData.plate) 
                          ? '✗ Combinación de letras no permitida por la DGT'
                          : '✗ Formato inválido. Ejemplo: 1234ABC o M1234BC'}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>
                  🚙 Matrícula (opcional)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Si tiene matrícula"
                  value={formData.plate}
                  onChangeText={handlePlateChange}
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>
                  🔢 Número de Serie (opcional)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: WBY12345678"
                  value={formData.serial_number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, serial_number: text }))}
                  maxLength={30}
                />
              </View>
            </>
          )}

          {/* Apodo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              ✏️ Apodo (opcional)
            </Text>
            <TextInput
              style={styles.input}
              placeholder='Ej: "Mi primer coche"'
              value={formData.nickname}
              onChangeText={(text) => setFormData(prev => ({ ...prev, nickname: text }))}
              maxLength={50}
            />
          </View>

          {/* Botón submit */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>✅ Añadir Vehículo</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  required: {
    color: '#FF3B30',
  },
  photoPreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
  },
  changePhotoButton: {
    padding: 10,
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  photoButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  typeButtonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  typeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#007AFF',
  },
  brandsScroll: {
    flexDirection: 'row',
  },
  brandButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  brandButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  brandButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  brandButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputValid: {
    borderColor: '#34C759',
    borderWidth: 2,
  },
  inputInvalid: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  colorsScroll: {
    flexDirection: 'row',
  },
  colorButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  colorButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  colorButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  colorButtonTextActive: {
    color: '#fff',
  },
  plateInputContainer: {
    position: 'relative',
  },
  plateValidationIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  plateValidationIconText: {
    fontSize: 20,
  },
  validationSuccess: {
    backgroundColor: '#D4EDDA',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  validationSuccessText: {
    color: '#155724',
    fontSize: 13,
  },
  validationError: {
    backgroundColor: '#F8D7DA',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  validationErrorText: {
    color: '#721C24',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
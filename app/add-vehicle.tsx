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
import { isBlacklisted, validateSpanishPlate } from '../src/utils/plateValidator';

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
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      // Formatear matrícula si existe
      const plateFormatted = formData.plate 
        ? VehicleValidationService.formatPlate(formData.plate)
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
          plate: plateFormatted,
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
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.photoChangeButton}
                  onPress={() => handlePhotoSelect('gallery')}
                >
                  <Text style={styles.photoChangeButtonText}>Cambiar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handlePhotoSelect('camera')}
                  disabled={uploadingPhoto}
                >
                  <Text style={styles.photoButtonIcon}>📸</Text>
                  <Text style={styles.photoButtonText}>Tomar foto</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handlePhotoSelect('gallery')}
                  disabled={uploadingPhoto}
                >
                  <Text style={styles.photoButtonIcon}>🖼️</Text>
                  <Text style={styles.photoButtonText}>Desde galería</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {uploadingPhoto && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.uploadingText}>Subiendo foto...</Text>
              </View>
            )}
          </View>

          {/* Tipo de vehículo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🚦 Tipo de vehículo <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.vehicle_type === 'car' && styles.typeButtonActive
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  vehicle_type: 'car',
                  brand: '', // Reset marca al cambiar tipo
                }))}
              >
                <Text style={[
                  styles.typeButtonIcon,
                  formData.vehicle_type === 'car' && styles.typeButtonIconActive
                ]}>🚗</Text>
                <Text style={[
                  styles.typeButtonText,
                  formData.vehicle_type === 'car' && styles.typeButtonTextActive
                ]}>Coche</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.vehicle_type === 'motorcycle' && styles.typeButtonActive
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  vehicle_type: 'motorcycle',
                  brand: '',
                }))}
              >
                <Text style={[
                  styles.typeButtonIcon,
                  formData.vehicle_type === 'motorcycle' && styles.typeButtonIconActive
                ]}>🏍️</Text>
                <Text style={[
                  styles.typeButtonText,
                  formData.vehicle_type === 'motorcycle' && styles.typeButtonTextActive
                ]}>Moto</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.vehicle_type === 'bike' && styles.typeButtonActive
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  vehicle_type: 'bike',
                  brand: '',
                }))}
              >
                <Text style={[
                  styles.typeButtonIcon,
                  formData.vehicle_type === 'bike' && styles.typeButtonIconActive
                ]}>🚲</Text>
                <Text style={[
                  styles.typeButtonText,
                  formData.vehicle_type === 'bike' && styles.typeButtonTextActive
                ]}>Bicicleta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.vehicle_type === 'scooter' && styles.typeButtonActive
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  vehicle_type: 'scooter',
                  brand: '',
                }))}
              >
                <Text style={[
                  styles.typeButtonIcon,
                  formData.vehicle_type === 'scooter' && styles.typeButtonIconActive
                ]}>🛴</Text>
                <Text style={[
                  styles.typeButtonText,
                  formData.vehicle_type === 'scooter' && styles.typeButtonTextActive
                ]}>Patinete</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Marca */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🏭 Marca <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.brandGrid}>
              {currentBrands.map(brand => (
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
            </View>
            {formData.brand && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓ Seleccionado: {formData.brand}</Text>
              </View>
            )}
          </View>

          {/* Modelo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🚗 Modelo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Ibiza, FX 3, M365..."
              value={formData.model}
              onChangeText={(text) => setFormData(prev => ({ ...prev, model: text }))}
            />
          </View>

          {/* Año */}
          <View style={styles.section}>
            <Text style={styles.label}>
              📅 Año <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="2020"
              keyboardType="number-pad"
              value={formData.year.toString()}
              onChangeText={(text) => {
                const year = parseInt(text) || new Date().getFullYear();
                setFormData(prev => ({ ...prev, year }));
              }}
              maxLength={4}
            />
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={styles.label}>
              🎨 Color <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.colorGrid}>
              {VEHICLE_COLORS.map(color => (
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
            </View>
            {formData.color && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓ Seleccionado: {formData.color}</Text>
              </View>
            )}
          </View>

          {/* Matrícula (condicional) */}
          {(formData.vehicle_type === 'car' || formData.vehicle_type === 'motorcycle' || formData.plate) && (
            <View style={styles.section}>
              <Text style={styles.label}>
                🚙 Matrícula {(formData.vehicle_type === 'car' || formData.vehicle_type === 'motorcycle') && <Text style={styles.required}>*</Text>}
              </Text>
              
              {/* Info sobre detección automática */}
              {(formData.vehicle_type === 'car' || formData.vehicle_type === 'motorcycle') && !formData.plate && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoIcon}>💡</Text>
                  <Text style={styles.infoText}>
                    La matrícula se detectará automáticamente al subir la foto del vehículo
                  </Text>
                </View>
              )}
              
              {/* Input con validación visual */}
              <View style={styles.plateInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    plateValidation && (plateValidation.isValid && !isBlacklisted(formData.plate || '')
                      ? styles.inputValid
                      : styles.inputInvalid
                    )
                  ]}
                  placeholder="1234ABC (se detecta automáticamente)"
                  value={formData.plate}
                  onChangeText={handlePlateChange}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                {plateValidation && formData.plate && (
                  <View style={styles.validationIcon}>
                    <Text style={styles.validationIconText}>
                      {plateValidation.isValid && !isBlacklisted(formData.plate) ? '✅' : '❌'}
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
                          ? `✗ La combinación "${plateValidation.letters}" no es válida según la DGT`
                          : '✗ Formato de matrícula no válido'}
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              <Text style={styles.hint}>Formato válido: 1234ABC o M-1234-BC</Text>
            </View>
          )}

          {/* Número de serie (para bicis/patinetes) */}
          {(formData.vehicle_type === 'bike' || formData.vehicle_type === 'scooter') && (
            <View style={styles.section}>
              <Text style={styles.label}>
                🔢 Número de serie {!formData.plate && <Text style={styles.required}>*</Text>}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="TK-123456 o similar"
                value={formData.serial_number}
                onChangeText={(text) => setFormData(prev => ({ ...prev, serial_number: text }))}
                autoCapitalize="characters"
                maxLength={30}
              />
              <Text style={styles.hint}>Puedes encontrarlo en el cuadro de la bici o patinete</Text>
            </View>
          )}

          {/* Apodo (opcional) */}
          <View style={styles.section}>
            <Text style={styles.label}>✏️ Apodo (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Mi coche, La bici roja..."
              value={formData.nickname}
              onChangeText={(text) => setFormData(prev => ({ ...prev, nickname: text }))}
              maxLength={50}
            />
          </View>

          {/* Marcarlo como principal */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setFormData(prev => ({ ...prev, is_primary: !prev.is_primary }))}
          >
            <View style={[styles.checkbox, formData.is_primary && styles.checkboxChecked]}>
              {formData.is_primary && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Marcar como vehículo principal</Text>
          </TouchableOpacity>

          {/* Botón de envío */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>✅ Añadir Vehículo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
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
    lineHeight: 22,
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
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  typeButtonIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  typeButtonIconActive: {
    // Mantener mismo tamaño
  },
  typeButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  brandButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: '30%',
  },
  brandButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  brandButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  brandButtonTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '28%',
  },
  colorButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  colorButtonText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  colorButtonTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  selectedBadge: {
    marginTop: 10,
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
  },
  selectedBadgeText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  plateInputContainer: {
    position: 'relative',
  },
  inputValid: {
    borderColor: '#34C759',
    borderWidth: 2,
  },
  inputInvalid: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  validationIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  validationIconText: {
    fontSize: 24,
  },
  validationSuccess: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  validationSuccessText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  validationError: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  validationErrorText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  photoButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  photoChangeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  photoChangeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1565C0',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
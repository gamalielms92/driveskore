// app/edit-profile.tsx

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

interface UserProfileData {
  full_name: string;
  avatar_url: string;
  bio: string;
  phone: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    full_name: '',
    avatar_url: '',
    bio: '',
    phone: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        router.back();
        return;
      }

      setUserId(user.id);
      setEmail(user.email || '');

      // Cargar perfil existente
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      if (profile) {
        setProfileData({
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url || '',
          bio: profile.bio || '',
          phone: profile.phone || ''
        });
      }

    } catch (error: any) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = async (source: 'camera' | 'gallery') => {
    try {
      setUploadingPhoto(true);
      
      const result = await ImageCompressionService.selectCompressAndUpload(
        source,
        'user-avatars',
        userId
      );
      
      if (result) {
        setProfileData(prev => ({ ...prev, avatar_url: result.publicUrl }));
        Alert.alert('✅ Foto actualizada', 'Tu foto de perfil se ha actualizado');
      }
      
    } catch (error: any) {
      console.error('Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validar nombre obligatorio
      if (!profileData.full_name.trim()) {
        Alert.alert('Error', 'El nombre completo es obligatorio');
        return;
      }

      // Verificar si ya existe un perfil
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        // Actualizar
        const { error } = await supabase
          .from('user_profiles')
          .update({
            full_name: profileData.full_name.trim(),
            avatar_url: profileData.avatar_url || null,
            bio: profileData.bio.trim() || null,
            phone: profileData.phone.trim() || null,
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            full_name: profileData.full_name.trim(),
            avatar_url: profileData.avatar_url || null,
            bio: profileData.bio.trim() || null,
            phone: profileData.phone.trim() || null,
          });

        if (error) throw error;
      }

      Alert.alert(
        '✅ Perfil guardado',
        'Tu perfil se ha actualizado correctamente',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );

    } catch (error: any) {
      console.error('Error guardando perfil:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>✏️ Editar Perfil</Text>
          <Text style={styles.subtitle}>
            Completa tu información para que otros conductores te conozcan
          </Text>

          {/* Foto de perfil */}
          <View style={styles.section}>
            <Text style={styles.label}>📷 Foto de perfil</Text>
            
            <View style={styles.avatarContainer}>
              {profileData.avatar_url ? (
                <Image
                  source={{ uri: profileData.avatar_url }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {profileData.full_name ? profileData.full_name.charAt(0).toUpperCase() : '👤'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => handlePhotoSelect('camera')}
                disabled={uploadingPhoto}
              >
                <Text style={styles.photoButtonText}>📸 Cámara</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => handlePhotoSelect('gallery')}
                disabled={uploadingPhoto}
              >
                <Text style={styles.photoButtonText}>🖼️ Galería</Text>
              </TouchableOpacity>
            </View>

            {uploadingPhoto && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.uploadingText}>Subiendo foto...</Text>
              </View>
            )}
          </View>

          {/* Email (solo lectura) */}
          <View style={styles.section}>
            <Text style={styles.label}>📧 Email</Text>
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyText}>{email}</Text>
            </View>
            <Text style={styles.hint}>El email no se puede cambiar</Text>
          </View>

          {/* Nombre completo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              👤 Nombre completo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Juan Pérez García"
              value={profileData.full_name}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, full_name: text }))}
              maxLength={100}
            />
            <Text style={styles.hint}>
              Este nombre se mostrará cuando otros te valoren
            </Text>
          </View>

          {/* Biografía */}
          <View style={styles.section}>
            <Text style={styles.label}>📝 Biografía (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cuéntanos sobre ti..."
              value={profileData.bio}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, bio: text }))}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.hint}>
              {profileData.bio.length}/500 caracteres
            </Text>
          </View>

          {/* Teléfono */}
          <View style={styles.section}>
            <Text style={styles.label}>📱 Teléfono (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+34 600 000 000"
              value={profileData.phone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>

          {/* Botones */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>✅ Guardar Perfil</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: '#999',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  photoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1565C0',
  },
  readOnlyContainer: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
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
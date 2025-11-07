// app/(tabs)/help.tsx

import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/config/supabase';
import FeedbackService from '../../src/services/FeedbackService';
import type { FeedbackCategory } from '../../src/types/feedback.ts';

export default function HelpScreen() {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // URL del Google Form de entrevista beta-tester
  const SURVEY_URL = 'https://forms.gle/G16m1EzigDWyJFQH8';

  // Cargar email del usuario autenticado
  useEffect(() => {
    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
    }
  };

  /**
   * Abrir formulario de entrevista en el navegador
   */
  const openSurvey = async () => {
    try {
      const canOpen = await Linking.canOpenURL(SURVEY_URL);
      if (canOpen) {
        await Linking.openURL(SURVEY_URL);
      } else {
        Alert.alert(
          'Error',
          'No se pudo abrir el enlace. Por favor, intenta desde un navegador.'
        );
      }
    } catch (error) {
      console.error('Error abriendo encuesta:', error);
      Alert.alert('Error', 'No se pudo abrir la encuesta');
    }
  };

  /**
   * Seleccionar imagen de la galería
   */
  const pickImage = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Necesitamos acceso a tu galería para adjuntar capturas.'
        );
        return;
      }

      // Abrir selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Comprimir para reducir tamaño
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].uri);
        console.log('📸 Imagen seleccionada:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  /**
   * Quitar imagen seleccionada
   */
  const removeImage = () => {
    setScreenshot(null);
  };

  /**
   * Enviar feedback
   */
  const handleSubmit = async () => {
    // Validaciones
    if (!description.trim()) {
      Alert.alert('Campo requerido', 'Por favor, describe tu feedback');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert(
        'Descripción muy corta',
        'Por favor, proporciona más detalles (mínimo 10 caracteres)'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await FeedbackService.submitFeedback({
        category,
        description: description.trim(),
        user_email: userEmail,
        screenshot_uri: screenshot || undefined,
      });

      setLoading(false);

      if (result.success) {
        Alert.alert(
          '¡Gracias! 🎉',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                // Limpiar formulario
                setDescription('');
                setScreenshot(null);
                setCategory('bug');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo enviar el feedback. Intenta de nuevo.');
      console.error('Error enviando feedback:', error);
    }
  };

  /**
   * Renderizar categoría
   */
  const renderCategoryButton = (
    cat: FeedbackCategory,
    icon: string,
    label: string
  ) => {
    const isSelected = category === cat;
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          isSelected && styles.categoryButtonActive,
        ]}
        onPress={() => setCategory(cat)}
      >
        <Text style={styles.categoryIcon}>{icon}</Text>
        <Text
          style={[
            styles.categoryLabel,
            isSelected && styles.categoryLabelActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 🆕 BANNER DE ENTREVISTA BETA-TESTER */}
        <View style={styles.surveyBanner}>
          <Text style={styles.surveyIcon}>📋</Text>
          <Text style={styles.surveyTitle}>Encuesta Beta-Tester</Text>
          <Text style={styles.surveyDescription}>
            Tu opinión es clave para mi TFM. Completa esta breve encuesta sobre tu experiencia con DriveSkore.
          </Text>
          <View style={styles.surveyMetadata}>
            <Text style={styles.surveyDuration}>⏱️ Duración: 5 minutos </Text>
            <Text style={styles.surveyReward}>🙏 Ayúdame por favor</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.surveyButton}
            onPress={openSurvey}
          >
            <Text style={styles.surveyButtonText}>✓ Completar Encuesta</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ayuda y Feedback</Text>
          <Text style={styles.subtitle}>
            Reporta problemas, sugiere mejoras o comparte tu opinión
          </Text>
        </View>

        {/* Categorías */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de feedback</Text>
          <View style={styles.categoryContainer}>
            {renderCategoryButton('bug', '🐛', 'Bug')}
            {renderCategoryButton('suggestion', '💡', 'Propuesta')}
            {renderCategoryButton('other', '📝', 'Otro')}
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Descripción <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textarea}
            placeholder={
              category === 'bug'
                ? 'Describe el problema que encontraste...'
                : category === 'suggestion'
                ? 'Cuéntanos tu idea de mejora...'
                : 'Escribe tu comentario...'
            }
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.characterCount}>
            {description.length}/1000 caracteres
          </Text>
        </View>

        {/* Email de contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email de contacto (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            value={userEmail}
            onChangeText={setUserEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Captura de pantalla */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Captura de pantalla (opcional)</Text>
          
          {screenshot ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: screenshot }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={removeImage}
              >
                <Text style={styles.removeImageText}>✕ Quitar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadIcon}>📸</Text>
              <Text style={styles.uploadText}>Adjuntar captura</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón de envío */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>📤 Enviar Feedback</Text>
          )}
        </TouchableOpacity>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Tu feedback nos ayuda a mejorar DriveSkore. Incluimos automáticamente
            información técnica de tu dispositivo para resolver problemas más rápido.
          </Text>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Cómo funciona la evaluación?</Text>
            <Text style={styles.faqAnswer}>
              Escanea matrículas con OCR, el sistema identifica al conductor y tú
              evalúas su comportamiento. Las puntuaciones se agregan en su perfil público.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Mi ubicación es privada?</Text>
            <Text style={styles.faqAnswer}>
              Sí. Solo se usa temporalmente para matching. No se almacenan rutas
              ni historial de ubicaciones.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Puedo editar mis evaluaciones?</Text>
            <Text style={styles.faqAnswer}>
              Por ahora no, para evitar manipulación. Si cometiste un error,
              repórtalo usando este formulario.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>DriveSkore v1.0.0</Text>
          <Text style={styles.footerText}>TFM - Ingeniería Informática</Text>
          <Text style={styles.footerText}>Universidad de Huelva</Text>
          <Text style={styles.footerText}>Gamaliel Moreno Sánchez</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  surveyBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  surveyIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  surveyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 12,
  },
  surveyDescription: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  surveyMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
  },
  surveyDuration: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  surveyReward: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
    textAlign: 'center',
  },
  surveyButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  surveyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  required: {
    color: '#FF3B30',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  textarea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 150,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
  },
  uploadIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#A8E6CF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});
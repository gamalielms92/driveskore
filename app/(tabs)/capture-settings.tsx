// app/(tabs)/capture-settings.tsx
// ✅ VERSIÓN CORREGIDA: Solo configura, no inicia servicios

import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// ✅ IMPORTANTE: Usar los componentes de Settings, NO los Control
import ABShutterSettings from '../../src/components/CaptureSettingsControls/ABShutterSettings';
import FloatingButtonSettings from '../../src/components/CaptureSettingsControls/FloatingButtonSettings';

export default function CaptureSettingsScreen() {
  const router = useRouter();

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.webMessage}>
          La configuración de captura solo está disponible en la app móvil
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar Métodos de Captura</Text>
      </View>

      {/* Info General */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>⚙️</Text>
        <Text style={styles.infoText}>
          Configura qué métodos quieres usar para capturar eventos. 
          Se activarán automáticamente al iniciar el Modo Conductor.
        </Text>
      </View>

      {/* Método 1: Botón Flotante */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🎯</Text>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Botón Flotante</Text>
            <Text style={styles.sectionSubtitle}>Aparece sobre todas las apps</Text>
          </View>
        </View>
        <FloatingButtonSettings />
      </View>

      {/* Método 2: AB Shutter 3 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🎮</Text>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>AB Shutter 3</Text>
            <Text style={styles.sectionSubtitle}>Mando Bluetooth (~5€)</Text>
          </View>
        </View>
        <ABShutterSettings />
      </View>

      {/* Nota importante */}
      <View style={styles.noteBox}>
        <Text style={styles.noteIcon}>💡</Text>
        <View style={styles.noteContent}>
          <Text style={styles.noteTitle}>Nota Importante</Text>
          <Text style={styles.noteText}>
            Los métodos seleccionados se activarán automáticamente cuando 
            inicies el Modo Conductor. Puedes usar ambos métodos simultáneamente.
          </Text>
        </View>
      </View>

      {/* Footer espaciador */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  webMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
    paddingHorizontal: 20,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  noteIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
});
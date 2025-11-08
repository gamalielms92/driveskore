// src/components/CaptureSettingsControls/ABShutterSettings.tsx
// Componente SOLO para configuración (no inicia el servicio, solo guarda preferencia)

import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import CapturePreferencesService from '../../services/CapturePreferencesService';

export default function ABShutterSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    setIsLoading(true);
    
    // Cargar preferencia guardada
    const savedPreference = await CapturePreferencesService.getABShutter3Enabled();
    setIsEnabled(savedPreference);
    
    setIsLoading(false);
  };

  const handleToggle = async (value: boolean) => {
    // Guardar preferencia
    setIsEnabled(value);
    await CapturePreferencesService.setABShutter3Enabled(value);
    console.log(`💾 Preferencia AB Shutter 3: ${value}`);
    
    // Mostrar feedback
    if (value) {
      Alert.alert(
        '✅ Configuración Guardada',
        'El AB Shutter 3 se activará cuando inicies el Modo Conductor.\n\nAsegúrate de que esté emparejado por Bluetooth.',
        [{ text: 'Entendido' }]
      );
    }
  };

  const openPairingInstructions = () => {
    Alert.alert(
      '🔵 Cómo Emparejar',
      '1. Enciende tu AB Shutter 3\n' +
      '2. Ve a Ajustes → Bluetooth\n' +
      '3. Busca "AB Shutter 3"\n' +
      '4. Toca para emparejar\n\n' +
      '¿Abrir configuración Bluetooth?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Abrir Ajustes',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            }
          }
        }
      ]
    );
  };

  const openBuyGuide = () => {
    Alert.alert(
      '🛒 Dónde Comprar',
      'Busca "AB Shutter 3" o "Mando Selfie Bluetooth" en:\n\n' +
      '• Amazon (~5-10€)\n' +
      '• AliExpress (~3-5€)\n' +
      '• Tiendas de electrónica\n\n' +
      'Cualquier mando de selfie Bluetooth sirve.',
      [{ text: 'Entendido' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Switch de activación */}
      <View style={styles.switchRow}>
        <View style={styles.switchLeft}>
          <Text style={styles.switchLabel}>Activar en Modo Conductor</Text>
          <Text style={styles.switchDescription}>
            Escuchará presiones del mando Bluetooth
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      {/* Botones de ayuda */}
      <View style={styles.helpButtons}>
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={openPairingInstructions}
        >
          <Text style={styles.helpButtonIcon}>🔗</Text>
          <Text style={styles.helpButtonText}>Emparejar</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.helpButton}
          onPress={openBuyGuide}
        >
          <Text style={styles.helpButtonIcon}>🛒</Text>
          <Text style={styles.helpButtonText}>Comprar</Text>
        </TouchableOpacity>
      </View>

      {/* Información */}
      {isEnabled && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Cómo funcionará:</Text>
          <Text style={styles.infoText}>
            • Se activará al iniciar el Modo Conductor{'\n'}
            • Presiona Vol+ o Vol- para capturar{'\n'}
            • El mando debe estar emparejado{'\n'}
            • Funciona en segundo plano
          </Text>
        </View>
      )}

      {/* Características */}
      <View style={styles.featuresBox}>
        <Text style={styles.featuresTitle}>✨ Ventajas</Text>
        <Text style={styles.featureItem}>• No necesitas tocar la pantalla</Text>
        <Text style={styles.featureItem}>• Funciona con guantes</Text>
        <Text style={styles.featureItem}>• Batería dura meses</Text>
        <Text style={styles.featureItem}>• Muy económico (~5€)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLeft: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  helpButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 8,
  },
  helpButtonIcon: {
    fontSize: 16,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
  },
  featuresBox: {
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 13,
    color: '#6A1B9A',
    lineHeight: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
});
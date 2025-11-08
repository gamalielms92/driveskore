// src/components/CaptureSettingsControls/FloatingButtonSettings.tsx
// Componente SOLO para configuración (no inicia el servicio, solo guarda preferencia)

import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import CapturePreferencesService from '../../services/CapturePreferencesService';
import FloatingButtonNative from '../../services/FloatingButtonNative';

export default function FloatingButtonSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    setIsLoading(true);
    
    // Cargar preferencia guardada
    const savedPreference = await CapturePreferencesService.getFloatingButtonEnabled();
    setIsEnabled(savedPreference);
    
    // Verificar permiso
    if (Platform.OS === 'android') {
      const permission = await FloatingButtonNative.checkPermission();
      setHasPermission(permission);
    }
    
    setIsLoading(false);
  };

  const handleToggle = async (value: boolean) => {
    // Si no hay permiso y se intenta activar, pedir permiso primero
    if (value && !hasPermission && Platform.OS === 'android') {
      Alert.alert(
        '🔐 Permiso Requerido',
        'DriveSkore necesita permiso para mostrar el botón flotante sobre otras aplicaciones.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Conceder Permiso', 
            onPress: async () => {
              FloatingButtonNative.requestPermission();
              // Esperar un poco y volver a verificar
              setTimeout(async () => {
                const newPermission = await FloatingButtonNative.checkPermission();
                setHasPermission(newPermission);
                if (newPermission) {
                  setIsEnabled(true);
                  await CapturePreferencesService.setFloatingButtonEnabled(true);
                }
              }, 2000);
            }
          }
        ]
      );
      return;
    }
    
    // Guardar preferencia
    setIsEnabled(value);
    await CapturePreferencesService.setFloatingButtonEnabled(value);
    console.log(`💾 Preferencia botón flotante: ${value}`);
    
    // Mostrar feedback
    if (value) {
      Alert.alert(
        '✅ Configuración Guardada',
        'El botón flotante se activará cuando inicies el Modo Conductor',
        [{ text: 'Entendido' }]
      );
    }
  };

  const requestPermission = () => {
    Alert.alert(
      '🔐 Configurar Permiso',
      'Para usar el botón flotante necesitas conceder permisos.\n\nSe abrirá la configuración del sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Abrir Configuración', 
          onPress: async () => {
            FloatingButtonNative.requestPermission();
            setTimeout(async () => {
              const permission = await FloatingButtonNative.checkPermission();
              setHasPermission(permission);
            }, 2000);
          }
        }
      ]
    );
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableIcon}>⚠️</Text>
          <Text style={styles.unavailableTitle}>No Disponible en iOS</Text>
          <Text style={styles.unavailableText}>
            El botón flotante solo está disponible en Android
          </Text>
        </View>
      </View>
    );
  }

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
            Se mostrará el botón al iniciar el modo conductor
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#007AFF' : '#f4f3f4'}
          disabled={!hasPermission}
        />
      </View>

      {/* Estado del permiso */}
      {!hasPermission && (
        <View style={styles.permissionAlert}>
          <Text style={styles.permissionIcon}>⚠️</Text>
          <View style={styles.permissionContent}>
            <Text style={styles.permissionTitle}>Permiso Necesario</Text>
            <Text style={styles.permissionText}>
              Debes conceder permiso para mostrar sobre otras apps
            </Text>
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Configurar Permiso</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Información */}
      {hasPermission && isEnabled && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Cómo funcionará:</Text>
          <Text style={styles.infoText}>
            • El botón aparecerá al iniciar el Modo Conductor{'\n'}
            • Podrás moverlo arrastrándolo{'\n'}
            • Tócalo para capturar eventos{'\n'}
            • Se ocultará al detener el Modo Conductor
          </Text>
        </View>
      )}
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
  permissionAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
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
  loadingText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  unavailableCard: {
    alignItems: 'center',
    padding: 20,
  },
  unavailableIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  unavailableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9500',
    marginBottom: 8,
  },
  unavailableText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
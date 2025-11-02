// src/components/FloatingButtonControl.tsx
// Componente UI para controlar el botón flotante

import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFloatingButton } from '../hooks/useFloatingButton'; // ✅ IMPORTAR EL HOOK

export default function FloatingButtonControl() {
  // ✅ USAR EL HOOK EN LUGAR DE ESTADO LOCAL
  const {
    isActive,
    hasPermission,
    isChecking,
    toggleButton,
    requestPermission,
  } = useFloatingButton();

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableIcon}>⚠️</Text>
          <Text style={styles.unavailableTitle}>No Disponible</Text>
          <Text style={styles.unavailableText}>
            El botón flotante solo está disponible en Android
          </Text>
        </View>
      </View>
    );
  }

  if (isChecking) {
    return (
      <View style={styles.container}>
        <Text style={styles.checkingText}>Verificando estado...</Text>
      </View>
    );
  }

  const handleRequestPermission = () => {
    Alert.alert(
      '🔐 Permiso Requerido',
      'DriveSkore necesita permiso para mostrar el botón flotante sobre otras aplicaciones.\n\n' +
      'Esto te permitirá capturar eventos mientras usas Google Maps u otras apps.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Conceder Permiso', onPress: requestPermission }
      ]
    );
  };

  const handleToggle = async () => {
    if (!hasPermission) {
      handleRequestPermission();
      return;
    }

    try {
      await toggleButton();
      
      if (!isActive) {
        // Se acaba de activar
        Alert.alert(
          '✅ Botón Activo',
          'El botón flotante está activo.\n\n' +
          'Minimiza la aplicación o abre Google Maps para verlo en acción.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      Alert.alert(
        '❌ Error',
        'No se pudo cambiar el estado del botón. Verifica los permisos.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Botón Flotante</Text>
        <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
          <Text style={styles.statusText}>
            {isActive ? '🟢 ACTIVO' : '🔴 INACTIVO'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        Captura eventos rápidamente mientras usas otras aplicaciones como Google Maps.
      </Text>

      {!hasPermission ? (
        <View style={styles.permissionSection}>
          <Text style={styles.permissionIcon}>🔐</Text>
          <Text style={styles.permissionTitle}>Permiso Requerido</Text>
          <Text style={styles.permissionText}>
            Para usar esta función, debes conceder permiso para mostrar el botón sobre otras apps.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <Text style={styles.permissionButtonText}>
              Conceder Permiso
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controlSection}>
          <TouchableOpacity 
            style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
            onPress={handleToggle}
          >
            <Text style={styles.toggleButtonText}>
              {isActive ? '🛑 Detener Botón' : '▶️ Iniciar Botón'}
            </Text>
          </TouchableOpacity>

          {isActive && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>✅ Botón Activo</Text>
              <View style={styles.infoList}>
                <Text style={styles.infoItem}>• Minimiza la app para verlo</Text>
                <Text style={styles.infoItem}>• Tócalo para capturar eventos</Text>
                <Text style={styles.infoItem}>• Arrástralo para reposicionarlo</Text>
                <Text style={styles.infoItem}>• Funciona sobre todas las apps</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ... (mantén todos los estilos sin cambios)

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#34C759',
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  controlSection: {
    gap: 12,
  },
  toggleButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButtonActive: {
    backgroundColor: '#FF3B30',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionSection: {
    backgroundColor: '#FFF3CD',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
    alignItems: 'center',
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  checkingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 20,
  },
  unavailableCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  unavailableIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
    marginBottom: 8,
  },
  unavailableText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  notImplementedCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  notImplementedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  notImplementedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
    marginBottom: 12,
  },
  notImplementedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  infoButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
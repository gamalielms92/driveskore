// src/components/FloatingButtonControl.tsx
// VERSIÓN ACTUALIZADA - Soporta Android (nativo) e iOS (local)

import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFloatingButton } from '../hooks/useFloatingButton';

export default function FloatingButtonControl() {
  const {
    isActive,
    hasPermission,
    isChecking,
    toggleButton,
    requestPermission,
    platform,
    isLocalButton,
  } = useFloatingButton();

  // Web no soportado
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableIcon}>⚠️</Text>
          <Text style={styles.unavailableTitle}>No Disponible en Web</Text>
          <Text style={styles.unavailableText}>
            El botón flotante solo está disponible en la app móvil
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
    if (!hasPermission && Platform.OS === 'android') {
      handleRequestPermission();
      return;
    }

    try {
      await toggleButton();
      
      if (!isActive) {
        // Se acaba de activar
        if (Platform.OS === 'ios') {
          Alert.alert(
            '✅ Botón Flotante iOS Activo',
            'El botón aparecerá en la esquina de la app.\n\n' +
            '• Puedes arrastrarlo a cualquier posición\n' +
            '• Toca para capturar eventos\n' +
            '• Doble tap para ocultarlo temporalmente\n' +
            '• Funciona mientras uses DriveSkore',
            [{ text: 'Entendido' }]
          );
        } else {
          Alert.alert(
            '✅ Botón Flotante Activo',
            'El botón flotante está activo.\n\n' +
            'Minimiza la aplicación o abre Google Maps para verlo en acción.',
            [{ text: 'Entendido' }]
          );
        }
      }
    } catch (error) {
      Alert.alert(
        '❌ Error',
        'No se pudo cambiar el estado del botón.',
        [{ text: 'OK' }]
      );
    }
  };

  // Contenido específico por plataforma
  const renderPlatformContent = () => {
    if (Platform.OS === 'ios') {
      return (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>🎯 Botón Flotante iOS</Text>
            <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
              <Text style={styles.statusText}>
                {isActive ? '🟢 ACTIVO' : '🔴 INACTIVO'}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>
            Botón flotante dentro de la app. Aparece en todas las pantallas de DriveSkore y permite capturar eventos rápidamente.
          </Text>

          <View style={styles.iosInfoBox}>
            <Text style={styles.iosInfoTitle}>📱 Características iOS:</Text>
            <Text style={styles.iosInfoItem}>• Funciona dentro de DriveSkore</Text>
            <Text style={styles.iosInfoItem}>• Se puede arrastrar por la pantalla</Text>
            <Text style={styles.iosInfoItem}>• Ideal para uso con CarPlay</Text>
            <Text style={styles.iosInfoItem}>• Útil al cambiar entre apps rápidamente</Text>
          </View>
        </>
      );
    }

    // Android
    return (
      <>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Botón Flotante Android</Text>
          <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
            <Text style={styles.statusText}>
              {isActive ? '🟢 ACTIVO' : '🔴 INACTIVO'}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          Botón flotante sobre todas las apps. Funciona con Google Maps, Waze y cualquier otra aplicación.
        </Text>

        {!hasPermission && (
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
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      {renderPlatformContent()}

      {(Platform.OS === 'ios' || hasPermission) && (
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
                {Platform.OS === 'ios' ? (
                  <>
                    <Text style={styles.infoItem}>• Visible en todas las pantallas de la app</Text>
                    <Text style={styles.infoItem}>• Arrástralo para reposicionarlo</Text>
                    <Text style={styles.infoItem}>• Un tap para capturar</Text>
                    <Text style={styles.infoItem}>• Doble tap para ocultar 5 segundos</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.infoItem}>• Minimiza la app para verlo</Text>
                    <Text style={styles.infoItem}>• Tócalo para capturar eventos</Text>
                    <Text style={styles.infoItem}>• Arrástralo para reposicionarlo</Text>
                    <Text style={styles.infoItem}>• Funciona sobre todas las apps</Text>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

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
    marginBottom: 16,
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
  iosInfoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  iosInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  iosInfoItem: {
    fontSize: 13,
    color: '#1976D2',
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
});
// src/components/FloatingButtonControl.tsx
// Versión segura que muestra mensaje si el módulo nativo no está disponible

import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FloatingButtonNative from '../services/FloatingButtonNative';

export default function FloatingButtonControl() {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    setIsChecking(true);
    
    // Verificar si el módulo nativo está disponible
    const available = FloatingButtonNative.isAvailable();
    setIsAvailable(available);
    
    if (!available) {
      setIsChecking(false);
      return;
    }
    
    // Verificar permiso
    const permission = await FloatingButtonNative.checkPermission();
    setHasPermission(permission);
    
    // Verificar si el servicio está activo
    if (permission) {
      const running = await FloatingButtonNative.isRunning();
      setIsActive(running);
    }
    
    setIsChecking(false);
  };

  const handleRequestPermission = () => {
    Alert.alert(
      '🔐 Permiso Requerido',
      'DriveSkore necesita permiso para mostrar el botón flotante sobre otras aplicaciones.\n\n' +
      'Esto te permitirá capturar eventos mientras usas Google Maps u otras apps.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Conceder Permiso', 
          onPress: () => {
            FloatingButtonNative.requestPermission();
            setTimeout(() => checkInitialState(), 2000);
          }
        }
      ]
    );
  };

  const handleToggle = async () => {
    if (!hasPermission) {
      handleRequestPermission();
      return;
    }

    try {
      if (isActive) {
        await FloatingButtonNative.stop();
        setIsActive(false);
      } else {
        const started = await FloatingButtonNative.start();
        if (started) {
          setIsActive(true);
          Alert.alert(
            '✅ Botón Activo',
            'El botón flotante está activo.\n\n' +
            'Minimiza la aplicación o abre Google Maps para verlo en acción.',
            [{ text: 'Entendido' }]
          );
        } else {
          Alert.alert(
            '❌ Error',
            'No se pudo iniciar el botón flotante. Verifica los permisos.',
            [{ text: 'OK' }]
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

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableIcon}>⚠️</Text>
          <Text style={styles.unavailableTitle}>Solo Android</Text>
          <Text style={styles.unavailableText}>
            El botón flotante solo está disponible en Android
          </Text>
        </View>
      </View>
    );
  }

  // ⭐ NUEVO: Mostrar mensaje si el módulo nativo no está disponible
  if (!isAvailable && !isChecking) {
    return (
      <View style={styles.container}>
        <View style={styles.notImplementedCard}>
          <Text style={styles.notImplementedIcon}>🔧</Text>
          <Text style={styles.notImplementedTitle}>Función en Desarrollo</Text>
          <Text style={styles.notImplementedText}>
            El botón flotante nativo está en desarrollo y estará disponible pronto.
            {'\n\n'}
            Por ahora, usa el AB Shutter 3 para captura rápida.
          </Text>
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => {
              Alert.alert(
                'ℹ️ Información Técnica',
                'El botón flotante requiere código nativo Kotlin que aún no está compilado en tu versión de la app.\n\n' +
                'Estará disponible en una próxima actualización.',
                [{ text: 'Entendido' }]
              );
            }}
          >
            <Text style={styles.infoButtonText}>
              ℹ️ Más información
            </Text>
          </TouchableOpacity>
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
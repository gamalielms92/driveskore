// app/(tabs)/capture-settings.tsx
// ✅ Pantalla para elegir método de captura: AB Shutter 3 o Botón Flotante

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import FloatingCaptureButton from '../../src/components/FloatingCaptureButton';
import ABShutter3Service from '../../src/services/ABShutter3Service';

type CaptureMethod = 'ab-shutter' | 'floating-button' | 'none';

export default function CaptureSettingsScreen() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<CaptureMethod>('none');
  const [isABShutterActive, setIsABShutterActive] = useState(false);
  const [isFloatingActive, setIsFloatingActive] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('capture_method');
      if (saved) {
        const method = saved as CaptureMethod;
        setSelectedMethod(method);
        
        if (method === 'ab-shutter') {
          setIsABShutterActive(ABShutter3Service.isActive());
        } else if (method === 'floating-button') {
          setIsFloatingActive(true);
        }
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const saveSettings = async (method: CaptureMethod) => {
    try {
      await AsyncStorage.setItem('capture_method', method);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  };

  const handleSelectABShutter = async () => {
    // Desactivar flotante si estaba activo
    if (isFloatingActive) {
      setIsFloatingActive(false);
    }

    // Activar AB Shutter 3
    if (!isABShutterActive) {
      ABShutter3Service.startListening();
      setIsABShutterActive(true);
      setSelectedMethod('ab-shutter');
      await saveSettings('ab-shutter');
      
      Alert.alert(
        '✅ AB Shutter 3 Activado',
        'Asegúrate de emparejar tu botón en Ajustes → Bluetooth de Android'
      );
    } else {
      ABShutter3Service.stopListening();
      setIsABShutterActive(false);
      setSelectedMethod('none');
      await saveSettings('none');
    }
  };

  const handleSelectFloating = async () => {
    // Desactivar AB Shutter si estaba activo
    if (isABShutterActive) {
      ABShutter3Service.stopListening();
      setIsABShutterActive(false);
    }

    // Activar botón flotante
    if (!isFloatingActive) {
      setIsFloatingActive(true);
      setSelectedMethod('floating-button');
      await saveSettings('floating-button');
      
      Alert.alert(
        '✅ Botón Flotante Activado',
        'Verás un botón que puedes arrastrar. Presiónalo para capturar eventos.'
      );
    } else {
      setIsFloatingActive(false);
      setSelectedMethod('none');
      await saveSettings('none');
    }
  };

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
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Método de Captura</Text>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Elige cómo quieres capturar eventos mientras conduces. Solo puedes
            tener uno activo a la vez.
          </Text>
        </View>

        {/* Opción 1: AB Shutter 3 */}
        <View style={styles.section}>
          <View style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionIcon}>🎮</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>AB Shutter 3</Text>
                <Text style={styles.optionSubtitle}>
                  Botón Bluetooth externo ($5-10)
                </Text>
              </View>
              <Switch
                value={isABShutterActive}
                onValueChange={handleSelectABShutter}
                trackColor={{ false: '#ccc', true: '#34C759' }}
              />
            </View>

            <View style={styles.optionDetails}>
              <Text style={styles.detailTitle}>Ventajas:</Text>
              <Text style={styles.detailItem}>✅ Sin tocar el teléfono</Text>
              <Text style={styles.detailItem}>✅ 100% legal mientras conduces</Text>
              <Text style={styles.detailItem}>✅ Muy económico</Text>
              
              <Text style={styles.detailTitle}>Requisitos:</Text>
              <Text style={styles.detailItem}>
                • Comprar AB Shutter 3 (Amazon/AliExpress)
              </Text>
              <Text style={styles.detailItem}>
                • Emparejar en Ajustes → Bluetooth
              </Text>
            </View>
          </View>
        </View>

        {/* Opción 2: Botón Flotante */}
        <View style={styles.section}>
          <View style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionIcon}>🎯</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Botón Flotante</Text>
                <Text style={styles.optionSubtitle}>
                  Botón en pantalla (gratis)
                </Text>
              </View>
              <Switch
                value={isFloatingActive}
                onValueChange={handleSelectFloating}
                trackColor={{ false: '#ccc', true: '#34C759' }}
              />
            </View>

            <View style={styles.optionDetails}>
              <Text style={styles.detailTitle}>Ventajas:</Text>
              <Text style={styles.detailItem}>✅ No requiere hardware adicional</Text>
              <Text style={styles.detailItem}>✅ Gratis</Text>
              <Text style={styles.detailItem}>✅ Se puede mover en pantalla</Text>
              
              <Text style={styles.detailTitle}>Requisitos:</Text>
              <Text style={styles.detailItem}>• Ninguno</Text>
            </View>
          </View>
        </View>

        {/* Estado actual */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Estado Actual:</Text>
          <Text style={styles.statusText}>
            {selectedMethod === 'ab-shutter' && '🎮 AB Shutter 3 Activo'}
            {selectedMethod === 'floating-button' && '🎯 Botón Flotante Activo'}
            {selectedMethod === 'none' && '⏸️ Ningún método activo'}
          </Text>
        </View>
      </ScrollView>

      {/* Botón flotante (si está activo) */}
      <FloatingCaptureButton
        isActive={isFloatingActive}
        onToggle={() => setIsFloatingActive(!isFloatingActive)}
      />
    </>
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
    borderRadius: 8,
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
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  optionDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  detailItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  statusBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
  },
  webMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 32,
  },
});
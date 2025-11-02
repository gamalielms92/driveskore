// src/components/ABShutter3Control.tsx
// Componente para controlar el AB Shutter 3

import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ABShutter3Service from '../services/ABShutter3Service';

export default function ABShutter3Control() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = () => {
    const active = ABShutter3Service.isActive();
    setIsActive(active);
  };

  const handleToggle = () => {
    if (isActive) {
      // Detener
      ABShutter3Service.stopListening();
      setIsActive(false);
      
      Alert.alert(
        '⏸️ AB Shutter 3 Desactivado',
        'Ya no capturarás eventos con el botón'
      );
    } else {
      // Iniciar
      ABShutter3Service.startListening();
      setIsActive(true);
      
      Alert.alert(
        '✅ AB Shutter 3 Activo',
        'Presiona el botón de volumen (+) o (-) del mando para capturar eventos.\n\n' +
        'El mando debe estar emparejado en Bluetooth.',
        [{ text: 'Entendido' }]
      );
    }
  };

  const openPairingInstructions = () => {
    Alert.alert(
      '🔵 Emparejar AB Shutter 3',
      '1. Enciende tu AB Shutter 3 (LED parpadeará)\n' +
      '2. Ve a Ajustes → Bluetooth en tu teléfono\n' +
      '3. Busca "AB Shutter 3" en dispositivos disponibles\n' +
      '4. Toca para emparejar\n' +
      '5. Vuelve aquí y activa la escucha\n\n' +
      '¿Abrir ajustes de Bluetooth ahora?',
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

  const openBuyLink = () => {
    Alert.alert(
      '🛒 Dónde Comprar AB Shutter 3',
      'Busca "AB Shutter 3" en:\n\n' +
      '• Amazon España (~5-10€)\n' +
      '• AliExpress (~3-5€)\n' +
      '• También sirven:\n' +
      '  - "Mando selfie Bluetooth"\n' +
      '  - "Selfie remote control"\n' +
      '  - "Bluetooth camera shutter"',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header con estado */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>🎮</Text>
          <View>
            <Text style={styles.title}>AB Shutter 3</Text>
            <Text style={styles.subtitle}>Mando Bluetooth</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
          <Text style={styles.statusText}>
            {isActive ? '🟢 ACTIVO' : '🔴 INACTIVO'}
          </Text>
        </View>
      </View>

      {/* Descripción */}
      <Text style={styles.description}>
        Mando de selfie económico (~5€). Presiona el botón de volumen para capturar eventos sin tocar la pantalla.
      </Text>

      {/* Botón principal */}
      <TouchableOpacity 
        style={[styles.button, isActive && styles.buttonActive]}
        onPress={handleToggle}
      >
        <Text style={styles.buttonText}>
          {isActive ? '🛑 Detener Escucha' : '▶️ Iniciar Escucha'}
        </Text>
      </TouchableOpacity>

      {/* Botones de ayuda */}
      {!isActive && (
        <View style={styles.helpButtons}>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={openPairingInstructions}
          >
            <Text style={styles.helpButtonText}>🔵 ¿Cómo emparejar?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.helpButton}
            onPress={openBuyLink}
          >
            <Text style={styles.helpButtonText}>🛒 ¿Dónde comprar?</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info cuando está activo */}
      {isActive && (
        <View style={styles.activeInfoBox}>
          <Text style={styles.activeInfoTitle}>✅ Listo para capturar</Text>
          <View style={styles.activeInfoList}>
            <Text style={styles.activeInfoItem}>
              • Presiona volumen (+) o (-) del mando
            </Text>
            <Text style={styles.activeInfoItem}>
              • Se capturará un evento automáticamente
            </Text>
            <Text style={styles.activeInfoItem}>
              • Recibirás una notificación de confirmación
            </Text>
            <Text style={styles.activeInfoItem}>
              • Funciona en segundo plano
            </Text>
          </View>
        </View>
      )}

      {/* Instrucciones de compra */}
      <View style={styles.buyCard}>
        <Text style={styles.buyTitle}>💰 Precio y Disponibilidad</Text>
        <View style={styles.buyInfo}>
          <View style={styles.buyRow}>
            <Text style={styles.buyLabel}>Amazon ES:</Text>
            <Text style={styles.buyPrice}>5-10€</Text>
          </View>
          <View style={styles.buyRow}>
            <Text style={styles.buyLabel}>AliExpress:</Text>
            <Text style={styles.buyPrice}>3-5€</Text>
          </View>
          <View style={styles.buyRow}>
            <Text style={styles.buyLabel}>Envío:</Text>
            <Text style={styles.buyPrice}>2-5 días</Text>
          </View>
        </View>
        <Text style={styles.buyNote}>
          💡 Busca: "AB Shutter 3", "Mando selfie" o "Bluetooth shutter"
        </Text>
      </View>

      {/* Ventajas */}
      <View style={styles.advantagesCard}>
        <Text style={styles.advantagesTitle}>✨ Ventajas</Text>
        <Text style={styles.advantageItem}>✅ No tocas la pantalla (más seguro)</Text>
        <Text style={styles.advantageItem}>✅ Funciona con guantes</Text>
        <Text style={styles.advantageItem}>✅ Muy económico (~5€)</Text>
        <Text style={styles.advantageItem}>✅ Batería dura meses</Text>
        <Text style={styles.advantageItem}>✅ 100% legal mientras conduces</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  button: {
    backgroundColor: '#9C27B0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonActive: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  helpButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#9C27B0',
    fontSize: 13,
    fontWeight: '600',
  },
  activeInfoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  activeInfoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  activeInfoList: {
    gap: 6,
  },
  activeInfoItem: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  buyCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  buyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 12,
  },
  buyInfo: {
    gap: 8,
    marginBottom: 12,
  },
  buyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyLabel: {
    fontSize: 13,
    color: '#E65100',
  },
  buyPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
  },
  buyNote: {
    fontSize: 12,
    color: '#E65100',
    fontStyle: 'italic',
    marginTop: 8,
  },
  advantagesCard: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  advantagesTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginBottom: 10,
  },
  advantageItem: {
    fontSize: 13,
    color: '#6A1B9A',
    marginBottom: 4,
    lineHeight: 18,
  },
});
// src/components/AndroidOptimizationGuide.tsx
// Guía para optimizar Android y permitir funcionamiento en background

import React from 'react';
import {
    Alert,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function AndroidOptimizationGuide() {
  
  if (Platform.OS !== 'android') {
    return null;
  }

  const openBatterySettings = () => {
    Alert.alert(
      '⚡ Optimización de Batería',
      'Vas a abrir los ajustes de batería.\n\n' +
      '1. Busca "DriveSkore" en la lista\n' +
      '2. Selecciona "Sin restricciones"\n' +
      '3. Esto permitirá que el AB Shutter 3 funcione siempre',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Abrir Ajustes',
          onPress: () => Linking.openSettings()
        }
      ]
    );
  };

  const showManufacturerGuide = () => {
    Alert.alert(
      '📱 Configuración por Fabricante',
      'Cada fabricante tiene ajustes adicionales:\n\n' +
      '🔷 SAMSUNG:\n' +
      '• Ajustes → Cuidado del dispositivo\n' +
      '• Batería → Límites de uso en segundo plano\n' +
      '• Apps en suspensión → Eliminar DriveSkore\n\n' +
      '🔷 XIAOMI/REDMI/POCO:\n' +
      '• Ajustes → Apps → Gestionar apps\n' +
      '• DriveSkore → Ahorro de energía\n' +
      '• Seleccionar "Sin restricciones"\n' +
      '• Activar "Inicio automático"\n\n' +
      '🔷 HUAWEI:\n' +
      '• Ajustes → Batería → Inicio de apps\n' +
      '• DriveSkore → Gestión manual\n' +
      '• Activar todo\n\n' +
      '🔷 OPPO/REALME/ONEPLUS:\n' +
      '• Ajustes → Batería\n' +
      '• Optimización de batería\n' +
      '• DriveSkore → "No optimizar"\n\n' +
      '🔷 VIVO:\n' +
      '• Ajustes → Batería\n' +
      '• Consumo en segundo plano\n' +
      '• DriveSkore → "Permitir"',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Optimizar para Background</Text>
      <Text style={styles.subtitle}>
        Para que el AB Shutter 3 funcione siempre, configura estos ajustes:
      </Text>

      <View style={styles.stepsContainer}>
        {/* Paso 1 */}
        <View style={styles.step}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepTitle}>Desactivar Optimización de Batería</Text>
          </View>
          <Text style={styles.stepDescription}>
            Android limita las apps para ahorrar batería. Desactiva esta limitación para DriveSkore.
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={openBatterySettings}
          >
            <Text style={styles.buttonText}>⚡ Abrir Ajustes de Batería</Text>
          </TouchableOpacity>
        </View>

        {/* Paso 2 */}
        <View style={styles.step}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepTitle}>Permitir Notificaciones</Text>
          </View>
          <Text style={styles.stepDescription}>
            La notificación persistente mantiene el servicio activo. No la cierres.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Verás una notificación "🎮 AB Shutter 3 Activo" - esto es normal y necesario.
            </Text>
          </View>
        </View>

        {/* Paso 3 */}
        <View style={styles.step}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepTitle}>Configuración del Fabricante</Text>
          </View>
          <Text style={styles.stepDescription}>
            Algunos fabricantes tienen ajustes adicionales de ahorro de energía.
          </Text>
          <TouchableOpacity 
            style={styles.buttonSecondary}
            onPress={showManufacturerGuide}
          >
            <Text style={styles.buttonSecondaryText}>📱 Ver Guía por Fabricante</Text>
          </TouchableOpacity>
        </View>

        {/* Paso 4 */}
        <View style={styles.step}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepTitle}>Bloqueo de Apps Recientes</Text>
          </View>
          <Text style={styles.stepDescription}>
            Fija DriveSkore en apps recientes para evitar que se cierre:
          </Text>
          <View style={styles.instructionBox}>
            <Text style={styles.instruction}>• Abre apps recientes (botón cuadrado)</Text>
            <Text style={styles.instruction}>• Busca DriveSkore</Text>
            <Text style={styles.instruction}>• Mantén pulsado y selecciona "Fijar" 📌</Text>
          </View>
        </View>
      </View>

      {/* Verificación */}
      <View style={styles.verificationBox}>
        <Text style={styles.verificationTitle}>✅ Verificación</Text>
        <Text style={styles.verificationText}>
          Si todo está configurado correctamente:
        </Text>
        <Text style={styles.checkItem}>✓ AB Shutter 3 funcionará con la app cerrada</Text>
        <Text style={styles.checkItem}>✓ Verás la notificación persistente</Text>
        <Text style={styles.checkItem}>✓ Podrás capturar eventos en cualquier momento</Text>
      </View>

      {/* Nota importante */}
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Importante</Text>
        <Text style={styles.warningText}>
          Estos ajustes NO afectarán significativamente tu batería. 
          DriveSkore consume menos del 1% por hora en background.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  stepsContainer: {
    gap: 20,
  },
  step: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 15,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    backgroundColor: '#007AFF',
    color: 'white',
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  instructionBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  instruction: {
    fontSize: 13,
    color: '#555',
    lineHeight: 22,
  },
  verificationBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  verificationText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 8,
  },
  checkItem: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
    marginLeft: 8,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});
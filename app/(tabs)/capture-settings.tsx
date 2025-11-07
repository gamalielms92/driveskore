// app/(tabs)/capture-settings.tsx
// ✅ VERSIÓN FINAL: Botón Flotante Nativo + AB Shutter 3

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
import ABShutter3Control from '../../src/components/ABShutter3Control';
import FloatingButtonControl from '../../src/components/FloatingButtonControl';

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
        <Text style={styles.headerTitle}>Métodos de Captura</Text>
      </View>

      {/* Info General */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          Elige cómo capturar eventos mientras conduces. Puedes usar ambos métodos simultáneamente.
        </Text>
      </View>

      {/* Método 1: Botón Flotante Nativo */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🎯</Text>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Botón Flotante</Text>
            <Text style={styles.sectionSubtitle}>Aparece sobre todas las apps</Text>
          </View>
        </View>
        <FloatingButtonControl />
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
        <ABShutter3Control />
      </View>

      {/* Comparación */}
      <View style={styles.comparisonSection}>
        <Text style={styles.comparisonTitle}>📊 Comparación Rápida</Text>
        
        <View style={styles.comparisonTable}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonHeaderCell}>Característica</Text>
            <Text style={styles.comparisonHeaderCell}>🎯 Flotante</Text>
            <Text style={styles.comparisonHeaderCell}>🎮 AB Shutter</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Costo</Text>
            <Text style={styles.comparisonValue}>Gratis</Text>
            <Text style={styles.comparisonValue}>~5€</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Hardware extra</Text>
            <Text style={styles.comparisonValue}>❌ No</Text>
            <Text style={styles.comparisonValue}>✅ Sí</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Tocar pantalla</Text>
            <Text style={styles.comparisonValue}>Sí</Text>
            <Text style={styles.comparisonValue}>No</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Funciona sobre Maps</Text>
            <Text style={styles.comparisonValue}>✅ Sí</Text>
            <Text style={styles.comparisonValue}>✅ Sí</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Con guantes</Text>
            <Text style={styles.comparisonValue}>❌ No</Text>
            <Text style={styles.comparisonValue}>✅ Sí</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Setup</Text>
            <Text style={styles.comparisonValue}>1 min</Text>
            <Text style={styles.comparisonValue}>2 min</Text>
          </View>
        </View>
      </View>

      {/* Recomendaciones */}
      <View style={styles.recommendationsSection}>
        <Text style={styles.recommendationsTitle}>💡 ¿Cuál usar?</Text>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationIcon}>🎯</Text>
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>Botón Flotante</Text>
            <Text style={styles.recommendationText}>
              Ideal si quieres empezar rápido sin comprar nada. Perfecto para probar DriveSkore.
            </Text>
            <Text style={styles.recommendationBest}>
              ✨ Mejor para: Principiantes, uso ocasional
            </Text>
          </View>
        </View>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationIcon}>🎮</Text>
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>AB Shutter 3</Text>
            <Text style={styles.recommendationText}>
              Más seguro y cómodo. No necesitas tocar el teléfono mientras conduces.
            </Text>
            <Text style={styles.recommendationBest}>
              ✨ Mejor para: Conductores frecuentes, máxima seguridad
            </Text>
          </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  comparisonSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  comparisonTable: {
    gap: 8,
  },
  comparisonHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  comparisonHeaderCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  comparisonValue: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recommendationsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendationIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
  },
  recommendationBest: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  tipsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  webMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 32,
  },
});
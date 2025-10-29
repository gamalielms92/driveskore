// src/components/MobileOnly.tsx

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MobileOnlyProps {
  children: React.ReactNode;
  feature?: 'capture' | 'matching' | 'bluetooth';
  redirectTo?: string;
}

/**
 * Componente que solo renderiza su contenido en móvil
 * En Web muestra un mensaje indicando que la función solo está disponible en móvil
 */
export default function MobileOnly({ 
  children, 
  feature = 'capture',
  redirectTo = '/(tabs)' 
}: MobileOnlyProps) {
  const router = useRouter();

  useEffect(() => {
    // Si es Web, mostrar alerta y redirigir
    if (Platform.OS === 'web') {
      const featureNames = {
        capture: 'captura de eventos',
        matching: 'sistema de matching',
        bluetooth: 'botón Bluetooth',
      };

      Alert.alert(
        'Solo disponible en móvil',
        `La función de ${featureNames[feature]} solo está disponible en la aplicación móvil de DriveSkore.`,
        [
          {
            text: 'Volver',
            onPress: () => router.replace(redirectTo as any),
          },
        ]
      );
    }
  }, []);

  // Si es Web, mostrar pantalla de aviso
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.icon}>📱</Text>
          <Text style={styles.title}>Solo disponible en móvil</Text>
          <Text style={styles.message}>
            Esta función solo está disponible en la aplicación móvil de DriveSkore.
          </Text>
          <Text style={styles.submessage}>
            Descarga la app para Android o iOS para acceder a todas las funcionalidades.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace(redirectTo as any)}
          >
            <Text style={styles.buttonText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // En móvil, renderizar el contenido normalmente
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  submessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

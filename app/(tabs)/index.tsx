import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>¡Bienvenido a DriveScore!</Text>

      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push('/(tabs)/capture')}
      >
        <Text style={styles.cardIcon}>📷</Text>
        <Text style={styles.cardTitle}>Evaluar Conductor</Text>
        <Text style={styles.cardDesc}>Captura una matrícula y valora</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push('/(tabs)/profile')}
      >
        <Text style={styles.cardIcon}>⭐</Text>
        <Text style={styles.cardTitle}>Mis Valoraciones</Text>
        <Text style={styles.cardDesc}>Ve tu historial de evaluaciones</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

interface ActiveVehicle {
  id: string;
  plate: string;
  nickname: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeVehicle, setActiveVehicle] = useState<ActiveVehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveVehicle();
  }, []);

  const loadActiveVehicle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: vehicles } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('online', true)
        .maybeSingle();

      setActiveVehicle(vehicles);
    } catch (error) {
      console.error('Error cargando vehículo activo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webIcon}>🌐</Text>
        <Text style={styles.webTitle}>DriveSkore Web</Text>
        <Text style={styles.webMessage}>
          Esta aplicación está optimizada para dispositivos móviles.{'\n\n'}
          Algunas funcionalidades como la cámara y el modo conducción solo están disponibles en la app móvil.
        </Text>
        <TouchableOpacity 
          style={styles.webButton}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.webButtonText}>🔍 Buscar Conductores</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚗</Text>
          <Text style={styles.title}>DriveSkore</Text>
          <Text style={styles.subtitle}>Evalúa conductores, mejora las carreteras</Text>
        </View>

        {/* Vehículo activo */}
        {!loading && activeVehicle && (
          <View style={styles.activeVehicleCard}>
            <Text style={styles.activeVehicleTitle}>🟢 Vehículo Activo</Text>
            <Text style={styles.activeVehiclePlate}>{activeVehicle.plate}</Text>
            {activeVehicle.nickname && (
              <Text style={styles.activeVehicleNickname}>{activeVehicle.nickname}</Text>
            )}
            <Text style={styles.activeVehicleHint}>
              Las valoraciones que recibas irán a tu perfil de conductor
            </Text>
          </View>
        )}

        {/* BOTÓN MODO CONDUCCIÓN */}
        <TouchableOpacity
          style={styles.drivingModeButton}
          onPress={() => router.push('/driving-mode')}
        >
          <Text style={styles.drivingModeIcon}>🚗</Text>
          <View style={styles.drivingModeContent}>
            <Text style={styles.drivingModeTitle}>MODO CONDUCCIÓN</Text>
            <Text style={styles.drivingModeSubtitle}>
              Evalúa sin tocar el móvil
            </Text>
          </View>
        </TouchableOpacity>

        {/* Acciones principales */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/capture')}
          >
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionTitle}>Capturar</Text>
            <Text style={styles.actionDescription}>
              Evalúa con foto de matrícula
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionTitle}>Buscar</Text>
            <Text style={styles.actionDescription}>
              Consulta historial de conductores
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gestión de vehículos */}
        <TouchableOpacity
          style={styles.vehicleManagementCard}
          onPress={() => router.push('/select-vehicle')}
        >
          <Text style={styles.vehicleManagementIcon}>🚙</Text>
          <View style={styles.vehicleManagementContent}>
            <Text style={styles.vehicleManagementTitle}>
              Mis Vehículos
            </Text>
            <Text style={styles.vehicleManagementDescription}>
              {activeVehicle 
                ? 'Gestiona tus vehículos registrados' 
                : 'Añade tu vehículo para recibir valoraciones'}
            </Text>
          </View>
          <Text style={styles.vehicleManagementArrow}>→</Text>
        </TouchableOpacity>

        {/* Información */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 ¿Cómo funciona?</Text>
          <Text style={styles.infoText}>
            1. Captura o busca la matrícula del conductor{'\n'}
            2. Evalúa su comportamiento en la vía{'\n'}
            3. Ayuda a crear una comunidad de conductores responsables
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DriveSkore - Conducción colaborativa y segura
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 30,
  },
  webIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  webTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#007AFF',
  },
  webMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  webButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  webButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  logo: {
    fontSize: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  activeVehicleCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#34C759',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activeVehicleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 8,
  },
  activeVehiclePlate: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
    marginBottom: 5,
  },
  activeVehicleNickname: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  activeVehicleHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  drivingModeButton: {
    backgroundColor: '#FF6B00',
    padding: 25,
    borderRadius: 20,
    marginBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  drivingModeIcon: {
    fontSize: 50,
    marginRight: 20,
  },
  drivingModeContent: {
    flex: 1,
  },
  drivingModeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  drivingModeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  vehicleManagementCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleManagementIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  vehicleManagementContent: {
    flex: 1,
  },
  vehicleManagementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  vehicleManagementDescription: {
    fontSize: 14,
    color: '#666',
  },
  vehicleManagementArrow: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
// app/(tabs)/driver-mode.tsx
// VERSIÓN CORREGIDA

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import LocationTrackingService from '../../src/services/LocationTrackingService';

export default function DriverModeScreen() {
  const [isActive, setIsActive] = useState(false);
  const [userPlate, setUserPlate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener usuario
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Error obteniendo usuario:', userError);
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      console.log('✅ Usuario autenticado:', user.email);
      setUserId(user.id);

      // 2. Obtener vehículo activo del usuario
      const { data: activeVehicle, error: vehicleError } = await supabase
        .from('user_vehicles')
        .select('plate, online')
        .eq('user_id', user.id)
        .eq('online', true)
        .maybeSingle();

      console.log('🚗 Vehículo activo:', activeVehicle);

      if (vehicleError) {
        console.error('❌ Error obteniendo vehículo:', vehicleError);
      }

      if (activeVehicle) {
        console.log('✅ Matrícula encontrada:', activeVehicle.plate);
        setUserPlate(activeVehicle.plate);
        
        // Verificar si el tracking ya está activo
        const trackingActive = LocationTrackingService.isActive();
        setIsActive(trackingActive);
        console.log('📍 Tracking activo:', trackingActive);
      } else {
        console.log('⚠️ No hay vehículo activo');
        setUserPlate('');
        setIsActive(false);
      }
      
    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    try {
      console.log('═══════════════════════════════════════');
      console.log('🔧 handleToggle llamado');
      console.log('📋 Value:', value);
      console.log('📋 User Plate:', userPlate);
      console.log('📋 User ID:', userId);
      console.log('═══════════════════════════════════════');

      if (value) {
        // ═══ ACTIVAR MODO CONDUCTOR ═══
        
        // Validación 1: Usuario autenticado
        if (!userId) {
          Alert.alert('Error', 'No hay usuario autenticado');
          return;
        }

        // Validación 2: Matrícula configurada
        if (!userPlate || userPlate.trim() === '') {
          Alert.alert(
            'Sin vehículo activo',
            'Debes activar un vehículo en la pantalla "Mis Vehículos" para poder usar el Modo Conductor.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Ir a Vehículos',
                onPress: () => {
                  // TODO: Navegar a select-vehicle
                  // router.push('/select-vehicle');
                }
              }
            ]
          );
          return;
        }

        console.log('✅ Validaciones pasadas');
        console.log('🚀 Iniciando LocationTrackingService...');

        // Inicializar servicio
        await LocationTrackingService.initialize(userId, userPlate);
        console.log('✅ LocationTrackingService inicializado');

        // Iniciar tracking
        console.log('📍 Llamando a startTracking()...');
        const success = await LocationTrackingService.startTracking();
        console.log('📊 startTracking() result:', success);
        
        if (success) {
          setIsActive(true);
          Alert.alert(
            '✅ Modo Conductor Activado',
            `Tu ubicación se está registrando\n\nMatrícula: ${userPlate}`,
            [{ text: 'OK' }]
          );
          console.log('✅ Tracking iniciado exitosamente');
        } else {
          Alert.alert('Error', 'No se pudo iniciar el tracking');
          console.error('❌ startTracking() retornó false');
        }
        
      } else {
        // ═══ DESACTIVAR MODO CONDUCTOR ═══
        
        console.log('⏸️ Deteniendo tracking...');
        await LocationTrackingService.stopTracking();
        setIsActive(false);
        Alert.alert('⏸️ Modo Conductor Desactivado', 'Tracking detenido');
        console.log('✅ Tracking detenido');
      }
      
    } catch (error: any) {
      console.error('═══════════════════════════════════════');
      console.error('❌ Error en handleToggle:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('═══════════════════════════════════════');
      
      Alert.alert('Error', error.message || 'No se pudo cambiar el estado');
      setIsActive(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 Modo Conductor</Text>
      
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Estado del Tracking</Text>
            <Text style={styles.value}>
              {isActive ? '🟢 Activo' : '⚪ Inactivo'}
            </Text>
          </View>
          <Switch 
            value={isActive} 
            onValueChange={handleToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isActive ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        {userPlate ? (
          <View style={styles.info}>
            <Text style={styles.infoLabel}>Vehículo Activo:</Text>
            <Text style={styles.infoValue}>{userPlate}</Text>
          </View>
        ) : (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              ⚠️ No tienes ningún vehículo activo.
              {'\n\n'}
              Ve a "Mis Vehículos" para activar uno.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.explanation}>
        <Text style={styles.explanationTitle}>¿Qué hace el Modo Conductor?</Text>
        <Text style={styles.explanationText}>
          • Registra tu ubicación GPS continuamente{'\n'}
          • Permite que otros te identifiquen al evaluarte{'\n'}
          • Funciona en segundo plano{'\n'}
          • Optimizado para bajo consumo de batería
        </Text>
      </View>

      {isActive && (
        <View style={styles.activeInfo}>
          <Text style={styles.activeInfoText}>
            📍 Tu ubicación se está registrando{'\n'}
            🔋 Consumo: ~3-5% batería/hora{'\n'}
            📡 Sincronización cada 30 segundos
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  info: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 2,
    color: '#007AFF',
  },
  warning: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  explanation: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1565C0',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  activeInfo: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  activeInfoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#2E7D32',
  },
});
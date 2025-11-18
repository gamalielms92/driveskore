// app/select-vehicle.tsx

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../src/config/supabase';
import type { Vehicle } from '../src/types/vehicle';
import { getVehicleDescription, getVehicleDisplayName, getVehicleIcon } from '../src/utils/vehicleHelpers';

export default function SelectVehicleScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Cargados ${data?.length || 0} vehículos`);
      setVehicles(data || []);
    } catch (error: any) {
      console.error('Error cargando vehículos:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Usar useFocusEffect para recargar automáticamente
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Pantalla enfocada - Recargando vehículos...');
      loadVehicles();
    }, [])
  );

  const handleToggleOnline = async (vehicleId: string, currentState: boolean, vehicleName: string) => {
    try {
      if (!currentState) {
        // 1️⃣ Obtener datos del vehículo que vamos a activar
        const vehicleToActivate = vehicles.find(v => v.id === vehicleId);
        
        // 2️⃣ Si tiene matrícula, desactivarla en OTROS usuarios
        if (vehicleToActivate?.plate) {
          console.log('🔍 Verificando matrícula en otros usuarios:', vehicleToActivate.plate);
          
          const { error: otherUsersError } = await supabase
            .from('user_vehicles')
            .update({ online: false })
            .eq('plate', vehicleToActivate.plate)
            .neq('user_id', userId);
  
          if (otherUsersError) {
            console.error('⚠️ Error desactivando matrícula en otros usuarios:', otherUsersError);
          } else {
            console.log('✅ Matrícula desactivada en otros usuarios (si existía)');
          }
        }
  
        // 3️⃣ Desactivar todos los vehículos del usuario actual
        await supabase
          .from('user_vehicles')
          .update({ online: false })
          .eq('user_id', userId);
  
        console.log('🔄 Desactivados todos los vehículos del usuario actual');
      }

      // Actualizar el estado del vehículo seleccionado
      const { error } = await supabase
        .from('user_vehicles')
        .update({ online: !currentState })
        .eq('id', vehicleId);

      if (error) throw error;

      console.log(`✅ Vehículo ${vehicleName} ${!currentState ? 'activado' : 'desactivado'}`);

      // Actualizar estado local de forma segura manteniendo todos los datos
      setVehicles(prevVehicles => {
        const updatedVehicles = prevVehicles.map(vehicle => {
          if (vehicle.id === vehicleId) {
            // Este es el vehículo que cambiamos
            console.log('🔄 Actualizando vehículo:', vehicle.brand, vehicle.model, '- Online:', !currentState);
            console.log('📷 Foto URL:', vehicle.vehicle_photo_url);
            return { ...vehicle, online: !currentState };
          } else if (!currentState && vehicle.online) {
            // Si estamos activando otro, desactivar los demás que estaban activos
            return { ...vehicle, online: false };
          }
          return vehicle;
        });
        
        console.log('✅ Estado actualizado. Total vehículos:', updatedVehicles.length);
        return updatedVehicles;
      });

      Alert.alert(
        '✅ Estado actualizado',
        `${vehicleName} está ahora ${!currentState ? 'activo 🟢' : 'inactivo ⚪'}\n\n${!currentState ? 'Las valoraciones que recibas irán a tu perfil de conductor.' : 'Este vehículo ya no recibe valoraciones en tu perfil.'}`
      );
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del vehículo');
      // Recargar en caso de error para volver al estado real
      await loadVehicles();
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, vehicleName: string) => {
    Alert.alert(
      '¿Eliminar vehículo?',
      `Se eliminará ${vehicleName} de tu lista`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_vehicles')
                .delete()
                .eq('id', vehicleId);

              if (error) throw error;

              Alert.alert('✅ Eliminado', `${vehicleName} ha sido eliminado`);
              await loadVehicles();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleContinue = () => {
    const activeVehicle = vehicles.find(v => v.online);
    
    if (activeVehicle) {
      router.replace('/(tabs)');
    } else {
      Alert.alert(
        'Sin vehículo activo',
        '¿Continuar sin activar ningún vehículo?\n\nSi no activas ningún vehículo, no podrás recibir ni enviar valoraciones.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => router.replace('/(tabs)') }
        ]
      );
    }
  };



  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando vehículos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🏢 Mi Garaje</Text>
        <Text style={styles.subtitle}>
          Activa el vehículo que vas a conducir para que las valoraciones vayan a tu perfil.
        </Text>

        {/* Lista de vehículos */}
        {vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚗 🏍️ </Text>
            <Text style={styles.emptyIcon}>🚲 🛴 </Text>
            <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
            <Text style={styles.emptySubtext}>
              Añade tu vehículo para recibir valoraciones en tu perfil
            </Text>
          </View>
        ) : (
          <View style={styles.vehiclesList}>
            {vehicles.map((vehicle) => (
              <View 
                key={`${vehicle.id}-${vehicle.online}-${vehicle.vehicle_photo_url}`}
                style={[
                  styles.vehicleCard,
                  vehicle.online && styles.vehicleCardActive
                ]}
              >
                {/* Foto del vehículo */}
                <View style={styles.vehiclePhotoContainer}>
                  {vehicle.vehicle_photo_url ? (
                    <Image
                      source={{ uri: vehicle.vehicle_photo_url }}
                      style={styles.vehiclePhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.vehiclePhotoPlaceholder}>
                      <Text style={styles.vehiclePhotoPlaceholderIcon}>
                        {getVehicleIcon(vehicle.vehicle_type)}
                      </Text>
                    </View>
                  )}
                  
                  {vehicle.online && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVO</Text>
                    </View>
                  )}
                  
                  {vehicle.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>⭐</Text>
                    </View>
                  )}
                </View>

                {/* Info del vehículo */}
                <View style={styles.vehicleInfo}>
                  <View style={styles.vehicleHeader}>
                    <Text style={styles.vehicleIcon}>
                      {getVehicleIcon(vehicle.vehicle_type)}
                    </Text>
                    <View style={styles.vehicleNameContainer}>
                      <Text style={styles.vehicleName}>
                        {getVehicleDescription(vehicle)}
                      </Text>
                      {vehicle.year && (
                        <Text style={styles.vehicleYear}>({vehicle.year})</Text>
                      )}
                    </View>
                  </View>

                  {vehicle.color && (
                    <Text style={styles.vehicleColor}>🎨 {vehicle.color}</Text>
                  )}

                  <Text style={styles.vehicleIdentifier}>
                    {getVehicleDisplayName(vehicle)}
                  </Text>

                  {vehicle.nickname && vehicle.brand && (
                    <Text style={styles.vehicleNickname}>"{vehicle.nickname}"</Text>
                  )}
                </View>

                {/* Botones de acción */}
                <View style={styles.vehicleActions}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      vehicle.online && styles.toggleButtonActive
                    ]}
                    onPress={() => handleToggleOnline(
                      vehicle.id, 
                      vehicle.online, 
                      getVehicleDescription(vehicle)
                    )}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      vehicle.online && styles.toggleButtonTextActive
                    ]}>
                      {vehicle.online ? '🟢 Activo' : '⚪ Activar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteVehicle(vehicle.id, getVehicleDescription(vehicle))}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Botón añadir nuevo vehículo */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-vehicle')}
        >
          <Text style={styles.addButtonIcon}>➕</Text>
          <Text style={styles.addButtonText}>Añadir Vehículo</Text>
        </TouchableOpacity>

        {/* Botón continuar */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {vehicles.length > 0 ? 'Continuar →' : 'Saltar este paso →'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ... [styles sin cambios]

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  vehiclesList: {
    gap: 15,
    marginBottom: 20,
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCardActive: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  vehiclePhotoContainer: {
    position: 'relative',
    height: 200,
  },
  vehiclePhoto: {
    width: '100%',
    height: '100%',
  },
  vehiclePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehiclePhotoPlaceholderIcon: {
    fontSize: 80,
  },
  activeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  primaryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  primaryBadgeText: {
    fontSize: 20,
  },
  vehicleInfo: {
    padding: 15,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  vehicleNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 6,
  },
  vehicleYear: {
    fontSize: 14,
    color: '#666',
  },
  vehicleColor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vehicleIdentifier: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  vehicleNickname: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  vehicleActions: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 0,
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#34C759',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/config/supabase.js';

interface Vehicle {
  id: string;
  plate: string;
  nickname: string | null;
  online: boolean;
}

export default function SelectVehicleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadUserVehicles();
  }, []);

  const loadUserVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVehicles(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateVehicle = async (vehicleId: string, plate: string) => {
    setActivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // 1. Desactivar todos los vehículos del usuario
      await supabase
        .from('user_vehicles')
        .update({ online: false })
        .eq('user_id', user.id);

      // 2. Desactivar todos los usuarios con esta matrícula
      await supabase
        .from('user_vehicles')
        .update({ online: false })
        .eq('plate', plate);

      // 3. Activar solo este vehículo
      const { error } = await supabase
        .from('user_vehicles')
        .update({ 
          online: true,
          last_activated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) throw error;

      Alert.alert(
        '✅ Vehículo activado',
        `Ahora conduces ${plate}. Las valoraciones que recibas irán a tu perfil.`,
        [{ 
          text: 'OK', 
          onPress: () => router.replace('/(tabs)') 
        }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setActivating(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!newPlate || newPlate.length < 4) {
      Alert.alert('Error', 'Introduce una matrícula válida');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const plateUpper = newPlate.toUpperCase().trim();

      const { error } = await supabase
        .from('user_vehicles')
        .insert({
          user_id: user.id,
          plate: plateUpper,
          nickname: newNickname.trim() || null,
          online: false
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'Ya tienes este vehículo registrado');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('✅ Vehículo añadido', 'Ahora puedes activarlo para conducir');
      setNewPlate('');
      setNewNickname('');
      setShowAddForm(false);
      loadUserVehicles();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
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
        <Text style={styles.title}>¿Qué vehículo vas a conducir?</Text>
        <Text style={styles.subtitle}>
          Activa tu vehículo para recibir valoraciones en tu perfil
        </Text>

        {vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
            <Text style={styles.emptySubtext}>
              Añade tu matrícula para empezar a acumular tu reputación como conductor
            </Text>
          </View>
        ) : (
          <View style={styles.vehiclesList}>
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleCard,
                  vehicle.online && styles.vehicleCardActive
                ]}
                onPress={() => handleActivateVehicle(vehicle.id, vehicle.plate)}
                disabled={activating}
              >
                <View style={styles.vehicleHeader}>
                  <Text style={styles.vehiclePlate}>🚗 {vehicle.plate}</Text>
                  {vehicle.online && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>🟢 Activo</Text>
                    </View>
                  )}
                </View>
                {vehicle.nickname && (
                  <Text style={styles.vehicleNickname}>{vehicle.nickname}</Text>
                )}
                {!vehicle.online && (
                  <Text style={styles.vehicleAction}>Toca para activar</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!showAddForm ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(true)}
          >
            <Text style={styles.addButtonText}>➕ Añadir vehículo</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Añadir vehículo</Text>
            <TextInput
              style={styles.input}
              placeholder="Matrícula (ej: 1234 ABC)"
              value={newPlate}
              onChangeText={(text) => setNewPlate(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
            />
            <TextInput
              style={styles.input}
              placeholder="Apodo (opcional, ej: Mi Seat León)"
              value={newNickname}
              onChangeText={setNewNickname}
              maxLength={30}
            />
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddForm(false);
                  setNewPlate('');
                  setNewNickname('');
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddVehicle}
              >
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>
            {vehicles.length > 0 ? 'Continuar sin activar' : 'Omitir por ahora'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Activa tu vehículo antes de conducir para que las valoraciones que recibas se registren en tu perfil personal.
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  vehiclesList: {
    marginBottom: 20,
  },
  vehicleCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleCardActive: {
    borderColor: '#34C759',
    backgroundColor: '#E8F5E9',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehiclePlate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  activeBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vehicleNickname: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  vehicleAction: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addForm: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 15,
    marginBottom: 20,
  },
  skipButtonText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
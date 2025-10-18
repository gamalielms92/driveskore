import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/config/supabase';
import { formatPlate, validateSpanishPlate } from '../src/utils/plateValidator';

interface Vehicle {
  id: string;
  plate: string;
  nickname: string | null;
  online: boolean;
  created_at: string;
}

export default function SelectVehicleScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVehicles(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!newPlate.trim()) {
      Alert.alert('Error', 'Introduce una matrícula');
      return;
    }

    const validation = validateSpanishPlate(newPlate);

    if (!validation.isValid) {
      Alert.alert('Matrícula inválida', validation.error || 'Formato incorrecto');
      return;
    }

    const formattedPlate = formatPlate(newPlate);

    try {
      // Verificar si ya existe
      const existing = vehicles.find(v => v.plate === formattedPlate);
      
      if (existing) {
        Alert.alert('Ya existe', 'Ya tienes este vehículo registrado');
        return;
      }

      const { error } = await supabase
        .from('user_vehicles')
        .insert({
          user_id: userId,
          plate: formattedPlate,
          nickname: newNickname.trim() || null,
          online: false, // Por defecto inactivo
        });

      if (error) throw error;

      Alert.alert('✅ Vehículo añadido', `${formattedPlate} registrado correctamente`);
      
      setNewPlate('');
      setNewNickname('');
      setAddingNew(false);
      
      await loadVehicles();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleOnline = async (vehicleId: string, currentState: boolean, plate: string) => {
    try {
      if (!currentState) {
        // Si vamos a activar este vehículo, desactivar todos los demás del usuario
        await supabase
          .from('user_vehicles')
          .update({ online: false })
          .eq('user_id', userId);

        console.log('🔄 Desactivados todos los vehículos del usuario');
      }

      // Actualizar el estado del vehículo seleccionado
      const { error } = await supabase
        .from('user_vehicles')
        .update({ online: !currentState })
        .eq('id', vehicleId);

      if (error) throw error;

      console.log(`✅ Vehículo ${plate} ${!currentState ? 'activado' : 'desactivado'}`);

      // Recargar datos
      await loadVehicles();

      Alert.alert(
        '✅ Estado actualizado',
        `${plate} está ahora ${!currentState ? 'activo 🟢' : 'inactivo ⚪'}\n\n${!currentState ? 'Las valoraciones que recibas irán a tu perfil de conductor.' : 'Este vehículo ya no recibe valoraciones en tu perfil.'}`
      );
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del vehículo');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, plate: string) => {
    Alert.alert(
      '¿Eliminar vehículo?',
      `Se eliminará ${plate} de tu lista`,
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

              Alert.alert('✅ Eliminado', `${plate} ha sido eliminado`);
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
        '¿Quieres continuar sin activar ningún vehículo?\n\nSi no activas un vehículo, las valoraciones que recibas irán al perfil genérico de la matrícula.',
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
        <Text style={styles.title}>🚗 Mis Vehículos</Text>
        <Text style={styles.subtitle}>
          Activa el vehículo que vas a conducir para que las valoraciones vayan a tu perfil.
        </Text>

        {/* Lista de vehículos */}
        {vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
            <Text style={styles.emptySubtext}>
              Añade tu matrícula para recibir valoraciones en tu perfil de conductor
            </Text>
          </View>
        ) : (
          <View style={styles.vehiclesList}>
            {vehicles.map((vehicle) => (
              <View key={vehicle.id} style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehiclePlate}>
                      {vehicle.online ? '🟢' : '⚪'} {vehicle.plate}
                    </Text>
                    {vehicle.nickname && (
                      <Text style={styles.vehicleNickname}>{vehicle.nickname}</Text>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      vehicle.online && styles.toggleButtonActive
                    ]}
                    onPress={() => handleToggleOnline(vehicle.id, vehicle.online, vehicle.plate)}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      vehicle.online && styles.toggleButtonTextActive
                    ]}>
                      {vehicle.online ? 'Activo' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteVehicle(vehicle.id, vehicle.plate)}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Añadir nuevo vehículo */}
        {!addingNew ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddingNew(true)}
          >
            <Text style={styles.addButtonText}>➕ Añadir vehículo</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Nuevo Vehículo</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Matrícula (ej: 1234 ABC)"
              value={newPlate}
              onChangeText={setNewPlate}
              autoCapitalize="characters"
              maxLength={10}
            />

            <TextInput
              style={styles.input}
              placeholder="Apodo (opcional)"
              value={newNickname}
              onChangeText={setNewNickname}
              maxLength={30}
            />

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setAddingNew(false);
                  setNewPlate('');
                  setNewNickname('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddVehicle}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botón continuar */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {vehicles.some(v => v.online) ? 'Continuar →' : 'Saltar este paso →'}
          </Text>
        </TouchableOpacity>
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
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  vehicleNickname: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
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
    alignItems: 'center',
    padding: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
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
    marginBottom: 20,
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
    backgroundColor: '#F5F5F5',
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
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
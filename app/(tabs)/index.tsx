import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

interface ActiveVehicle {
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
      
      if (!user) return;

      const { data, error } = await supabase
        .from('user_vehicles')
        .select('plate, nickname')
        .eq('user_id', user.id)
        .eq('online', true)
        .single();

      if (!error && data) {
        setActiveVehicle(data);
      }
    } catch (error) {
      console.log('No active vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeVehicle = () => {
    router.push('/select-vehicle');
  };

  const handleDeactivate = async () => {
    Alert.alert(
      'Desactivar vehículo',
      '¿Dejar de conducir? Las valoraciones dejarán de ir a tu perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              await supabase
                .from('user_vehicles')
                .update({ online: false })
                .eq('user_id', user.id);

              setActiveVehicle(null);
              Alert.alert('✅ Desactivado', 'Ya no estás conduciendo activamente');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.welcome}>¡Bienvenido a DriveSkore!</Text>

      {/* Mensaje informativo solo en web */}
      {Platform.OS === 'web' && (
        <View style={styles.webNotice}>
          <Text style={styles.webNoticeIcon}>ℹ️</Text>
          <View style={styles.webNoticeContent}>
            <Text style={styles.webNoticeTitle}>Versión Web - Funcionalidad Limitada</Text>
            <Text style={styles.webNoticeText}>
              Estás usando la versión web. Para evaluar conductores con cámara y OCR automático, 
              necesitas la app móvil Android.
            </Text>
            <Text style={styles.webNoticeFeatures}>
              ✅ Disponible en web: Buscar conductores, ver perfiles y estadísticas{'\n'}
              ❌ Solo en móvil: Captura de fotos, OCR y evaluaciones
            </Text>
          </View>
        </View>
      )}

      {/* Estado del conductor activo */}
      {activeVehicle && (
        <View style={styles.activeVehicleCard}>
          <Text style={styles.activeVehicleTitle}>🟢 Conductor Activo</Text>
          <View style={styles.activeVehicleInfo}>
            <Text style={styles.activeVehiclePlate}>🚗 {activeVehicle.plate}</Text>
            {activeVehicle.nickname && (
              <Text style={styles.activeVehicleNickname}>{activeVehicle.nickname}</Text>
            )}
          </View>
          <Text style={styles.activeVehicleDesc}>
            Las valoraciones que recibas irán a tu perfil
          </Text>
          <View style={styles.activeVehicleButtons}>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={handleChangeVehicle}
            >
              <Text style={styles.changeButtonText}>Cambiar vehículo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deactivateButton}
              onPress={handleDeactivate}
            >
              <Text style={styles.deactivateButtonText}>Desactivar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Botón para activar si no hay vehículo activo */}
      {!activeVehicle && !loading && (
        <TouchableOpacity
          style={styles.activatePrompt}
          onPress={handleChangeVehicle}
        >
          <Text style={styles.activatePromptIcon}>🚗</Text>
          <Text style={styles.activatePromptTitle}>¿Vas a conducir?</Text>
          <Text style={styles.activatePromptText}>
            Activa tu vehículo para recibir valoraciones en tu perfil
          </Text>
          <View style={styles.activatePromptButton}>
            <Text style={styles.activatePromptButtonText}>Activar vehículo</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          if (Platform.OS === 'web') {
            alert('⚠️ La captura de fotos solo está disponible en la app móvil. Usa la función de Búsqueda para ver perfiles de conductores.');
          } else {
            router.push('/(tabs)/capture');
          }
        }}
      >
        <Text style={styles.cardIcon}>📷</Text>
        <Text style={styles.cardTitle}>Evaluar Conductor</Text>
        <Text style={styles.cardDesc}>
          {Platform.OS === 'web' 
            ? '⚠️ Requiere app móvil' 
            : 'Captura una matrícula y valora'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push('/(tabs)/search')}
      >
        <Text style={styles.cardIcon}>🔍</Text>
        <Text style={styles.cardTitle}>Buscar Conductor</Text>
        <Text style={styles.cardDesc}>Consulta la reputación de cualquier matrícula</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push('/(tabs)/profile')}
      >
        <Text style={styles.cardIcon}>⭐</Text>
        <Text style={styles.cardTitle}>Mi Perfil</Text>
        <Text style={styles.cardDesc}>Ve tu historial de evaluaciones</Text>
      </TouchableOpacity>

      {/* Información adicional en web */}
      {Platform.OS === 'web' && (
        <View style={styles.infoFooter}>
          <Text style={styles.infoFooterText}>
            💡 DriveSkore es una aplicación móvil. Esta versión web es solo para consulta de datos.
          </Text>
        </View>
      )}
    </ScrollView>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  webNotice: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  webNoticeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  webNoticeContent: {
    flex: 1,
  },
  webNoticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  webNoticeText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 10,
  },
  webNoticeFeatures: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 8,
    borderRadius: 5,
  },
  activeVehicleCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#34C759',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeVehicleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 10,
  },
  activeVehicleInfo: {
    marginBottom: 8,
  },
  activeVehiclePlate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  activeVehicleNickname: {
    fontSize: 16,
    color: '#666',
  },
  activeVehicleDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  activeVehicleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  changeButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
  },
  changeButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deactivateButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deactivateButtonText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activatePrompt: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activatePromptIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  activatePromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  activatePromptText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  activatePromptButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  activatePromptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  infoFooter: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    alignItems: 'center',
  },
  infoFooterText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 18,
  },
});
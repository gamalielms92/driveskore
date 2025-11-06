// app/(tabs)/search.tsx
// ✅ Búsqueda por MATRÍCULA o NOMBRE
// ✅ Solo conductores registrados
// ✅ Sin opción de "evaluar ahora" (valoraciones solo en carretera)

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

interface TopDriver {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_score: number;
  num_ratings: number;
  average_score: number;
  vehicles: Array<{
    plate: string;
    brand: string | null;
    model: string | null;
    vehicle_photo_url: string | null;
  }>;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchPlate, setSearchPlate] = useState(''); // Mantener nombre por compatibilidad
  const [loading, setLoading] = useState(false);
  const [topDrivers, setTopDrivers] = useState<TopDriver[]>([]);

  const handleSearchChange = (text: string) => {
    setSearchPlate(text); // Mantener el nombre de la variable por compatibilidad
  };

  const handleSearch = async () => {
    if (!searchPlate || searchPlate.trim().length < 2) {
      Alert.alert('Error', 'Introduce al menos 2 caracteres');
      return;
    }

    const searchTerm = searchPlate.trim();
    setLoading(true);

    try {
      // BÚSQUEDA SOLO POR NOMBRE
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .ilike('full_name', `%${searchTerm}%`)
        .limit(10);

      setLoading(false);

      if (usersError) throw usersError;

      if (users && users.length > 0) {
        // Si hay resultados
        if (users.length === 1) {
          // Solo un resultado → ir directo a su perfil
          const { data: vehicle } = await supabase
            .from('user_vehicles')
            .select('plate')
            .eq('user_id', users[0].user_id)
            .limit(1)
            .maybeSingle();

          if (vehicle) {
            router.push(`/conductor/${vehicle.plate}`);
            return;
          } else {
            Alert.alert(
              'Sin vehículos',
              `${users[0].full_name} no tiene vehículos registrados aún.`,
              [{ text: 'OK' }]
            );
            return;
          }
        } else {
          // Múltiples resultados → mostrar lista
          const usersList = users.map((u, i) => `${i + 1}. ${u.full_name}`).join('\n');
          Alert.alert(
            `🔍 ${users.length} resultados encontrados`,
            `${usersList}\n\nRefina tu búsqueda para ver un conductor específico.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // NO ENCONTRADO
      Alert.alert(
        '🔍 No encontrado',
        `No se encontró ningún conductor con el nombre "${searchTerm}".\n\nRecuerda:\n• Solo puedes consultar conductores registrados\n• Busca por nombre o apellidos`,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      setLoading(false);
      console.error('Error en búsqueda:', error);
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
    }
  };

  const loadTopDrivers = async () => {
    try {
      // 1. Obtener perfiles con más valoraciones que tengan user_id
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, plate, total_score, num_ratings')
        .not('user_id', 'is', null)
        .order('num_ratings', { ascending: false })
        .limit(20);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        setTopDrivers([]);
        return;
      }

      // 2. Agrupar por user_id y agregar puntuaciones
      const userScores = new Map<string, {
        total_score: number;
        num_ratings: number;
        plates: string[];
      }>();

      profiles.forEach(profile => {
        if (!profile.user_id) return;

        const existing = userScores.get(profile.user_id);
        if (existing) {
          existing.total_score += profile.total_score;
          existing.num_ratings += profile.num_ratings;
          existing.plates.push(profile.plate);
        } else {
          userScores.set(profile.user_id, {
            total_score: profile.total_score,
            num_ratings: profile.num_ratings,
            plates: [profile.plate]
          });
        }
      });

      // 3. Convertir a array y ordenar por número de valoraciones
      const userIds = Array.from(userScores.entries())
        .sort((a, b) => b[1].num_ratings - a[1].num_ratings)
        .slice(0, 5)
        .map(([userId]) => userId);

      // 4. Cargar información de cada usuario
      const driversData: TopDriver[] = [];

      for (const userId of userIds) {
        const scores = userScores.get(userId)!;

        // Cargar perfil de usuario
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', userId)
          .maybeSingle();

        // Cargar vehículos
        const { data: vehicles } = await supabase
          .from('user_vehicles')
          .select('plate, brand, model, vehicle_photo_url')
          .eq('user_id', userId)
          .limit(3);

        driversData.push({
          user_id: userId,
          full_name: userProfile?.full_name || 'Usuario sin nombre',
          avatar_url: userProfile?.avatar_url || null,
          total_score: scores.total_score,
          num_ratings: scores.num_ratings,
          average_score: scores.total_score / scores.num_ratings,
          vehicles: vehicles || []
        });
      }

      setTopDrivers(driversData);

    } catch (error) {
      console.error('Error cargando top conductores:', error);
    }
  };

  React.useEffect(() => {
    loadTopDrivers();
  }, []);

  const renderStars = (score: number) => {
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    return '⭐'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Buscar Conductor</Text>
        <Text style={styles.subtitle}>Por nombre o apellidos</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ej: Juan Pérez García"
            value={searchPlate}
            onChangeText={handleSearchChange}
            autoCapitalize="words"
            onSubmitEditing={handleSearch}
          />
          
          <TouchableOpacity 
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>🔍 Buscar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* CONDUCTORES MÁS VALORADOS - CENTRADO EN PERSONAS */}
        {topDrivers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Conductores más valorados</Text>
            
            {topDrivers.map((driver, index) => (
              <TouchableOpacity
                key={driver.user_id}
                style={styles.driverCard}
                onPress={() => {
                  if (driver.vehicles.length > 0) {
                    router.push(`/conductor/${driver.vehicles[0].plate}`);
                  }
                }}
              >
                <View style={styles.driverHeader}>
                  <Text style={styles.medal}>
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `${index + 1}.`}
                  </Text>

                  {driver.avatar_url ? (
                    <Image
                      source={{ uri: driver.avatar_url }}
                      style={styles.driverAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.driverAvatarPlaceholder}>
                      <Text style={styles.driverAvatarText}>
                        {driver.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.full_name}</Text>
                    <Text style={styles.driverRatings}>
                      {driver.num_ratings} valoración{driver.num_ratings !== 1 ? 'es' : ''}
                    </Text>
                  </View>

                  <View style={styles.driverScoreSection}>
                    <Text style={styles.driverScore}>
                      {driver.average_score.toFixed(1)}
                    </Text>
                    <Text style={styles.driverStars}>
                      {renderStars(driver.average_score)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Busca conductores por su nombre o apellidos. Solo puedes consultar conductores registrados en DriveSkore.
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  searchContainer: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 10,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  driverCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  medal: {
    fontSize: 24,
    marginRight: 10,
    width: 30,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  driverAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverAvatarText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  driverRatings: {
    fontSize: 13,
    color: '#666',
  },
  driverScoreSection: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  driverScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 2,
  },
  driverStars: {
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

interface ConductorProfile {
  plate: string;
  total_score: number;
  num_ratings: number;
  average_score: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchPlate, setSearchPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<ConductorProfile[]>([]);

  const handleSearch = async () => {
    if (!searchPlate || searchPlate.trim().length < 4) {
      Alert.alert('Error', 'Introduce una matrícula válida (mínimo 4 caracteres)');
      return;
    }

    const plateUpper = searchPlate.toUpperCase().trim();
    setLoading(true);

    try {
      // Buscar perfil del conductor
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('plate', plateUpper)
        .single();

      setLoading(false);

      if (error || !profile) {
        Alert.alert(
          'No encontrado',
          `No hay valoraciones para la matrícula ${plateUpper}\n\n¿Quieres ser el primero en evaluarla?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Evaluar ahora',
              onPress: () => router.push('/(tabs)/capture')
            }
          ]
        );
        return;
      }

      // Navegar al perfil del conductor
      router.push(`/conductor/${plateUpper}`);
      
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo buscar la matrícula');
    }
  };

  const loadRecentProfiles = async () => {
    try {
      // Cargar los 5 perfiles con más valoraciones
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('num_ratings', { ascending: false })
        .limit(5);

      if (data) {
        const profilesWithAverage = data.map(p => ({
          ...p,
          average_score: p.num_ratings > 0 ? p.total_score / p.num_ratings : 0
        }));
        setRecentSearches(profilesWithAverage);
      }
    } catch (error) {
      console.log('Error cargando perfiles recientes:', error);
    }
  };

  React.useEffect(() => {
    loadRecentProfiles();
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
        <Text style={styles.subtitle}>Introduce la matrícula para ver su reputación</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ej: 1234ABC"
            value={searchPlate}
            onChangeText={setSearchPlate}
            autoCapitalize="characters"
            maxLength={10}
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

        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conductores más valorados</Text>
            
            {recentSearches.map((profile, index) => (
              <TouchableOpacity
                key={profile.plate}
                style={styles.profileCard}
                onPress={() => router.push(`/conductor/${profile.plate}`)}
              >
                <View style={styles.profileHeader}>
                  <Text style={styles.profilePlate}>
                    {index === 0 && '🥇 '}
                    {index === 1 && '🥈 '}
                    {index === 2 && '🥉 '}
                    {profile.plate}
                  </Text>
                  <Text style={styles.profileRatings}>
                    {profile.num_ratings} valoración{profile.num_ratings !== 1 ? 'es' : ''}
                  </Text>
                </View>
                <View style={styles.profileStats}>
                  <Text style={styles.profileStars}>
                    {renderStars(profile.average_score)}
                  </Text>
                  <Text style={styles.profileScore}>
                    {profile.average_score.toFixed(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            La búsqueda te permite ver la reputación de cualquier conductor antes de compartir viaje o para reportar comportamientos.
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
    fontSize: 20,
    fontWeight: 'bold',
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
  profileCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePlate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  profileRatings: {
    fontSize: 12,
    color: '#999',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileStars: {
    fontSize: 20,
  },
  profileScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
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
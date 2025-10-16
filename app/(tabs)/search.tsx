import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import { isBlacklisted, validateSpanishPlate } from '../../src/utils/plateValidator';

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
  const [plateValidation, setPlateValidation] = useState<any>(null);

  const handleSearchChange = (text: string) => {
    const cleanText = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    setSearchPlate(cleanText);
    
    const validation = validateSpanishPlate(cleanText);
    setPlateValidation(validation);
    
    if (/^\d{4}[A-Z]{1,3}$/.test(cleanText)) {
      const formatted = cleanText.replace(/(\d{4})([A-Z]+)/, '$1 $2');
      setSearchPlate(formatted);
    }
  };

  const handleSearch = async () => {
    if (!searchPlate || searchPlate.trim().length < 4) {
      Alert.alert('Error', 'Introduce una matrícula válida');
      return;
    }

    const validation = validateSpanishPlate(searchPlate);
    
    if (!validation.isValid) {
      Alert.alert(
        '⚠️ Formato no válido',
        `"${searchPlate}" no es una matrícula española válida.\n\nFormatos aceptados:\n• 1234 ABC (actual)\n• M 1234 BC (provincial)`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (isBlacklisted(searchPlate)) {
      Alert.alert(
        '🚫 Matrícula no válida',
        `La combinación "${validation.letters}" no es válida según la DGT.`
      );
      return;
    }

    const plateUpper = searchPlate.toUpperCase().trim();
    setLoading(true);

    try {
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

      router.push(`/conductor/${plateUpper}`);
      
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo buscar la matrícula');
    }
  };

  const loadRecentProfiles = async () => {
    try {
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
            style={[
              styles.input,
              plateValidation?.isValid === true && styles.inputValid,
              plateValidation?.isValid === false && searchPlate.length >= 4 && styles.inputInvalid
            ]}
            placeholder="Ej: 1234ABC"
            value={searchPlate}
            onChangeText={handleSearchChange}
            autoCapitalize="characters"
            maxLength={10}
            onSubmitEditing={handleSearch}
          />
          
          {searchPlate.length >= 4 && (
            <View style={styles.validationFeedback}>
              {plateValidation?.isValid ? (
                <Text style={styles.validText}>
                  ✅ {plateValidation.format === 'current' ? 'Formato actual' : 'Formato provincial'}
                </Text>
              ) : (
                <Text style={styles.invalidText}>
                  ⚠️ Formato no válido
                </Text>
              )}
            </View>
          )}
          
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
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  inputValid: {
    borderColor: '#34C759',
  },
  inputInvalid: {
    borderColor: '#FF3B30',
  },
  validationFeedback: {
    marginBottom: 15,
  },
  validText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    textAlign: 'center',
  },
  invalidText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
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
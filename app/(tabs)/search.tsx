// app/(tabs)/search.tsx

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/config/supabase';
import WeeklyRankingService, { type GlobalRankingEntry } from '../../src/services/WeeklyRankingService';
import { getUserLevel } from '../../src/utils/gamification';

interface TopDriver {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_score: number;
  num_ratings: number;
  average_score: number;
  vehicles: Array<{
    plate: string;
    brand: string;
    model: string;
    vehicle_photo_url: string | null;
  }>;
}

type RankingMode = 'weekly' | 'global';

export default function SearchScreen() {
  const router = useRouter();
  const [searchPlate, setSearchPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [rankingMode, setRankingMode] = useState<RankingMode>('global');
  const [globalRanking, setGlobalRanking] = useState<GlobalRankingEntry[]>([]);
  const [weeklyRanking, setWeeklyRanking] = useState<any[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(true);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      setLoadingRanking(true);
      
      // Cargar ranking global
      const global = await WeeklyRankingService.getGlobalRanking();
      setGlobalRanking(global);
      
      // Cargar ranking semanal
      const weekly = await WeeklyRankingService.getCurrentWeeklyRanking();
      setWeeklyRanking(weekly);
      
    } catch (error) {
      console.error('Error cargando rankings:', error);
    } finally {
      setLoadingRanking(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchPlate(text.toUpperCase());
  };

  const handleSearch = async () => {
    if (!searchPlate.trim()) {
      Alert.alert('Atención', 'Por favor ingresa un nombre para buscar');
      return;
    }

    try {
      setLoading(true);

      const searchTerm = searchPlate.trim().toLowerCase();

      // Buscar por nombre en user_profiles
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .or(`full_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (usersError) throw usersError;

      if (users && users.length > 0) {
        if (users.length === 1) {
          // UN SOLO RESULTADO - Cargar primer vehículo y redirigir
          const userId = users[0].user_id;

          const { data: vehicles, error: vehiclesError } = await supabase
            .from('user_vehicles')
            .select('plate')
            .eq('user_id', userId)
            .order('is_primary', { ascending: false })
            .limit(1);

          if (vehiclesError) throw vehiclesError;

          if (vehicles && vehicles.length > 0) {
            router.push(`/conductor/${vehicles[0].plate}`);
            setSearchPlate('');
            return;
          } else {
            Alert.alert(
              'Perfil encontrado',
              `Se encontró a ${users[0].full_name}, pero no tiene vehículos registrados.`,
              [{ text: 'OK' }]
            );
            return;
          }
        } else {
          // MÚLTIPLES RESULTADOS
          setLoading(false);
          const usersList = users.map((u) => `• ${u.full_name}`).join('\n');
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
      console.error('Error en búsqueda:', error);
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (score: number) => {
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    return (
      '⭐'.repeat(fullStars) +
      (hasHalfStar ? '½' : '') +
      '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))
    );
  };

  const renderRankingEntry = (entry: GlobalRankingEntry, index: number) => {
    // entry.level contiene ratingsGiven, no el nivel calculado
    const userLevel = getUserLevel(entry.level); // Calcular nivel desde ratingsGiven
    const isTopThree = index < 3;
    
    return (
      <TouchableOpacity
        key={entry.user_id}
        style={[
          styles.rankingItem,
          isTopThree && styles.rankingItemTopThree
        ]}
        onPress={() => {
          if (entry.vehicles.length > 0) {
            router.push(`/conductor/${entry.vehicles[0].plate}`);
          }
        }}
      >
        {/* Posición */}
        <View style={styles.positionContainer}>
          <Text style={[
            styles.positionText,
            isTopThree && styles.positionTextTopThree
          ]}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${entry.position}`}
          </Text>
        </View>

        {/* Avatar */}
        {entry.avatar_url ? (
          <Image
            source={{ uri: entry.avatar_url }}
            style={styles.rankingAvatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.rankingAvatarPlaceholder}>
            <Text style={styles.rankingAvatarText}>
              {entry.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.rankingInfo}>
          <View style={styles.rankingNameRow}>
            <Text style={styles.rankingName}>{entry.full_name}</Text>
            {/* Nivel visible arriba junto al nombre */}
            <View style={styles.levelBadgeInline}>
              <Text style={styles.levelIconInline}>{userLevel.icon}</Text>
              <Text style={styles.levelTextInline}>Nv.{userLevel.level}</Text>
            </View>
          </View>
          
          <View style={styles.rankingStats}>
            <Text style={styles.rankingScore}>
              {renderStars(entry.average_score)} {entry.average_score.toFixed(1)}
            </Text>
            <Text style={styles.rankingRatings}>
              {entry.total_ratings} valoraciones
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentRanking = rankingMode === 'global' ? globalRanking : weeklyRanking;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header de Búsqueda */}
        <View style={styles.searchHeader}>
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
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.searchButtonText}>🔍</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Selector de Ranking */}
        <View style={styles.rankingSelectorContainer}>
          <TouchableOpacity
            style={[
              styles.rankingSelectorButton,
              rankingMode === 'global' && styles.rankingSelectorButtonActive
            ]}
            onPress={() => setRankingMode('global')}
          >
            <Text style={[
              styles.rankingSelectorText,
              rankingMode === 'global' && styles.rankingSelectorTextActive
            ]}>
              🌍 Ranking Global
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.rankingSelectorButton,
              rankingMode === 'weekly' && styles.rankingSelectorButtonActive
            ]}
            onPress={() => setRankingMode('weekly')}
          >
            <Text style={[
              styles.rankingSelectorText,
              rankingMode === 'weekly' && styles.rankingSelectorTextActive
            ]}>
              📅 Esta Semana
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ranking */}
        <View style={styles.rankingCard}>
          <Text style={styles.rankingTitle}>
            {rankingMode === 'global' ? '🏆 Top 10 Global' : '📅 Top 10 Semanal'}
          </Text>
          <Text style={styles.rankingSubtitle}>
            {rankingMode === 'global' 
              ? 'Los mejores conductores de la comunidad' 
              : 'Mejores conductores de esta semana'}
          </Text>

          {loadingRanking ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando ranking...</Text>
            </View>
          ) : currentRanking.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {rankingMode === 'weekly'
                  ? '📅 Aún no hay ranking para esta semana.\n\nEl ranking se calcula cada lunes.'
                  : '🏆 Aún no hay suficientes conductores para mostrar el ranking.'}
              </Text>
            </View>
          ) : (
            <View style={styles.rankingList}>
              {currentRanking.map((entry, index) => renderRankingEntry(entry, index))}
            </View>
          )}
        </View>

        {/* Info adicional */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ ¿Cómo funciona el ranking?</Text>
          <Text style={styles.infoText}>
            {rankingMode === 'global'
              ? '• El ranking global se basa en tu promedio de valoraciones\n• Necesitas mínimo 3 valoraciones para aparecer\n• Se actualiza en tiempo real'
              : '• El ranking semanal se calcula cada lunes\n• Solo se consideran valoraciones de esa semana\n• Los ganadores del top 3 reciben medallas 🥇🥈🥉'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
  },
  searchHeader: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#999',
  },
  searchButtonText: {
    fontSize: 24,
  },
  rankingSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rankingSelectorButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rankingSelectorButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  rankingSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  rankingSelectorTextActive: {
    color: '#FFF',
  },
  rankingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  rankingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  rankingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  rankingList: {
    gap: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    gap: 12,
  },
  rankingItemTopThree: {
    backgroundColor: '#FFF9E6',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  positionContainer: {
    width: 40,
    alignItems: 'center',
  },
  positionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  positionTextTopThree: {
    fontSize: 24,
  },
  rankingAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  rankingAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rankingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  rankingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankingScore: {
    fontSize: 12,
    color: '#666',
  },
  rankingRatings: {
    fontSize: 11,
    color: '#999',
  },
  levelBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  levelIconInline: {
    fontSize: 14,
  },
  levelTextInline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
});
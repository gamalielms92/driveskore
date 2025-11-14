// app/conductor/[plate].tsx

import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import WeeklyRankingService from '../../src/services/WeeklyRankingService';
import {
  calculateAttributeStats,
  DRIVING_ATTRIBUTES,
  getDriverRank,
  getEarnedBadges,
  getUserLevel,
  type AttributeStats,
  type UserStats
} from '../../src/utils/gamification';
import { getVehicleIcon } from '../../src/utils/vehicleHelpers';

interface Rating {
  id: string;
  score: number;
  comment: string;
  created_at: string;
  plate: string;
  rater_name: string; 
  respects_lights?: boolean | null;
  keeps_distance?: boolean | null;
  uses_signals?: boolean | null;
  yields_right?: boolean | null;
  appropriate_speed?: boolean | null;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  badge_counts?: {
    gold: number;
    silver: number;
    bronze: number;
  };
  pilot_survey_completed?: boolean;
}

interface Vehicle {
  id: string;
  plate: string;
  nickname: string | null;
  online: boolean;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vehicle_type: string | null;
  vehicle_photo_url: string | null;
  is_primary: boolean;
}

interface VehicleProfile {
  plate: string;
  total_score: number;
  num_ratings: number;
  positive_attributes: { [key: string]: number };
  total_votes: number;
}

export default function ConductorProfileScreen() {
  const { plate } = useLocalSearchParams<{ plate: string }>();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleProfile[]>([]);
  const [allRatings, setAllRatings] = useState<Rating[]>([]);
  const [aggregatedProfile, setAggregatedProfile] = useState<VehicleProfile | null>(null);
  const [userRatingsGivenCount, setUserRatingsGivenCount] = useState(0);
  const [globalPosition, setGlobalPosition] = useState<number | null>(null);
  
  useFocusEffect(
    useCallback(() => {
      loadPersonData();
    }, [plate])
  );

  const loadPersonData = async () => {
    try {
      // 1. Buscar el dueño del vehículo por la matrícula
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('user_vehicles')
        .select('user_id')
        .eq('plate', plate)
        .maybeSingle();

      if (vehicleError) throw vehicleError;

      if (!vehicleData) {
        // Si no hay dueño registrado, mostrar error
        Alert.alert(
          'Conductor no encontrado',
          'Esta matrícula no está registrada en DriveSkore.'
        );
        setLoading(false);
        return;
      }

      const userId = vehicleData.user_id;

      // 2. Cargar perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      setUserProfile(profile || {
        user_id: userId,
        full_name: 'Usuario sin nombre',
        avatar_url: null,
        bio: null,
        phone: null,
        badge_counts: { gold: 0, silver: 0, bronze: 0 },
        pilot_survey_completed: false,
      });

      // 3. Cargar TODOS los vehículos de esta persona
      const { data: userVehicles, error: vehiclesError } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      setVehicles(userVehicles || []);

      // Cargar cuántas valoraciones ha hecho este usuario
      const { count: userRatingsGiven } = await supabase
      .from('ratings')
      .select('*', { count: 'exact', head: true })
      .eq('rater_id', userId);
      setUserRatingsGivenCount(userRatingsGiven || 0);

      // Cargar posición global
      try {
        const position = await WeeklyRankingService.getUserGlobalPosition(userId);
        setGlobalPosition(position === 9999 ? null : position);
      } catch (error) {
        console.error('Error cargando posición global:', error);
      }

      // 4. Cargar perfiles de valoraciones de cada vehículo
      const profiles: VehicleProfile[] = [];
      let allUserRatings: Rating[] = [];

      for (const vehicle of userVehicles || []) {
        // Cargar perfil del vehículo
        const { data: vProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('plate', vehicle.plate)
          .eq('user_id', userId)
          .maybeSingle();

        if (vProfile) {
          profiles.push({
            plate: vProfile.plate,
            total_score: vProfile.total_score,
            num_ratings: vProfile.num_ratings,
            positive_attributes: vProfile.positive_attributes || {},
            total_votes: vProfile.total_votes || 0
          });
        }

        // Cargar valoraciones del vehículo con nombre del valorador
        // Cargar valoraciones del vehículo (SIN nombre del valorador por ahora)
      const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('*')
      .eq('plate', vehicle.plate)
      .order('created_at', { ascending: false });

      console.log('📊 Ratings cargadas:', ratings?.length || 0);
      console.log('❌ Error:', ratingsError);

      if (ratings) {
      // Cargar nombres de valoradores después (uno por uno si hace falta)
      const ratingsWithNames = await Promise.all(
        ratings.map(async (r) => {
          const { data: raterProfile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', r.rater_id)
            .maybeSingle();
          
          return {
            ...r,
            rater_name: raterProfile?.full_name || 'Usuario anónimo'
          };
        })
      );

      console.log('✅ Ratings procesadas:', ratingsWithNames.length);
      allUserRatings = [...allUserRatings, ...ratingsWithNames];
      }}

      setVehicleProfiles(profiles);
      setAllRatings(allUserRatings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));

      for (const vehicle of userVehicles || []) {
        console.log('🔍 Cargando ratings para vehículo:', vehicle.plate);
        
        // Cargar valoraciones del vehículo con nombre del valorador
        const { data: ratings, error: ratingsError } = await supabase
          .from('ratings')
          .select('*, rater:user_profiles!ratings_rater_id_fkey(full_name)')
          .eq('plate', vehicle.plate)
          .order('created_at', { ascending: false });
      
        console.log('📊 Ratings cargadas:', ratings?.length || 0);
        console.log('❌ Error:', ratingsError);
        
        if (ratings) {
          const ratingsWithNames = ratings.map(r => ({
            ...r,
            rater_name: r.rater?.full_name || 'Usuario anónimo'
          }));
          console.log('✅ Ratings procesadas:', ratingsWithNames.length);
          allUserRatings = [...allUserRatings, ...ratingsWithNames];
        }
      }
      
      console.log('📦 Total allUserRatings acumuladas:', allUserRatings.length);

      // 5. Agregar todas las valoraciones de todos los vehículos
      const aggregated = aggregateProfiles(profiles);
      setAggregatedProfile(aggregated);

    } catch (error: any) {
      console.error('Error loading person data:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil del conductor');
    } finally {
      setLoading(false);
    }
  };

  const aggregateProfiles = (profiles: VehicleProfile[]): VehicleProfile | null => {
    if (profiles.length === 0) return null;

    let totalScore = 0;
    let totalRatings = 0;
    let totalVotes = 0;
    const combinedAttributes: { [key: string]: number } = {};

    profiles.forEach(profile => {
      totalScore += profile.total_score;
      totalRatings += profile.num_ratings;
      totalVotes += profile.total_votes;

      Object.entries(profile.positive_attributes).forEach(([key, value]) => {
        combinedAttributes[key] = (combinedAttributes[key] || 0) + value;
      });
    });

    return {
      plate: 'AGGREGATED',
      total_score: totalScore,
      num_ratings: totalRatings,
      positive_attributes: combinedAttributes,
      total_votes: totalVotes
    };
  };

  const calculateAverage = () => {
    if (!aggregatedProfile || aggregatedProfile.num_ratings === 0) return 0;
    return aggregatedProfile.total_score / aggregatedProfile.num_ratings;
  };

  const renderStars = (score: number) => {
    return '⭐'.repeat(Math.round(score)) + '☆'.repeat(5 - Math.round(score));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return date.toLocaleDateString('es-ES');
  };

  const getScoreDistribution = () => {
    const distribution = [0, 0, 0, 0, 0];
    allRatings.forEach(r => {
      if (r.score >= 1 && r.score <= 5) {
        distribution[r.score - 1]++;
      }
    });
    return distribution;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Cargando...' }} />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!userProfile || !aggregatedProfile) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'No encontrado' }} />
        <Text style={styles.emptyText}>❌</Text>
        <Text style={styles.emptyMessage}>
          Esta matrícula no está registrada en DriveSkore
        </Text>
        <Text style={styles.emptySubtext}>
          Solo los conductores registrados tienen perfil
        </Text>
      </View>
    );
  }

  const average = calculateAverage();
  const distribution = getScoreDistribution();
  const driverRank = getDriverRank(average);

  const userStats: UserStats = {
    ratingsGiven: userRatingsGivenCount,
    ratingsReceived: aggregatedProfile.num_ratings,
    averageScore: aggregatedProfile.num_ratings > 0 
      ? aggregatedProfile.total_score / aggregatedProfile.num_ratings 
      : 0,
    badgeCounts: userProfile?.badge_counts || { gold: 0, silver: 0, bronze: 0 },
    pilotSurveyCompleted: userProfile?.pilot_survey_completed || false,
  };
  
  const earnedBadges = getEarnedBadges(userStats);
  const userLevel = getUserLevel(userRatingsGivenCount);
  const attributeStats: AttributeStats = calculateAttributeStats(
    aggregatedProfile.positive_attributes,
    aggregatedProfile.total_votes
  );

  // Renderizado
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: userProfile.full_name,
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
        }} 
      />

      {/* HEADER CENTRADO EN PERSONA */}
      <View style={styles.personHeader}>
        {/* Foto de perfil */}
        {userProfile.avatar_url ? (
          <Image
            source={{ uri: userProfile.avatar_url }}
            style={styles.avatarLarge}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {userProfile.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Nombre */}
        <Text style={styles.personName}>{userProfile.full_name}</Text>

        {/* Bio */}
        {userProfile.bio && (
          <Text style={styles.personBio}>{userProfile.bio}</Text>
        )}

        {/* Stats rápidos */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{vehicles.length}</Text>
            <Text style={styles.quickStatLabel}>Vehículo{vehicles.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{aggregatedProfile.num_ratings}</Text>
            <Text style={styles.quickStatLabel}>Valoraciones</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{average.toFixed(1)}</Text>
            <Text style={styles.quickStatLabel}>Promedio</Text>
          </View>
        </View>
      </View>

      {/* VEHÍCULOS DE LA PERSONA */}
      {vehicles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🚗 Vehículos de {userProfile.full_name}
          </Text>
          {vehicles.map((vehicle) => {
            const vProfile = vehicleProfiles.find(p => p.plate === vehicle.plate);
            const vAvg = vProfile && vProfile.num_ratings > 0 
              ? vProfile.total_score / vProfile.num_ratings 
              : 0;

            return (
              <View key={vehicle.id} style={styles.vehicleCard}>
                <View style={styles.vehicleCardHeader}>
                  {vehicle.vehicle_photo_url ? (
                    <Image
                      source={{ uri: vehicle.vehicle_photo_url }}
                      style={styles.vehiclePhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.vehiclePhotoPlaceholder}>
                      <Text style={styles.vehiclePhotoIcon}>
                        {getVehicleIcon(vehicle.vehicle_type || 'car')}
                      </Text>
                    </View>
                  )}

                    <View style={styles.vehicleInfo}>
                    <View style={styles.vehicleTitleRow}>
                      <Text style={styles.vehicleTitle}>
                        {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Vehículo'}
                        {vehicle.online && ' 🟢'}
                        {vehicle.is_primary && ' ⭐'}
                      </Text>
                    </View>
                    
                    {vehicle.year && (
                      <Text style={styles.vehicleDetails}>
                        Año {vehicle.year}
                      </Text>
                    )}
                    
                    {vehicle.color && (
                      <Text style={styles.vehicleColor}>• {vehicle.color}</Text>
                    )}

                    {vehicle.nickname && (
                      <Text style={styles.vehicleNickname}>"{vehicle.nickname}"</Text>
                    )}
                  </View>

                  {vProfile && vProfile.num_ratings > 0 && (
                    <View style={styles.vehicleStats}>
                      <Text style={styles.vehicleScore}>{vAvg.toFixed(1)}</Text>
                      <Text style={styles.vehicleRatings}>{vProfile.num_ratings} val.</Text>
                    </View>
                  )}
                </View>

                {vehicle.plate === plate && (
                  <View style={styles.currentVehicleBadge}>
                    <Text style={styles.currentVehicleText}>👁️ Mostrado para recibir valoraciones</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
      
      {/* Actividad  en driveskore */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Actividad en DriveSkore</Text>
        
        {/* Nivel */}
        <View style={styles.levelDisplayCard}>
          <Text style={styles.levelDisplayIcon}>{userLevel.icon}</Text>
          <View style={styles.levelDisplayInfo}>
            <Text style={styles.levelDisplayTitle}>
              Nivel {userLevel.level}: {userLevel.name}
            </Text>
            <Text style={styles.levelDisplayDesc}>{userLevel.description}</Text>
            <Text style={styles.levelDisplayCount}>
              {userRatingsGivenCount} valoraciones realizadas
            </Text>
          </View>
        </View>
      </View>

      {/* Rango del conductor */}
      <View style={[styles.rankCard, { backgroundColor: driverRank.color + '15' }]}>
        <Text style={styles.rankIcon}>{driverRank.icon}</Text>
        <View style={styles.rankInfo}>
          <Text style={[styles.rankName, { color: driverRank.color }]}>
            {driverRank.name}
          </Text>
          <Text style={styles.rankDescription}>{driverRank.description}</Text>
        </View>
      </View>

      {/* Puntuación principal */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreValue}>{average.toFixed(1)}</Text>
        <Text style={styles.scoreStars}>{renderStars(Math.round(average))}</Text>
        <Text style={styles.scoreLabel}>
          Basado en {aggregatedProfile.num_ratings} voto{aggregatedProfile.num_ratings !== 1 ? 's' : ''}
          {vehicles.length > 1 && ` en ${vehicles.length} vehículos`}
        </Text>
      </View>

        {/* 🆕 POSICIÓN GLOBAL */}
        {globalPosition && (
          <View style={styles.globalPositionCard}>
            <Text style={styles.globalPositionTitle}>🌍 Posición Global</Text>
            <Text style={styles.globalPositionNumber}>#{globalPosition}</Text>
          </View>
        )}

      {/* Insignias */}
      {earnedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏅 Insignias Conseguidas</Text>
          <View style={styles.badgesContainer}>
            {earnedBadges.map(badge => (
              <View key={badge.id} style={styles.badge}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

{/* Calcular votos reales desde ratings */}
{(() => {
  // Contar votos por atributo directamente desde allRatings
// 🔍 DEBUG - Ver qué datos tenemos
console.log('=== DEBUG ESTADÍSTICAS ===');
console.log('Total ratings:', allRatings.length);
console.log('Primera rating:', allRatings[0]);
console.log('DRIVING_ATTRIBUTES[0].id:', DRIVING_ATTRIBUTES[0]?.id);

  const realAttributeVotes = DRIVING_ATTRIBUTES.map(attr => {
    const positive = allRatings.filter(r => r[attr.id as keyof Rating] === true).length;
    const negative = allRatings.filter(r => r[attr.id as keyof Rating] === false).length;
    const total = positive + negative;
    
    return {
      id: attr.id,
      label: attr.label,
      icon: attr.icon,
      positive,
      negative,
      total,
      percentage: total > 0 ? Math.round((positive / total) * 100) : 0
    };
  }).filter(stat => stat.total > 0); // Solo mostrar atributos con votos

  if (realAttributeVotes.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📊 Estadísticas Detalladas</Text>
      {realAttributeVotes.map(stat => (
        <View key={stat.id} style={styles.attributeBidirectionalRow}>
          <View style={styles.attributeLabelContainer}>
            <Text style={styles.attributeIcon}>{stat.icon}</Text>
            <Text style={styles.attributeLabel}>{stat.label}</Text>
          </View>

          <View style={styles.bidirectionalBarContainer}>
            {/* Lado Negativo */}
            <View style={styles.negativeBarSection}>
              <Text style={styles.negativePercentageText}>
                {Math.round((stat.negative / stat.total) * 100)}%
              </Text>
              <View style={styles.negativeBarWrapper}>
                <View 
                  style={[
                    styles.negativeBar,
                    { width: `${(stat.negative / stat.total) * 100}%` }
                  ]}
                />
              </View>
            </View>

            <View style={styles.centerDivider} />

            {/* Lado Positivo */}
            <View style={styles.positiveBarSection}>
              <View style={styles.positiveBarWrapper}>
                <View 
                  style={[
                    styles.positiveBar,
                    { width: `${stat.percentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.positivePercentageText}>{stat.percentage}%</Text>
            </View>
          </View>

          <View style={styles.votesCounter}>
            <Text style={styles.votesText}>
              {stat.negative} ❌ | ✅ {stat.positive}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
})()}

      {/* Distribución de puntuaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Distribución de Valoraciones</Text>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = distribution[stars - 1];
          const percentage = aggregatedProfile.num_ratings > 0 
            ? (count / aggregatedProfile.num_ratings) * 100 
            : 0;

          return (
            <View key={stars} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{stars}⭐</Text>
              <View style={styles.distributionBarContainer}>
                <View 
                  style={[
                    styles.distributionBar, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.distributionCount}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Comentarios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Comentarios ({allRatings.filter(r => r.comment).length})</Text>
        
        {allRatings.filter(r => r.comment).length === 0 ? (
          <View style={styles.emptyComments}>
            <Text style={styles.emptyCommentsText}>Sin comentarios aún</Text>
          </View>
        ) : (
          allRatings
            .filter(r => r.comment)
            .map((rating) => (
              <View key={rating.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View>
                    <Text style={styles.commentStars}>
                      {renderStars(rating.score)}
                    </Text>
                    {/* NUEVO: Mostrar quién valoró */}
                    <Text style={styles.commentRater}>
                      Por {rating.rater_name || 'Usuario anónimo'}
                    </Text>
                    {vehicles.length > 1 && (() => {
                      // Buscar el vehículo que coincide con la matrícula del rating
                      const ratingVehicle = vehicles.find(v => v.plate === rating.plate);
                      const vehicleInfo = ratingVehicle?.brand && ratingVehicle?.model
                        ? `${ratingVehicle.brand} ${ratingVehicle.model}`
                        : 'Vehículo';  // <-- NO mostrar rating.plate
                      
                      return (
                        <Text style={styles.commentPlate}>Sobre {vehicleInfo}</Text>
                      );
                    })()}
                  </View>
                  <Text style={styles.commentDate}>
                    {formatDate(rating.created_at)}
                  </Text>
                </View>
                <Text style={styles.commentText}>"{rating.comment}"</Text>
              </View>
            ))
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Los datos reflejan la opinión de la comunidad DriveSkore
        </Text>
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
  
  // 🆕 HEADER CENTRADO EN PERSONA
  personHeader: {
    backgroundColor: 'white',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  personName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  personBio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  quickStats: {
    flexDirection: 'row',
    marginTop: 10,
  },
  quickStatItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#ddd',
  },

  // Header genérico (fallback)
  header: {
    backgroundColor: '#007AFF',
    padding: 30,
    alignItems: 'center',
  },
  plateIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  plate: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 3,
  },
  genericLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
  },

  // 🆕 CARDS DE VEHÍCULOS
  vehicleCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehiclePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  vehiclePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehiclePhotoIcon: {
    fontSize: 40,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  vehicleColor: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  vehicleNickname: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  vehicleStats: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  vehicleScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
  },
  vehicleRatings: {
    fontSize: 11,
    color: '#999',
  },
  currentVehicleBadge: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  currentVehicleText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  levelDisplayCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  levelDisplayIcon: {
    fontSize: 48,
    marginRight: 15,
  },
  levelDisplayInfo: {
    flex: 1,
  },
  levelDisplayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  levelDisplayDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  levelDisplayCount: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 20,
    color: '#000',
  },
  rankCard: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankIcon: {
    fontSize: 50,
    marginRight: 15,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  rankDescription: {
    fontSize: 14,
    color: '#666',
  },
  scoreCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 10,
  },
  scoreStars: {
    fontSize: 32,
    marginBottom: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  // 🆕 Posición Global
  globalPositionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  globalPositionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  globalPositionNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  topAttributeCard: {
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
  topAttributeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  topAttributeRank: {
    fontSize: 28,
    marginRight: 8,
  },
  topAttributeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  topAttributeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  topAttributeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  topAttributePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
    width: 50,
    textAlign: 'right',
  },
  topAttributeVotes: {
    fontSize: 12,
    color: '#999',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  distributionLabel: {
    width: 50,
    fontSize: 16,
  },
  distributionBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  distributionCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 14,
    color: '#666',
  },
  commentCard: {
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
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentRater: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  commentStars: {
    fontSize: 20,
  },
  commentPlate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  emptyComments: {
    padding: 30,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#999',
  },
  emptyText: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptySubtext: { 
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 18,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  attributeBidirectionalRow: {
    marginBottom: 20,
  },
  attributeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attributeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  attributeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  bidirectionalBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  negativeBarSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  negativePercentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginRight: 8,
    minWidth: 35,
    textAlign: 'right',
  },
  negativeBarWrapper: {
    flex: 1,
    height: 20,
    backgroundColor: '#FFE5E5',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  negativeBar: {
    height: '100%',
    backgroundColor: '#FF3B30',
  },
  centerDivider: {
    width: 3,
    height: 30,
    backgroundColor: '#333',
    marginHorizontal: 2,
  },
  positiveBarSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  positiveBarWrapper: {
    flex: 1,
    height: 20,
    backgroundColor: '#E8F5E9',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  positiveBar: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  positivePercentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34C759',
    marginLeft: 8,
    minWidth: 35,
    textAlign: 'left',
  },
  votesCounter: {
    alignItems: 'center',
    marginTop: 4,
  },
  votesText: {
    fontSize: 11,
    color: '#999',
  }
});
// app/(tabs)/profile.tsx

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import EventCaptureService from '../../src/services/EventCaptureService';
import WeeklyRankingService from '../../src/services/WeeklyRankingService';
import {
  getDriverRank,
  getEarnedBadges,
  getLevelProgress,
  getLockedBadges,
  getUserLevel,
  type UserStats
} from '../../src/utils/gamification';

interface UserRating {
  id: string;
  plate: string;
  score: number;
  comment: string;
  created_at: string;
}

interface Vehicle {
  id: string;
  plate: string;
  nickname: string | null;
  online: boolean;
  vehicle_type?: string;
}

interface DriverProfile {
  plate: string;
  total_score: number;
  num_ratings: number;
  positive_attributes: { [key: string]: number };
  total_votes: number;
}

interface UserProfile {
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

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverProfiles, setDriverProfiles] = useState<DriverProfile[]>([]);
  const [globalPosition, setGlobalPosition] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalRatingsGiven: 0,
    totalRatingsReceived: 0,
    averageScore: 0,
    memberSince: '',
  });

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      setEmail(user.email || 'Sin email');
      setUserId(user.id);

      // Cargar perfil de usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserProfile(profile);

      // Cargar valoraciones HECHAS por el usuario (a otros)
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('*')
        .eq('rater_id', user.id)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      setUserRatings(ratings || []);

      // Cargar vehículos del usuario
      const { data: userVehicles, error: vehiclesError } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      setVehicles(userVehicles || []);

      // Cargar perfiles como CONDUCTOR (valoraciones RECIBIDAS)
      const driverProfilesData: DriverProfile[] = [];
      
      for (const vehicle of userVehicles || []) {
        const { data: driverProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('plate', vehicle.plate)
          .eq('user_id', user.id)
          .maybeSingle();

        if (driverProfile) {
          driverProfilesData.push({
            plate: driverProfile.plate,
            total_score: driverProfile.total_score,
            num_ratings: driverProfile.num_ratings,
            positive_attributes: driverProfile.positive_attributes || {},
            total_votes: driverProfile.total_votes || 0
          });
        }
      }

      setDriverProfiles(driverProfilesData);

      // Calcular posición global
      try {
        const position = await WeeklyRankingService.getUserGlobalPosition(user.id);
        setGlobalPosition(position === 9999 ? null : position);
      } catch (error) {
        console.error('Error cargando posición global:', error);
      }

      // Calcular estadísticas
      const totalGiven = ratings?.length || 0;
      const avgGivenScore = totalGiven > 0 
        ? ratings!.reduce((sum, r) => sum + r.score, 0) / totalGiven 
        : 0;
      
      // Total recibidas
      let totalReceived = 0;
      let totalReceivedScore = 0;
      driverProfilesData.forEach(p => {
        totalReceived += p.num_ratings;
        totalReceivedScore += p.total_score;
      });
      
      const avgReceivedScore = totalReceived > 0 ? totalReceivedScore / totalReceived : 0;
      
      const memberSince = user.created_at 
        ? new Date(user.created_at).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long' 
          })
        : 'Desconocido';

      setStats({
        totalRatingsGiven: totalGiven,
        totalRatingsReceived: totalReceived,
        averageScore: avgReceivedScore,
        memberSince,
      });

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // ✅ En web usamos window.confirm
      const confirmed = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
      if (confirmed) {
        try {
          await EventCaptureService.cleanup();
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        } catch (error) {
          console.error('Error cerrando sesión:', error);
          alert('Error al cerrar sesión. Por favor intenta de nuevo.');
        }
      }
    } else {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await EventCaptureService.cleanup();
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  }};

  const renderStars = (score: number) => {
    return '⭐'.repeat(Math.round(score)) + '☆'.repeat(5 - Math.round(score));
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  // Calcular nivel y progreso
  const userLevel = getUserLevel(stats.totalRatingsGiven);
  const levelProgress = getLevelProgress(stats.totalRatingsGiven);
  
  // Calcular rango como conductor
  const driverRank = stats.totalRatingsReceived > 0 
    ? getDriverRank(stats.averageScore) 
    : null;

  // Preparar UserStats para badges
  const userStatsForBadges: UserStats = {
    ratingsGiven: stats.totalRatingsGiven,
    ratingsReceived: stats.totalRatingsReceived,
    averageScore: stats.averageScore,
    badgeCounts: userProfile?.badge_counts || { gold: 0, silver: 0, bronze: 0 },
    pilotSurveyCompleted: userProfile?.pilot_survey_completed || false,
  };

  const earnedBadges = getEarnedBadges(userStatsForBadges);
  const lockedBadges = getLockedBadges(userStatsForBadges);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header con foto y nombre */}
        <View style={styles.header}>
          {userProfile?.avatar_url ? (
            <Image
              source={{ uri: userProfile.avatar_url }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatar}>
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : '👤'}
            </Text>
          )}
          
          <Text style={styles.fullName}>
            {userProfile?.full_name || 'Usuario sin nombre'}
          </Text>
          
          {!userProfile && (
            <View style={styles.incompleteProfileBadge}>
              <Text style={styles.incompleteProfileText}>⚠️ Perfil incompleto</Text>
            </View>
          )}
          
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.memberSince}>Miembro desde {stats.memberSince}</Text>
          
          {userProfile?.bio && (
            <Text style={styles.bio}>{userProfile.bio}</Text>
          )}

          <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => {
                if (vehicles.length > 0 && vehicles[0].online) {
                  router.push(`/conductor/${vehicles[0].plate}`);
                } else if (vehicles.length > 0) {
                  router.push(`/conductor/${vehicles[0].plate}`);
                }
              }}
            >
              <Text style={styles.viewDetailsButtonText}>Ver perfil público →</Text>
          </TouchableOpacity>

        </View>

        {/* Botón editar perfil */}
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.editProfileButtonText}>
            {userProfile ? '✏️ Editar Perfil' : '➕ Completar Perfil'}
          </Text>
        </TouchableOpacity>

        {/* 🆕 SISTEMA DE NIVELES */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelIcon}>{userLevel.icon}</Text>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Nivel {userLevel.level}: {userLevel.name}</Text>
              <Text style={styles.levelDescription}>{userLevel.description}</Text>
            </View>
          </View>
          
          {/* Barra de progreso */}
          {levelProgress.nextLevel && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${levelProgress.progressPercentage}%`,
                      backgroundColor: userLevel.color 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {levelProgress.currentRatings} / {levelProgress.nextLevel.minRatings} evaluaciones
              </Text>
              <Text style={styles.progressHint}>
                Te faltan {levelProgress.ratingsToNext} para alcanzar {levelProgress.nextLevel.name}
              </Text>
            </View>
          )}
          
          {!levelProgress.nextLevel && (
            <Text style={styles.maxLevelText}>
              ¡Has alcanzado el nivel máximo! 🏆
            </Text>
          )}
        </View>

        {/* 🆕 POSICIÓN GLOBAL */}
        {globalPosition && (
          <View style={styles.globalPositionCard}>
            <Text style={styles.globalPositionTitle}>🌍 Posición Global</Text>
            <Text style={styles.globalPositionNumber}>#{globalPosition}</Text>
            <TouchableOpacity 
              style={styles.viewRankingButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.viewRankingButtonText}>Ver Ranking Completo →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reputación como conductor */}
        {stats.totalRatingsReceived > 0 && driverRank && (
          <View style={styles.driverReputationCard}>
            <Text style={styles.sectionTitle}>🚗 Mi Reputación como Conductor</Text>
            
            {/* Rango */}
            <View style={[styles.rankBadge, { backgroundColor: driverRank.color + '15' }]}>
              <Text style={styles.rankIcon}>{driverRank.icon}</Text>
              <View style={styles.rankInfo}>
                <Text style={[styles.rankName, { color: driverRank.color }]}>
                  {driverRank.name}
                </Text>
                <Text style={styles.rankDescription}>{driverRank.description}</Text>
              </View>
            </View>

            {/* Puntuación */}
            <View style={styles.driverScoreContainer}>
              <View style={styles.driverScoreItem}>
                <Text style={styles.driverScoreValue}>
                  {stats.averageScore.toFixed(1)}
                </Text>
                <Text style={styles.driverScoreLabel}>Promedio</Text>
              </View>
              <View style={styles.driverScoreDivider} />
              <View style={styles.driverScoreItem}>
                <Text style={styles.driverScoreValue}>
                  {stats.totalRatingsReceived}
                </Text>
                <Text style={styles.driverScoreLabel}>Valoraciones{'\n'}recibidas</Text>
              </View>
            </View>
          </View>
        )}

        {/* Estadísticas de evaluaciones HECHAS */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>📊 Mis Evaluaciones a Otros</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalRatingsGiven}</Text>
              <Text style={styles.statLabel}>Realizadas</Text>
            </View>
          </View>
        </View>

        {/* 🆕 INSIGNIAS */}
        <View style={styles.badgesCard}>
          <Text style={styles.sectionTitle}>🏅 Mis Insignias</Text>
          
          {/* Insignias desbloqueadas */}
          {earnedBadges.length > 0 && (
            <View style={styles.badgesSection}>
              <Text style={styles.badgesSubtitle}>Desbloqueadas ({earnedBadges.length})</Text>
              <View style={styles.badgesList}>
                {earnedBadges.map(badge => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    {badge.count !== undefined && badge.count > 0 && (
                      <Text style={styles.badgeCount}>x{badge.count}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Insignias bloqueadas */}
          {lockedBadges.length > 0 && (
            <View style={styles.badgesSection}>
              <Text style={styles.badgesSubtitle}>Bloqueadas ({lockedBadges.length})</Text>
              <View style={styles.badgesList}>
                {lockedBadges.map(badge => (
                  <View key={badge.id} style={[styles.badgeItem, styles.badgeItemLocked]}>
                    <Text style={styles.badgeIconLocked}>{badge.icon}</Text>
                    <Text style={styles.badgeNameLocked}>{badge.name}</Text>
                    {badge.progress && (
                      <Text style={styles.badgeProgress}>{badge.progress}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Mi Garaje */}
        <TouchableOpacity
          style={styles.vehiclesCard}
          onPress={() => router.push('/select-vehicle')}
        >
          <Text style={styles.sectionTitle}>🏢 Mi Garaje</Text>
          
          {vehicles.length === 0 ? (
            <Text style={styles.vehiclesText}>
              No tienes vehículos registrados. Añade uno para recibir valoraciones en tu perfil.
            </Text>
          ) : (
            <View style={styles.vehiclesList}>
              {vehicles.slice(0, 3).map(vehicle => {
                // Determinar icono según tipo
                const vehicleIcon = vehicle.vehicle_type === 'motorcycle' ? '🏍️'
                  : vehicle.vehicle_type === 'bike' ? '🚲'
                  : vehicle.vehicle_type === 'scooter' ? '🛴'
                  : '🚗';
                
                // Determinar qué mostrar (matrícula, nickname o tipo)
                const displayText = vehicle.plate 
                  || vehicle.nickname 
                  || (vehicle.vehicle_type === 'bike' ? 'Bicicleta' 
                    : vehicle.vehicle_type === 'scooter' ? 'Patinete' 
                    : 'Vehículo');
                
                return (
                  <View key={vehicle.id} style={styles.vehicleItem}>
                    <Text style={styles.vehicleIcon}>{vehicleIcon}</Text>
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehiclePlate}>{displayText}</Text>
                      {vehicle.nickname && vehicle.plate && (
                        <Text style={styles.vehicleNickname}>{vehicle.nickname}</Text>
                      )}
                    </View>
                    {vehicle.online && (
                      <View style={styles.onlineBadge}>
                        <Text style={styles.onlineBadgeText}>Activo</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              
              {vehicles.length > 3 && (
                <Text style={styles.moreVehicles}>+{vehicles.length - 3} más</Text>
              )}
            </View>
          )}
          
          <Text style={styles.manageVehiclesText}>Toca para gestionar vehículos →</Text>
        </TouchableOpacity>

        {/* Botón Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 80,
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  incompleteProfileBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  incompleteProfileText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editProfileButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  editProfileButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // 🆕 Estilos de Niveles
  levelCard: {
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
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  progressHint: {
    fontSize: 12,
    color: '#999',
  },
  maxLevelText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    textAlign: 'center',
  },
  // 🆕 Posición Global
  globalPositionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  viewRankingButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  viewRankingButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  driverReputationCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  rankIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rankDescription: {
    fontSize: 14,
    color: '#666',
  },
  driverScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  driverScoreItem: {
    alignItems: 'center',
  },
  driverScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  driverScoreLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  driverScoreDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
  },
  viewDetailsButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // 🆕 Badges
  badgesCard: {
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
  badgesSection: {
    marginBottom: 20,
  },
  badgesSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: '30%',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  badgeCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 4,
  },
  badgeItemLocked: {
    opacity: 0.4,
  },
  badgeIconLocked: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeNameLocked: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  badgeProgress: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  vehiclesCard: {
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
  vehiclesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  vehiclesList: {
    marginBottom: 12,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 8,
  },
  vehicleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  vehicleNickname: {
    fontSize: 12,
    color: '#666',
  },
  onlineBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  onlineBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  moreVehicles: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  manageVehiclesText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
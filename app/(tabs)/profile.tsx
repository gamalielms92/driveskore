// app/(tabs)/profile.tsx

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import EventCaptureService from '../../src/services/EventCaptureService';
import {
  calculateAttributeStats,
  getDriverRank,
  getEarnedBadges
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
  const [stats, setStats] = useState({
    totalRatings: 0,
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

      // ✨ NUEVO: Cargar perfil de usuario
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('plate', vehicle.plate)
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          driverProfilesData.push({
            plate: profile.plate,
            total_score: profile.total_score,
            num_ratings: profile.num_ratings,
            positive_attributes: profile.positive_attributes || {},
            total_votes: profile.total_votes || 0
          });
        }
      }

      setDriverProfiles(driverProfilesData);

      // Calcular estadísticas de evaluaciones HECHAS
      const total = ratings?.length || 0;
      const avgScore = total > 0 
        ? ratings!.reduce((sum, r) => sum + r.score, 0) / total 
        : 0;
      
      const memberSince = user.created_at 
        ? new Date(user.created_at).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long' 
          })
        : 'Desconocido';

      setStats({
        totalRatings: total,
        averageScore: avgScore,
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
  };

  const renderStars = (score: number) => {
    return '⭐'.repeat(Math.round(score)) + '☆'.repeat(5 - Math.round(score));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  const calculateDriverStats = () => {
    let totalScore = 0;
    let totalRatings = 0;
    let totalVotes = 0;
    const combinedAttributes: { [key: string]: number } = {};

    driverProfiles.forEach(profile => {
      totalScore += profile.total_score;
      totalRatings += profile.num_ratings;
      totalVotes += profile.total_votes;

      Object.entries(profile.positive_attributes).forEach(([key, value]) => {
        combinedAttributes[key] = (combinedAttributes[key] || 0) + value;
      });
    });

    const average = totalRatings > 0 ? totalScore / totalRatings : 0;

    return {
      average,
      totalRatings,
      totalVotes,
      attributes: combinedAttributes
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  const driverStats = calculateDriverStats();
  const driverRank = driverStats.totalRatings > 0 ? getDriverRank(driverStats.average) : null;
  
  const combinedProfile = driverStats.totalRatings > 0 ? {
    plate: 'COMBINED',
    total_score: driverStats.average * driverStats.totalRatings,
    num_ratings: driverStats.totalRatings,
    positive_attributes: driverStats.attributes,
    total_votes: driverStats.totalVotes
  } : null;

  const earnedBadges = combinedProfile ? getEarnedBadges(combinedProfile) : [];
  
  // Calcular estadísticas de atributos correctamente
  const attributeStats = combinedProfile 
    ? calculateAttributeStats(combinedProfile.positive_attributes, combinedProfile.total_votes)
    : {};
  
  // Obtener top 3 atributos desde las estadísticas calculadas
  const topAttributes = Object.keys(attributeStats).length > 0
    ? Object.values(attributeStats)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3)
    : [];

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
        </View>

        {/* ✨ NUEVO: Botón editar perfil */}
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.editProfileButtonText}>
            {userProfile ? '✏️ Editar Perfil' : '➕ Completar Perfil'}
          </Text>
        </TouchableOpacity>

        {/* Reputación como conductor */}
        {driverStats.totalRatings > 0 && driverRank && (
          <>
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
                    {driverStats.average.toFixed(1)}
                  </Text>
                  <Text style={styles.driverScoreLabel}>Promedio</Text>
                </View>
                <View style={styles.driverScoreDivider} />
                <View style={styles.driverScoreItem}>
                  <Text style={styles.driverScoreValue}>
                    {driverStats.totalRatings}
                  </Text>
                  <Text style={styles.driverScoreLabel}>Valoraciones{'\n'}recibidas</Text>
                </View>
              </View>

              {/* Top 3 Atributos */}
              {topAttributes.length > 0 && (
                <View style={styles.topAttributesSection}>
                  <Text style={styles.subsectionTitle}>✨ Mejores Cualidades</Text>
                  {topAttributes.slice(0, 3).map((attr, index) => (
                    <View key={attr.id} style={styles.topAttributeRow}>
                      <Text style={styles.topAttributeRank}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </Text>
                      <Text style={styles.topAttributeIcon}>{attr.icon}</Text>
                      <Text style={styles.topAttributeText}>{attr.positive}</Text>
                      <Text style={styles.topAttributePercentage}>{attr.percentage}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Insignias */}
              {earnedBadges.length > 0 && (
                <View style={styles.badgesSection}>
                  <Text style={styles.subsectionTitle}>🏅 Insignias</Text>
                  <View style={styles.badgesList}>
                    {earnedBadges.map(badge => (
                      <View key={badge.id} style={styles.badgeMini}>
                        <Text style={styles.badgeMiniIcon}>{badge.icon}</Text>
                        <Text style={styles.badgeMiniName}>{badge.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
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
                <Text style={styles.viewDetailsButtonText}>Ver perfil completo →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Estadísticas de evaluaciones HECHAS */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>📊 Mis Evaluaciones a Otros</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalRatings}</Text>
              <Text style={styles.statLabel}>Realizadas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageScore.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Promedio dado</Text>
            </View>
          </View>
        </View>

        {/* Mis Vehículos */}
        <TouchableOpacity
          style={styles.vehiclesCard}
          onPress={() => router.push('/select-vehicle')}
        >
          <Text style={styles.sectionTitle}>🚗 Mis Vehículos</Text>
          
          {vehicles.length === 0 ? (
            <Text style={styles.vehiclesText}>
              No tienes vehículos registrados. Añade uno para recibir valoraciones en tu perfil.
            </Text>
          ) : (
            <View style={styles.vehiclesList}>
              {vehicles.slice(0, 2).map((vehicle) => (
                <View key={vehicle.id} style={styles.vehicleItem}>
                  <Text style={styles.vehiclePlate}>
                    {vehicle.online ? '🟢' : '⚪'} {vehicle.plate}
                  </Text>
                  {vehicle.nickname && (
                    <Text style={styles.vehicleNickname}>{vehicle.nickname}</Text>
                  )}
                </View>
              ))}
              {vehicles.length > 2 && (
                <Text style={styles.vehiclesMore}>
                  +{vehicles.length - 2} más
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.vehiclesButton}>
            <Text style={styles.vehiclesButtonText}>
              {vehicles.length === 0 ? 'Añadir vehículo →' : 'Ver y gestionar →'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Historial de valoraciones hechas (resumido) */}
        {userRatings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Últimas Evaluaciones Realizadas</Text>
            {userRatings.slice(0, 3).map((rating) => (
              <TouchableOpacity
                key={rating.id}
                style={styles.ratingCard}
                onPress={() => router.push(`/conductor/${rating.plate}`)}
              >
                <View style={styles.ratingHeader}>
                  <Text style={styles.ratingPlate}>{rating.plate}</Text>
                  <Text style={styles.ratingDate}>{formatDate(rating.created_at)}</Text>
                </View>
                <Text style={styles.ratingStars}>{renderStars(rating.score)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botón de cerrar sesión */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
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
  header: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  avatar: {
    fontSize: 60,
    marginBottom: 15,
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  incompleteProfileBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  incompleteProfileText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: '#999',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  editProfileButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  driverReputationCard: {
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
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  rankIcon: {
    fontSize: 40,
    marginRight: 15,
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
    fontSize: 12,
    color: '#666',
  },
  driverScoreContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  driverScoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  driverScoreDivider: {
    width: 1,
    backgroundColor: '#ddd',
  },
  driverScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 5,
  },
  driverScoreLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  topAttributesSection: {
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  topAttributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topAttributeRank: {
    fontSize: 20,
    marginRight: 8,
  },
  topAttributeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  topAttributeText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  topAttributePercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  badgesSection: {
    marginBottom: 15,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeMini: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeMiniIcon: {
    fontSize: 16,
  },
  badgeMiniName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  statsCard: {
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
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ddd',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  vehiclesCard: {
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
  vehiclesText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  vehiclesList: {
    marginBottom: 15,
  },
  vehicleItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehiclePlate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vehicleNickname: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  vehiclesMore: {
    fontSize: 13,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 8,
  },
  vehiclesButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  vehiclesButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
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
  ratingCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ratingPlate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  ratingDate: {
    fontSize: 13,
    color: '#999',
  },
  ratingStars: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
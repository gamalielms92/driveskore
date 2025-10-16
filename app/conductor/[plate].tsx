import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import {
  calculateAttributeStats,
  DRIVING_ATTRIBUTES,
  getDriverRank,
  getEarnedBadges,
  getTopAttributes,
  type AttributeStat,
  type AttributeStats
} from '../../src/utils/gamification';

interface Rating {
  id: string;
  score: number;
  comment: string;
  created_at: string;
}

interface Profile {
  plate: string;
  total_score: number;
  num_ratings: number;
  positive_attributes: { [key: string]: number };
  total_votes: number;
  user_id?: string | null;
}

interface DriverProfile {
  total_score: number;
  num_ratings: number;
  positive_attributes?: { [key: string]: number };
  total_votes?: number;
}

interface Driver {
  user_id: string;
  nickname: string | null;
  online: boolean;
  profile?: DriverProfile;
}

export default function ConductorProfileScreen() {
  const { plate } = useLocalSearchParams<{ plate: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    loadConductorData();
  }, [plate]);

  const loadConductorData = async () => {
    try {
      // 1. Cargar perfil genérico del vehículo
      const { data: vehicleProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('plate', plate)
        .is('user_id', null)
        .maybeSingle();

      // 2. Cargar conductores registrados con esta matrícula
      const { data: driversData } = await supabase
        .from('user_vehicles')
        .select('user_id, nickname, online')
        .eq('plate', plate);

      // 3. Para cada conductor, obtener su perfil específico
      const driversWithProfiles: Driver[] = await Promise.all(
        (driversData || []).map(async (driver) => {
          const { data: driverProfile } = await supabase
            .from('profiles')
            .select('total_score, num_ratings, positive_attributes, total_votes')
            .eq('plate', plate)
            .eq('user_id', driver.user_id)
            .maybeSingle();

          return {
            user_id: driver.user_id,
            nickname: driver.nickname,
            online: driver.online,
            profile: driverProfile ? {
              total_score: driverProfile.total_score,
              num_ratings: driverProfile.num_ratings,
              positive_attributes: driverProfile.positive_attributes || {},
              total_votes: driverProfile.total_votes || 0
            } : undefined
          };
        })
      );

      setDrivers(driversWithProfiles);

      // Si no hay perfil genérico pero hay conductores, usar el del conductor con más valoraciones
      if (!vehicleProfile && driversWithProfiles.length > 0) {
        const bestDriver = driversWithProfiles.reduce((best, current) => {
          const currentRatings = current.profile?.num_ratings || 0;
          const bestRatings = best.profile?.num_ratings || 0;
          return currentRatings > bestRatings ? current : best;
        });

        if (bestDriver.profile) {
          setProfile({
            plate,
            user_id: bestDriver.user_id,
            total_score: bestDriver.profile.total_score,
            num_ratings: bestDriver.profile.num_ratings,
            positive_attributes: bestDriver.profile.positive_attributes || {},
            total_votes: bestDriver.profile.total_votes || 0
          });
        }
      } else if (vehicleProfile) {
        setProfile({
          plate: vehicleProfile.plate,
          user_id: vehicleProfile.user_id,
          total_score: vehicleProfile.total_score,
          num_ratings: vehicleProfile.num_ratings,
          positive_attributes: vehicleProfile.positive_attributes || {},
          total_votes: vehicleProfile.total_votes || 0
        });
      }

      // 4. Cargar valoraciones
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('*')
        .eq('plate', plate)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      setRatings(ratingsData || []);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar el perfil del conductor');
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = () => {
    if (!profile || profile.num_ratings === 0) return 0;
    return profile.total_score / profile.num_ratings;
  };

  const renderStars = (score: number) => {
    return '⭐'.repeat(score) + '☆'.repeat(5 - score);
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
    ratings.forEach(r => {
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

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'No encontrado' }} />
        <Text style={styles.emptyText}>❌</Text>
        <Text style={styles.emptyMessage}>No se encontró este conductor</Text>
      </View>
    );
  }

  const average = calculateAverage();
  const distribution = getScoreDistribution();
  const driverRank = getDriverRank(average);
  const earnedBadges = getEarnedBadges(profile);
  const attributeStats: AttributeStats = calculateAttributeStats(
    profile.positive_attributes, 
    profile.total_votes || 0
  );
  const topAttributes: AttributeStat[] = getTopAttributes(attributeStats);

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: plate || 'Conductor',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
        }} 
      />

      <View style={styles.header}>
        <Text style={styles.plateIcon}>🚗</Text>
        <Text style={styles.plate}>{plate}</Text>
      </View>

      {drivers.length > 0 && (
        <View style={styles.driversSection}>
          <Text style={styles.driversSectionTitle}>
            👥 Conductores de este vehículo
          </Text>
          {drivers.map((driver) => {
            const driverAvg = driver.profile 
              ? driver.profile.total_score / driver.profile.num_ratings 
              : 0;
            const driverRankLocal = getDriverRank(driverAvg);
            
            return (
              <View key={driver.user_id} style={styles.driverCard}>
                <View style={styles.driverHeader}>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverIcon}>
                      {driver.online ? '🟢' : '⚪'}
                    </Text>
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>
                        {driver.nickname || 'Conductor'}
                      </Text>
                      {driver.online && (
                        <Text style={styles.driverStatus}>Activo ahora</Text>
                      )}
                    </View>
                  </View>
                  {driver.profile && driver.profile.num_ratings > 0 && (
                    <View style={styles.driverStats}>
                      <Text style={styles.driverScore}>{driverAvg.toFixed(1)}</Text>
                      <Text style={styles.driverStars}>
                        {renderStars(Math.round(driverAvg))}
                      </Text>
                      <Text style={styles.driverRatings}>
                        {driver.profile.num_ratings} val.
                      </Text>
                    </View>
                  )}
                </View>
                {driver.profile && driver.profile.num_ratings > 0 && (
                  <View style={[styles.driverRankBadge, { backgroundColor: driverRankLocal.color + '15' }]}>
                    <Text style={styles.driverRankIcon}>{driverRankLocal.icon}</Text>
                    <Text style={[styles.driverRankText, { color: driverRankLocal.color }]}>
                      {driverRankLocal.name}
                    </Text>
                  </View>
                )}
                {(!driver.profile || driver.profile.num_ratings === 0) && (
                  <Text style={styles.noRatingsText}>Sin valoraciones aún</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.rankCard, { backgroundColor: driverRank.color + '15' }]}>
        <Text style={styles.rankIcon}>{driverRank.icon}</Text>
        <View style={styles.rankInfo}>
          <Text style={[styles.rankName, { color: driverRank.color }]}>
            {driverRank.name}
          </Text>
          <Text style={styles.rankDescription}>{driverRank.description}</Text>
        </View>
      </View>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreValue}>{average.toFixed(1)}</Text>
        <Text style={styles.scoreStars}>{renderStars(Math.round(average))}</Text>
        <Text style={styles.scoreLabel}>
          Basado en {profile.num_ratings} valoración{profile.num_ratings !== 1 ? 'es' : ''}
        </Text>
      </View>

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

      {topAttributes.length > 0 && (profile.total_votes || 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Mejores Cualidades</Text>
          {topAttributes.map((attr, index) => (
            <View key={attr.id} style={styles.topAttributeCard}>
              <View style={styles.topAttributeHeader}>
                <Text style={styles.topAttributeRank}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </Text>
                <Text style={styles.topAttributeIcon}>{attr.icon}</Text>
                <Text style={styles.topAttributeLabel}>{attr.positive}</Text>
              </View>
              <View style={styles.topAttributeStats}>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${attr.percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.topAttributePercentage}>{attr.percentage}%</Text>
              </View>
              <Text style={styles.topAttributeVotes}>
                {attr.votes} de {profile.total_votes} evaluaciones
              </Text>
            </View>
          ))}
        </View>
      )}

      {(profile.total_votes || 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estadísticas Detalladas</Text>
          {DRIVING_ATTRIBUTES.map(attr => {
            const stat = attributeStats[attr.id];
            if (!stat) return null;
            
            return (
              <View key={attr.id} style={styles.attributeStatRow}>
                <View style={styles.attributeStatHeader}>
                  <Text style={styles.attributeStatIcon}>{attr.icon}</Text>
                  <Text style={styles.attributeStatLabel}>{attr.label}</Text>
                </View>
                <View style={styles.attributeStatBarContainer}>
                  <View 
                    style={[
                      styles.attributeStatBar,
                      { width: `${stat.percentage}%` }
                    ]}
                  />
                </View>
                <Text style={styles.attributeStatText}>
                  {stat.percentage}% ({stat.votes}/{profile.total_votes})
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Distribución de Valoraciones</Text>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = distribution[stars - 1];
          const percentage = profile.num_ratings > 0 
            ? (count / profile.num_ratings) * 100 
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Comentarios ({ratings.filter(r => r.comment).length})</Text>
        
        {ratings.filter(r => r.comment).length === 0 ? (
          <View style={styles.emptyComments}>
            <Text style={styles.emptyCommentsText}>Sin comentarios aún</Text>
          </View>
        ) : (
          ratings
            .filter(r => r.comment)
            .map((rating) => (
              <View key={rating.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentStars}>
                    {renderStars(rating.score)}
                  </Text>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#007AFF', padding: 30, alignItems: 'center' },
  plateIcon: { fontSize: 60, marginBottom: 10 },
  plate: { fontSize: 32, fontWeight: 'bold', color: 'white', letterSpacing: 3 },
  driversSection: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 20, marginBottom: 20, padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  driversSectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#000' },
  driverCard: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 10 },
  driverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  driverInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  driverIcon: { fontSize: 24, marginRight: 10 },
  driverDetails: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  driverStatus: { fontSize: 12, color: '#34C759', fontWeight: '600' },
  driverStats: { alignItems: 'flex-end' },
  driverScore: { fontSize: 24, fontWeight: 'bold', color: '#34C759' },
  driverStars: { fontSize: 14, marginVertical: 2 },
  driverRatings: { fontSize: 11, color: '#999' },
  driverRankBadge: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8 },
  driverRankIcon: { fontSize: 20, marginRight: 8 },
  driverRankText: { fontSize: 14, fontWeight: 'bold' },
  noRatingsText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  rankCard: { margin: 20, padding: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  rankIcon: { fontSize: 50, marginRight: 15 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  rankDescription: { fontSize: 14, color: '#666' },
  scoreCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 20, padding: 30, borderRadius: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  scoreValue: { fontSize: 72, fontWeight: 'bold', color: '#34C759', marginBottom: 10 },
  scoreStars: { fontSize: 32, marginBottom: 10 },
  scoreLabel: { fontSize: 14, color: '#666' },
  section: { padding: 20, paddingTop: 0 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#000' },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { backgroundColor: 'white', padding: 15, borderRadius: 10, alignItems: 'center', width: '47%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  badgeIcon: { fontSize: 40, marginBottom: 8 },
  badgeName: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  badgeDesc: { fontSize: 11, color: '#666', textAlign: 'center' },
  topAttributeCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  topAttributeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  topAttributeRank: { fontSize: 28, marginRight: 8 },
  topAttributeIcon: { fontSize: 24, marginRight: 8 },
  topAttributeLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },
  topAttributeStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  progressBarContainer: { flex: 1, height: 20, backgroundColor: '#e0e0e0', borderRadius: 10, marginRight: 10, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#34C759' },
  topAttributePercentage: { fontSize: 16, fontWeight: 'bold', color: '#34C759', width: 50, textAlign: 'right' },
  topAttributeVotes: { fontSize: 12, color: '#999' },
  attributeStatRow: { marginBottom: 15 },
  attributeStatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  attributeStatIcon: { fontSize: 18, marginRight: 8 },
  attributeStatLabel: { fontSize: 14, color: '#333', flex: 1 },
  attributeStatBarContainer: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 3, overflow: 'hidden' },
  attributeStatBar: { height: '100%', backgroundColor: '#4CAF50' },
  attributeStatText: { fontSize: 12, color: '#666' },
  distributionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  distributionLabel: { width: 50, fontSize: 16 },
  distributionBarContainer: { flex: 1, height: 20, backgroundColor: '#e0e0e0', borderRadius: 10, marginHorizontal: 10, overflow: 'hidden' },
  distributionBar: { height: '100%', backgroundColor: '#34C759' },
  distributionCount: { width: 30, textAlign: 'right', fontSize: 14, color: '#666' },
  commentCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  commentStars: { fontSize: 20 },
  commentDate: { fontSize: 12, color: '#999' },
  commentText: { fontSize: 14, color: '#333', fontStyle: 'italic', lineHeight: 20 },
  emptyComments: { padding: 30, alignItems: 'center' },
  emptyCommentsText: { fontSize: 16, color: '#999' },
  emptyText: { fontSize: 80, marginBottom: 20 },
  emptyMessage: { fontSize: 18, color: '#666' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#999', textAlign: 'center' },
});
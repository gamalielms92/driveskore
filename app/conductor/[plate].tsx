import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

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
}

export default function ConductorProfileScreen() {
  const { plate } = useLocalSearchParams<{ plate: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);

  useEffect(() => {
    loadConductorData();
  }, [plate]);

  const loadConductorData = async () => {
    try {
      // Cargar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('plate', plate)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Cargar valoraciones
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
    const distribution = [0, 0, 0, 0, 0]; // [1⭐, 2⭐, 3⭐, 4⭐, 5⭐]
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

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: plate || 'Conductor',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
        }} 
      />

      {/* Header con matrícula */}
      <View style={styles.header}>
        <Text style={styles.plateIcon}>🚗</Text>
        <Text style={styles.plate}>{plate}</Text>
      </View>

      {/* Puntuación principal */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreValue}>{average.toFixed(1)}</Text>
        <Text style={styles.scoreStars}>{renderStars(Math.round(average))}</Text>
        <Text style={styles.scoreLabel}>
          Basado en {profile.num_ratings} valoración{profile.num_ratings !== 1 ? 'es' : ''}
        </Text>
      </View>

      {/* Distribución de estrellas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distribución de valoraciones</Text>
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

      {/* Comentarios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comentarios ({ratings.length})</Text>
        
        {ratings.length === 0 ? (
          <View style={styles.emptyComments}>
            <Text style={styles.emptyCommentsText}>Sin comentarios aún</Text>
          </View>
        ) : (
          ratings.map((rating) => (
            <View key={rating.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentStars}>
                  {renderStars(rating.score)}
                </Text>
                <Text style={styles.commentDate}>
                  {formatDate(rating.created_at)}
                </Text>
              </View>
              {rating.comment && (
                <Text style={styles.commentText}>"{rating.comment}"</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Los datos reflejan la opinión de la comunidad
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
  scoreCard: {
    backgroundColor: 'white',
    margin: 20,
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
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  commentStars: {
    fontSize: 20,
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
});
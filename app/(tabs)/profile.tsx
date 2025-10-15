import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

interface Rating {
  id: string;
  plate: string;
  score: number;
  comment: string;
  created_at: string;
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [ratings, setRatings] = useState<Rating[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');

        // Cargar valoraciones que este usuario ha dado
        const { data: ratingsData, error } = await supabase
          .from('ratings')
          .select('*')
          .eq('rater_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setRatings(ratingsData || []);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
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
    return date.toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.avatar}>👤</Text>
        <Text style={styles.email}>{userEmail}</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Mis Estadísticas</Text>
        <Text style={styles.statsValue}>{ratings.length}</Text>
        <Text style={styles.statsLabel}>Valoraciones realizadas</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimas valoraciones</Text>
        
        {ratings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>📭</Text>
            <Text style={styles.emptyMessage}>
              Aún no has valorado ningún conductor
            </Text>
            <Text style={styles.emptyHint}>
              Ve a la pestaña Evaluar para empezar
            </Text>
          </View>
        ) : (
          ratings.map((rating) => (
            <View key={rating.id} style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Text style={styles.ratingPlate}>{rating.plate}</Text>
                <Text style={styles.ratingDate}>{formatDate(rating.created_at)}</Text>
              </View>
              <Text style={styles.ratingStars}>{renderStars(rating.score)}</Text>
              {rating.comment && (
                <Text style={styles.ratingComment}>"{rating.comment}"</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>DriveSkore v1.0 - MVP</Text>
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
  avatar: {
    fontSize: 60,
    marginBottom: 10,
  },
  email: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  statsCard: {
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
  statsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  ratingCard: {
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
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingPlate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
  },
  ratingStars: {
    fontSize: 24,
    marginBottom: 5,
  },
  ratingComment: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
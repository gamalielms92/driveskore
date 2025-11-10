// app/matching-results.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../src/config/supabase';
import { Analytics } from '../src/services/Analytics';
import EventCaptureService from '../src/services/EventCaptureService';
import type { DriverCandidate } from '../src/types/events';
import type { Vehicle } from '../src/types/vehicle';

interface EnrichedCandidate extends DriverCandidate {
  userProfile?: {
    full_name: string;
    avatar_url: string | null;
  };
  vehicles?: Vehicle[];
  driverProfile?: {
    total_score: number;
    num_ratings: number;
  };
}

export default function MatchingResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [candidates, setCandidates] = useState<EnrichedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🎬 [MatchingResults] Componente montado');
  console.log('📦 [MatchingResults] Params:', params);
  
  const eventId = params.eventId as string;
  
  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      console.log('🔄 [MatchingResults] Cargando candidates desde AsyncStorage...');
      
      if (!eventId) {
        throw new Error('eventId no proporcionado');
      }
      
      const tempKey = `temp_candidates_${eventId}`;
      console.log('🔍 [MatchingResults] Buscando key:', tempKey);
      
      const candidatesJson = await AsyncStorage.getItem(tempKey);
      
      if (!candidatesJson) {
        throw new Error('No se encontraron candidates en AsyncStorage');
      }
      
      const parsedCandidates: DriverCandidate[] = JSON.parse(candidatesJson);
      console.log('✅ [MatchingResults] Candidates cargados:', parsedCandidates.length);
      
      // Enriquecer candidates con perfiles de usuario
      const enrichedCandidates: EnrichedCandidate[] = await Promise.all(
        parsedCandidates.map(async (candidate) => {
          try {
            // Cargar perfil de usuario
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('full_name, avatar_url')
              .eq('user_id', candidate.user_id)
              .maybeSingle();

            // Cargar vehículos del usuario
            const { data: vehicles } = await supabase
              .from('user_vehicles')
              .select('*')
              .eq('user_id', candidate.user_id);

            // Cargar perfil de conductor (ratings)
            const { data: driverProfile } = await supabase
              .from('profiles')
              .select('total_score, num_ratings')
              .eq('plate', candidate.plate)
              .maybeSingle();

            return {
              ...candidate,
              userProfile: userProfile || undefined,
              vehicles: vehicles || [],
              driverProfile: driverProfile || undefined,
            };
          } catch (err) {
            console.error('Error enriqueciendo candidate:', err);
            return candidate;
          }
        })
      );
      
      setCandidates(enrichedCandidates);
      
      // Limpiar de AsyncStorage después de cargar
      await AsyncStorage.removeItem(tempKey);
      console.log('🧹 [MatchingResults] Temp data limpiada de AsyncStorage');
      
    } catch (error: any) {
      console.error('❌ [MatchingResults] Error cargando candidates:', error);
      setError(error.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = async (candidate: EnrichedCandidate) => {
    console.log('👆 [MatchingResults] Candidate seleccionado:', candidate.plate);
    
    const driverName = candidate.userProfile?.full_name || candidate.plate;
    
    Alert.alert(
      '✅ Confirmar Conductor',
      `¿Evaluar a ${driverName}?\n\nMatrícula: ${candidate.plate}\nConfianza: ${candidate.match_score}/100`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              console.log('🗑️ [MatchingResults] Eliminando evento:', eventId);
              await EventCaptureService.removeEvent(eventId);


                // Trackear matching completado
                await Analytics.trackMatchingCompleted(
                  candidates.length, 
                  candidate.match_score
                );
                console.log('📊 Analytics: matching_completed');
              
              console.log('🧭 [MatchingResults] Navegando a /rate...');
              router.replace({
                pathname: '/rate',
                params: {
                  userId: candidate.user_id,
                  plate: candidate.plate,
                  matchScore: candidate.match_score.toString(),
                  fromMatching: 'true',
                },
              });
            } catch (error) {
              console.error('❌ [MatchingResults] Error:', error);
              Alert.alert('Error', 'No se pudo confirmar el conductor');
            }
          },
        },
      ]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Alta confianza';
    if (score >= 60) return 'Confianza media';
    if (score >= 40) return 'Baja confianza';
    return 'Muy baja';
  };

  const renderCandidateCard = ({ item, index }: { item: EnrichedCandidate; index: number }) => {
    const scoreColor = getScoreColor(item.match_score);
    const scoreLabel = getScoreLabel(item.match_score);
    const hasProfile = !!item.userProfile;
    const rating = item.driverProfile 
      ? item.driverProfile.total_score / item.driverProfile.num_ratings 
      : 0;
    const numRatings = item.driverProfile?.num_ratings || 0;
    
    // Buscar el vehículo que coincide con la matrícula (el activo en ese momento)
    const activeVehicle = item.vehicles?.find(v => v.plate === item.plate);

    return (
      <TouchableOpacity
        style={styles.candidateCard}
        onPress={() => handleSelectCandidate(item)}
        activeOpacity={0.7}
      >
        {/* Badge de posición */}
        <View style={[styles.positionBadge, index === 0 && styles.positionBadgeTop]}>
          <Text style={styles.positionText}>#{index + 1}</Text>
        </View>

        {/* Score de confianza */}
        <View style={[styles.scoreIndicator, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{item.match_score}</Text>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>
        </View>

        {/* Foto del vehículo + info del conductor */}
        {activeVehicle?.vehicle_photo_url ? (
          <View style={styles.vehicleSection}>
            <Image
              source={{ uri: activeVehicle.vehicle_photo_url }}
              style={styles.vehiclePhoto}
              resizeMode="cover"
            />
            <View style={styles.vehicleOverlay}>
              <Text style={styles.vehiclePlate}>{item.plate}</Text>
              {activeVehicle.brand && activeVehicle.model && (
                <Text style={styles.vehicleInfo}>
                  {activeVehicle.brand} {activeVehicle.model} ({activeVehicle.year})
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noVehiclePhoto}>
            <Text style={styles.noVehiclePhotoIcon}>🚗</Text>
            <Text style={styles.noVehiclePhotoText}>Sin foto de vehículo</Text>
          </View>
        )}

        {/* Info del conductor debajo de la foto */}
        {hasProfile ? (
          <View style={styles.driverInfo}>
            <View style={styles.driverHeader}>
              {item.userProfile?.avatar_url ? (
                <Image
                  source={{ uri: item.userProfile.avatar_url }}
                  style={styles.driverAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.driverAvatarPlaceholder}>
                  <Text style={styles.driverAvatarText}>
                    {item.userProfile!.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{item.userProfile!.full_name}</Text>
                {numRatings > 0 && (
                  <Text style={styles.driverRating}>
                    ⭐ {rating.toFixed(1)} ({numRatings} valoraciones)
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.unknownDriverInfo}>
            <Text style={styles.unknownDriverIcon}>👤</Text>
            <Text style={styles.unknownDriverText}>Conductor sin perfil</Text>
          </View>
        )}

        {/* Factores de matching */}
        <View style={styles.matchFactors}>
          <Text style={styles.matchFactorsTitle}>🎯 Factores de coincidencia:</Text>
          
          {item.match_factors.gps_proximity > 0 && (
            <View style={styles.factorRow}>
              <Text style={styles.factorIcon}>📍</Text>
              <View style={styles.factorBar}>
                <View style={[styles.factorBarFill, { 
                  width: `${(item.match_factors.gps_proximity / 40) * 100}%`,
                  backgroundColor: '#4CAF50'
                }]} />
              </View>
              <Text style={styles.factorValue}>{Math.round(item.match_factors.gps_proximity)} pts</Text>
            </View>
          )}

          {item.match_factors.bluetooth_detected && (
            <View style={styles.factorRow}>
              <Text style={styles.factorIcon}>📡</Text>
              <View style={styles.factorBar}>
                <View style={[styles.factorBarFill, { 
                  width: '100%',
                  backgroundColor: '#2196F3'
                }]} />
              </View>
              <Text style={styles.factorValue}>30 pts</Text>
            </View>
          )}

          {item.match_factors.direction_match > 0 && (
            <View style={styles.factorRow}>
              <Text style={styles.factorIcon}>🧭</Text>
              <View style={styles.factorBar}>
                <View style={[styles.factorBarFill, { 
                  width: `${(item.match_factors.direction_match / 20) * 100}%`,
                  backgroundColor: '#FF9800'
                }]} />
              </View>
              <Text style={styles.factorValue}>{Math.round(item.match_factors.direction_match)} pts</Text>
            </View>
          )}

          {item.match_factors.speed_match > 0 && (
            <View style={styles.factorRow}>
              <Text style={styles.factorIcon}>⚡</Text>
              <View style={styles.factorBar}>
                <View style={[styles.factorBarFill, { 
                  width: `${(item.match_factors.speed_match / 10) * 100}%`,
                  backgroundColor: '#9C27B0'
                }]} />
              </View>
              <Text style={styles.factorValue}>{Math.round(item.match_factors.speed_match)} pts</Text>
            </View>
          )}
        </View>

        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>👆 Toca para evaluar a este conductor</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando candidatos...</Text>
        </View>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Sin candidatos
  if (candidates.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📱</Text>
          <Text style={styles.emptyTitle}>Conductor sin DriveSkore</Text>
          <Text style={styles.emptyMessage}>
            No había conductores con la app activa cerca en ese momento.
          </Text>
          
          <View style={styles.sharePrompt}>
            <Text style={styles.sharePromptIcon}>💡</Text>
            <Text style={styles.sharePromptTitle}>¿Cómo funciona DriveSkore?</Text>
            <Text style={styles.sharePromptText}>
              • Solo evalúas a conductores con la app activa{'\n'}
              • El matching verifica quién conduce en tiempo real{'\n'}
              • Garantiza evaluaciones justas y precisas
            </Text>
            <Text style={styles.sharePromptCTA}>
              📲 Comparte la app para que más conductores se unan
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Lista de candidatos
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Conductores Encontrados</Text>
          <Text style={styles.headerSubtitle}>
            {candidates.length} candidato{candidates.length !== 1 ? 's' : ''} cercano{candidates.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={candidates}
        renderItem={renderCandidateCard}
        keyExtractor={(item, index) => `${item.user_id}-${index}`}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No encuentras al conductor correcto?
            </Text>
            <View style={styles.shareAppCard}>
              <Text style={styles.shareAppIcon}>📲</Text>
              <Text style={styles.shareAppTitle}>El conductor no tiene DriveSkore</Text>
              <Text style={styles.shareAppMessage}>
                Solo puedes evaluar a conductores con la app activa. ¡Comparte DriveSkore para que más conductores se unan!
              </Text>
            </View>
          </View>
        }
      />
    </View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  errorMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  emptyMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerBackText: {
    fontSize: 28,
    color: '#007AFF',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  listContent: {
    padding: 15,
  },
  candidateCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  positionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#666',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  positionBadgeTop: {
    backgroundColor: '#FFD700',
  },
  positionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreIndicator: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreLabel: {
    fontSize: 12,
    color: 'white',
    marginTop: 2,
  },
  vehicleSection: {
    position: 'relative',
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  vehiclePhoto: {
    width: '100%',
    height: 180,
  },
  vehicleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  vehiclePlate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: 'white',
  },
  noVehiclePhoto: {
    backgroundColor: '#f0f0f0',
    height: 180,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  noVehiclePhotoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  noVehiclePhotoText: {
    fontSize: 14,
    color: '#999',
  },
  driverInfo: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
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
    fontWeight: 'bold',
    color: 'white',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 13,
    color: '#666',
  },
  unknownDriverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  unknownDriverIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  unknownDriverText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  matchFactors: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  matchFactorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorIcon: {
    fontSize: 16,
    width: 24,
  },
  factorBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 45,
    textAlign: 'right',
  },
  tapHint: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  manualButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 10,
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  shareAppCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    alignItems: 'center',
  },
  shareAppIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  shareAppTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
    textAlign: 'center',
  },
  shareAppMessage: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 20,
  },
  sharePrompt: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 24,
    marginVertical: 20,
    width: '90%',
  },
  sharePromptIcon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  sharePromptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  sharePromptText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  sharePromptCTA: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
});
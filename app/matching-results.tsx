import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventCaptureService from '../src/services/EventCaptureService';
import { getVerificationBadge } from '../src/utils/verificationBadges';
import type { DriverCandidate } from '../src/types/events';

export default function MatchingResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [candidates, setCandidates] = useState<DriverCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🎬 [MatchingResults] Componente montado');
  console.log('📦 [MatchingResults] Params:', params);
  
  const eventId = params.eventId as string;
  
  // ✅ NUEVO: Cargar candidates desde AsyncStorage
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
      console.log('📋 [MatchingResults] Primer candidate:', parsedCandidates[0]);
      
      // Validar estructura
      const allValid = parsedCandidates.every(c => 
        c.user_id && c.plate && c.match_score !== undefined && c.match_factors
      );
      
      if (!allValid) {
        console.error('❌ [MatchingResults] Estructura de candidates inválida');
        throw new Error('Estructura de candidates inválida');
      }
      
      setCandidates(parsedCandidates);
      
      // ✅ Limpiar de AsyncStorage después de cargar
      await AsyncStorage.removeItem(tempKey);
      console.log('🧹 [MatchingResults] Temp data limpiada de AsyncStorage');
      
    } catch (error: any) {
      console.error('❌ [MatchingResults] Error cargando candidates:', error);
      setError(error.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = async (candidate: DriverCandidate) => {
    console.log('👆 [MatchingResults] Candidate seleccionado:', candidate.plate);
    
    Alert.alert(
      '✅ Confirmar Conductor',
      `¿Evaluar a este conductor?\n\nMatrícula: ${candidate.plate}\nScore: ${candidate.match_score}/100`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              console.log('🗑️ [MatchingResults] Eliminando evento:', eventId);
              await EventCaptureService.removeEvent(eventId);
              
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

  const handleManualEntry = async () => {
    console.log('✍️ [MatchingResults] Usuario eligió entrada manual');
    
    Alert.alert(
      'Evaluación Manual',
      'No has encontrado al conductor. Podrás introducir la matrícula manualmente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            try {
              console.log('🗑️ [MatchingResults] Eliminando evento:', eventId);
              await EventCaptureService.removeEvent(eventId);
              
              console.log('🧭 [MatchingResults] Navegando a /rate (manual)...');
              router.replace({
                pathname: '/rate',
                params: {
                  fromMatching: 'manual',
                },
              });
            } catch (error) {
              console.error('❌ [MatchingResults] Error:', error);
              Alert.alert('Error', 'No se pudo continuar');
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
    if (score >= 80) return 'Alta Confianza';
    if (score >= 60) return 'Media Confianza';
    if (score >= 40) return 'Baja Confianza';
    return 'Muy Baja';
  };

  const renderFactorBar = (label: string, score: number, maxScore: number, emoji: string) => {
    const percentage = Math.min(100, (score / maxScore) * 100);
    
    return (
      <View style={styles.factorRow}>
        <View style={styles.factorLabel}>
          <Text style={styles.factorEmoji}>{emoji}</Text>
          <Text style={styles.factorText}>{label}</Text>
        </View>
        <View style={styles.factorBar}>
          <View 
            style={[
              styles.factorBarFill, 
              { width: `${percentage}%`, backgroundColor: getScoreColor(score) }
            ]} 
          />
        </View>
        <Text style={styles.factorScore}>{score}/{maxScore}</Text>
      </View>
    );
  };

  const renderCandidateCard = ({ item, index }: { item: DriverCandidate; index: number }) => {
    console.log(`🎨 [MatchingResults] Renderizando card ${index}:`, item.plate);
    
    // ✅ VALIDACIÓN: Verificar que match_factors existe
    if (!item.match_factors) {
      console.error('❌ match_factors es undefined para:', item.plate);
      return (
        <View style={[styles.card, { borderColor: '#F44336', borderWidth: 2 }]}>
          <Text style={{ color: '#F44336', padding: 20, textAlign: 'center' }}>
            ❌ Error: Datos de matching incompletos
          </Text>
        </View>
      );
    }
    
    let badge;
    try {
      badge = getVerificationBadge(item.match_score);
    } catch (error) {
      console.error('❌ Error obteniendo badge:', error);
      badge = { badge: '❓', text: 'Error', description: 'Error al verificar' };
    }
    
    return (
    <TouchableOpacity
      style={[
        styles.card,
        index === 0 && styles.topCard,
      ]}
      onPress={() => handleSelectCandidate(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.rankContainer}>
          <Text style={styles.rankEmoji}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
          </Text>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: getScoreColor(item.match_score) }]}>
            {item.match_score}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.plateContainer}>
          <Text style={styles.plateLabel}>Matrícula:</Text>
          <Text style={styles.plateValue}>{item.plate || 'No disponible'}</Text>
        </View>

        <View style={styles.verificationBadgeContainer}>
          <Text style={styles.verificationBadgeEmoji}>{badge.badge}</Text>
          <View style={styles.verificationBadgeTextContainer}>
            <Text style={styles.verificationBadgeText}>{badge.text}</Text>
            <Text style={styles.verificationBadgeDescription}>{badge.description}</Text>
          </View>
        </View>

        <View style={[
          styles.confidenceBadge, 
          { backgroundColor: getScoreColor(item.match_score) + '20' }
        ]}>
          <Text style={[styles.confidenceText, { color: getScoreColor(item.match_score) }]}>
            {getScoreLabel(item.match_score)}
          </Text>
        </View>

        <View style={styles.factorsContainer}>
          <Text style={styles.factorsTitle}>Factores de Matching:</Text>
          
          {renderFactorBar('Proximidad GPS', item.match_factors.gps_proximity || 0, 40, '📍')}
          {renderFactorBar('Bluetooth', item.match_factors.bluetooth_detected ? 30 : 0, 30, '📡')}
          {renderFactorBar('Dirección', item.match_factors.direction_match || 0, 20, '🧭')}
          {renderFactorBar('Velocidad', item.match_factors.speed_match || 0, 10, '🚀')}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.selectButtonText}>👆 Toca para evaluar este conductor</Text>
      </View>
    </TouchableOpacity>
  );
  };

  // ✅ Pantalla de loading
  if (loading) {
    console.log('🎨 [MatchingResults] Renderizando pantalla de loading');
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
            Cargando candidatos...
          </Text>
        </View>
      </View>
    );
  }

  // ✅ Pantalla de error
  if (error) {
    console.log('🎨 [MatchingResults] Renderizando pantalla de error');
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>❌</Text>
          <Text style={styles.emptyTitle}>Error</Text>
          <Text style={styles.emptyMessage}>{error}</Text>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('← [MatchingResults] Volviendo...');
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ✅ Sin candidatos
  if (candidates.length === 0) {
    console.log('🎨 [MatchingResults] Renderizando pantalla sin candidatos');
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🤷</Text>
          <Text style={styles.emptyTitle}>No se encontraron candidatos</Text>
          <Text style={styles.emptyMessage}>
            No había conductores activos cerca en ese momento.
          </Text>
          
          <TouchableOpacity
            style={styles.manualButton}
            onPress={handleManualEntry}
          >
            <Text style={styles.manualButtonText}>✍️ Introducir Manualmente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('← [MatchingResults] Volviendo...');
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ✅ Lista de candidatos
  console.log('🎨 [MatchingResults] Renderizando lista de', candidates.length, 'candidatos');
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => {
            console.log('← [MatchingResults] Volviendo...');
            router.back();
          }}
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Candidatos Encontrados</Text>
          <Text style={styles.headerSubtitle}>
            {candidates.length} conductor{candidates.length !== 1 ? 'es' : ''} cercano{candidates.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={candidates}
        renderItem={renderCandidateCard}
        keyExtractor={(item, index) => `${item.user_id || 'unknown'}-${index}`}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No encuentras al conductor correcto?
            </Text>
            <TouchableOpacity
              style={styles.manualButton}
              onPress={handleManualEntry}
            >
              <Text style={styles.manualButtonText}>✍️ Introducir Manualmente</Text>
            </TouchableOpacity>
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBackText: {
    fontSize: 28,
    color: '#007AFF',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 18,
    color: '#999',
    marginLeft: 2,
  },
  cardBody: {
    marginBottom: 12,
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  plateLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  plateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },
  verificationBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  verificationBadgeEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  verificationBadgeTextContainer: {
    flex: 1,
  },
  verificationBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  verificationBadgeDescription: {
    fontSize: 11,
    color: '#666',
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  factorsContainer: {
    marginTop: 8,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  factorLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  factorEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  factorText: {
    fontSize: 13,
    color: '#666',
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
  factorScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  manualButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 12,
  },
  manualButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
});

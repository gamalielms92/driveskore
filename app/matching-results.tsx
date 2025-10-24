import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import EventCaptureService from '../src/services/EventCaptureService';
import type { DriverCandidate } from '../src/types/events';
import { getVerificationBadge } from '../src/utils/verificationBadges';

export default function MatchingResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const eventId = params.eventId as string;
  const candidatesParam = params.candidates as string;
  
  const [candidates] = useState<DriverCandidate[]>(
    candidatesParam ? JSON.parse(candidatesParam) : []
  );

  const handleSelectCandidate = async (candidate: DriverCandidate) => {
    Alert.alert(
      '✅ Confirmar Conductor',
      `¿Evaluar a este conductor?\n\nScore de confianza: ${candidate.match_score}/100`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            // Eliminar evento de pendientes
            await EventCaptureService.removeEvent(eventId);
            
            // Ir a pantalla de valoración con el conductor confirmado
            router.replace({
              pathname: '/rate',
              params: {
                userId: candidate.user_id,
                plate: candidate.plate,
                matchScore: candidate.match_score.toString(),
                fromMatching: 'true',
              },
            });
          },
        },
      ]
    );
  };

  const handleManualEntry = async () => {
    Alert.alert(
      'Evaluación Manual',
      'No has encontrado al conductor. Podrás introducir la matrícula manualmente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            await EventCaptureService.removeEvent(eventId);
            router.replace({
              pathname: '/rate',
              params: {
                fromMatching: 'manual',
              },
            });
          },
        },
      ]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50'; // Verde - Alta confianza
    if (score >= 60) return '#FFC107'; // Amarillo - Media confianza
    if (score >= 40) return '#FF9800'; // Naranja - Baja confianza
    return '#F44336'; // Rojo - Muy baja confianza
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Alta Confianza';
    if (score >= 60) return 'Media Confianza';
    if (score >= 40) return 'Baja Confianza';
    return 'Muy Baja';
  };

  const renderFactorBar = (label: string, score: number, maxScore: number, emoji: string) => {
    const percentage = (score / maxScore) * 100;
    
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
    const badge = getVerificationBadge(item.match_score);
    
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

        {/* NUEVO: Badge de verificación */}
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
          
          {renderFactorBar('Proximidad GPS', item.match_factors.gps_proximity, 40, '📍')}
          {renderFactorBar('Bluetooth', item.match_factors.bluetooth_detected ? 30 : 0, 30, '📡')}
          {renderFactorBar('Dirección', item.match_factors.direction_match, 20, '🧭')}
          {renderFactorBar('Velocidad', item.match_factors.speed_match, 10, '🚀')}
        </View>

        {item.location && (
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceLabel}>📏 Ubicación registrada</Text>
            <Text style={styles.distanceValue}>
              Lat: {item.location.latitude.toFixed(5)}, Lon: {item.location.longitude.toFixed(5)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.selectButtonText}>Toca para evaluar a este conductor</Text>
      </View>
    </TouchableOpacity>
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
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  distanceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  distanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
}
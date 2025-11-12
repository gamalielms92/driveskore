// app/(tabs)/benefits.tsx

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/config/supabase';

interface UserStats {
  score: number;
  numRatings: number;
  ranking: number;
  totalUsers: number;
  points: number;
}

interface Benefit {
  id: string;
  icon: string;
  title: string;
  description: string;
  status: 'active' | 'locked' | 'coming_soon';
  requirement?: string;
  progress?: number;
  action?: string;
  discount?: string;
}

interface Reward {
  id: string;
  icon: string;
  title: string;
  description: string;
  pointsCost: number;
}

export default function BenefitsScreen() {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    score: 0,
    numRatings: 0,
    ranking: 0,
    totalUsers: 0,
    points: 0
  });

  useFocusEffect(
    useCallback(() => {
      loadUserStats();
    }, [])
  );

  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar vehículos del usuario
      const { data: vehicles } = await supabase
        .from('user_vehicles')
        .select('plate')
        .eq('user_id', user.id);

      if (!vehicles || vehicles.length === 0) {
        setUserStats({
          score: 0,
          numRatings: 0,
          ranking: 0,
          totalUsers: 0,
          points: 0
        });
        setLoading(false);
        return;
      }

      // Calcular score promedio de todos los vehículos
      let totalScore = 0;
      let totalRatings = 0;

      for (const vehicle of vehicles) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_score, num_ratings')
          .eq('plate', vehicle.plate)
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          totalScore += profile.total_score;
          totalRatings += profile.num_ratings;
        }
      }

      const averageScore = totalRatings > 0 ? totalScore / totalRatings : 0;

      // Calcular ranking
      const { data: allProfiles, count: totalUsers } = await supabase
        .from('profiles')
        .select('total_score, num_ratings, user_id', { count: 'exact' })
        .not('user_id', 'is', null);

      const usersWithScores = (allProfiles || [])
        .filter(p => p.num_ratings > 0)
        .map(p => ({
          user_id: p.user_id,
          average: p.total_score / p.num_ratings
        }))
        .sort((a, b) => b.average - a.average);

      const userRanking = usersWithScores.findIndex(u => u.user_id === user.id) + 1;

      // Calcular puntos
      const { count: ratingsGiven } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('rater_id', user.id);

      // Contar ratings recibidos en todos los vehículos del usuario
      const plates = vehicles.map(v => v.plate);
      const { count: ratingsReceived } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .in('plate', plates);

      const points = ((ratingsGiven || 0) * 5) + ((ratingsReceived || 0) * 10);

      setUserStats({
        score: averageScore,
        numRatings: totalRatings,
        ranking: userRanking || 0,
        totalUsers: usersWithScores.length,
        points: points
      });

    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBenefitsForScore = (score: number): Benefit[] => {
    const benefits: Benefit[] = [];

    // Combustible
    if (score >= 4.5) {
      benefits.push({
        id: 'fuel_premium',
        icon: '⛽',
        title: 'Combustible Premium',
        description: '10¢/litro en Repsol',
        status: 'coming_soon',
        discount: '10¢/litro',
        action: 'Ver código QR'
      });
    } else if (score >= 4.0) {
      benefits.push({
        id: 'fuel_gold',
        icon: '⛽',
        title: 'Descuento Combustible',
        description: '8¢/litro en Repsol',
        status: 'coming_soon',
        discount: '8¢/litro',
        action: 'Ver código QR'
      });
    } else if (score >= 3.5) {
      benefits.push({
        id: 'fuel_silver',
        icon: '⛽',
        title: 'Descuento Combustible',
        description: '5¢/litro en Repsol',
        status: 'coming_soon',
        discount: '5¢/litro',
        action: 'Ver código QR'
      });
    } else {
      benefits.push({
        id: 'fuel_locked',
        icon: '⛽',
        title: 'Descuento Combustible',
        description: '5¢/litro en Repsol',
        status: 'locked',
        requirement: 'Score 3.5 necesario',
        progress: score / 3.5
      });
    }

    // Seguros
    if (score >= 4.5) {
      benefits.push({
        id: 'insurance_premium',
        icon: '🛡️',
        title: 'Seguro Premium',
        description: '20% descuento en Mapfre',
        status: 'coming_soon',
        discount: '20% OFF',
        action: 'Solicitar presupuesto'
      });
    } else if (score >= 4.0) {
      benefits.push({
        id: 'insurance_gold',
        icon: '🛡️',
        title: 'Seguro Ventaja',
        description: '15% descuento en Mapfre',
        status: 'coming_soon',
        discount: '15% OFF',
        action: 'Solicitar presupuesto'
      });
    } else if (score >= 3.5) {
      benefits.push({
        id: 'insurance_silver',
        icon: '🛡️',
        title: 'Seguro Básico',
        description: '10% descuento en Mapfre',
        status: 'coming_soon',
        discount: '10% OFF',
        action: 'Solicitar presupuesto'
      });
    } else {
      benefits.push({
        id: 'insurance_locked',
        icon: '🛡️',
        title: 'Descuento Seguros',
        description: '10% descuento en Mapfre',
        status: 'locked',
        requirement: 'Score 3.5 necesario',
        progress: score / 3.5
      });
    }

    return benefits;
  };

  const getLockedBenefits = (score: number, ranking: number): Benefit[] => {
    const locked: Benefit[] = [];

    // Parking (necesita score 4.5)
    if (score < 4.5) {
      locked.push({
        id: 'parking',
        icon: '🅿️',
        title: 'Parking Gratis Zona Azul',
        description: '1h gratis al día',
        status: 'locked',
        requirement: `Score 4.5 necesario (Te faltan ${(4.5 - score).toFixed(1)} puntos)`,
        progress: score / 4.5
      });
    } else {
      locked.push({
        id: 'parking',
        icon: '🅿️',
        title: 'Zona Azul Gratis',
        description: '1 día completo',
        status: 'coming_soon',
        action: 'Proximamente'
      });
    }

    // Carsharing (necesita Top 100)
    if (ranking > 100 || ranking === 0) {
      locked.push({
        id: 'carsharing',
        icon: '🚗',
        title: 'Carsharing Premium',
        description: 'Prioridad en reservas',
        status: 'locked',
        requirement: `Top 100 necesario (Estás en #${ranking})`,
        progress: ranking > 0 ? Math.min(100 / ranking, 1) : 0
      });
    } else {
      locked.push({
        id: 'carsharing',
        icon: '🚗',
        title: 'Carsharing Premium',
        description: 'Prioridad en reservas',
        status: 'coming_soon',
        action: 'Proximamente'
      });
    }

    return locked;
  };

  const getRewards = (): Reward[] => {
    return [
      {
        id: 'amazon_10',
        icon: '📦',
        title: 'Vale Amazon 10€',
        description: 'Código canjeable en Amazon.es',
        pointsCost: 1000
      },
      {
        id: 'repsol_15',
        icon: '⛽',
        title: 'Vale Repsol 15€',
        description: 'Descuento en gasolina',
        pointsCost: 1500
      },
      {
        id: 'justeat_20',
        icon: '🍕',
        title: 'Vale Just Eat 20€',
        description: 'Pide comida a domicilio',
        pointsCost: 2000
      }
    ];
  };

  const handleBenefitAction = (benefit: Benefit) => {
    if (benefit.status === 'locked') {
      Alert.alert(
        '🔒 Beneficio Bloqueado',
        benefit.requirement || 'Mejora tu score para desbloquear este beneficio',
        [{ text: 'Entendido' }]
      );
    } else if (benefit.status === 'coming_soon') {
      Alert.alert(
        '⏳ Próximamente',
        'Este beneficio estará disponible muy pronto. ¡Mantén tu buen score!',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRewardRedeem = (reward: Reward) => {
    if (userStats.points < reward.pointsCost) {
      Alert.alert(
        '🏆 Puntos insuficientes',
        `Necesitas ${reward.pointsCost} puntos para canjear este premio.\n\nTienes ${userStats.points} puntos.\n\nFaltan ${reward.pointsCost - userStats.points} puntos.`,
        [{ text: 'Entendido' }]
      );
    } else {
      Alert.alert(
        '🎁 Canjear Premio',
        `¿Quieres canjear ${reward.pointsCost} puntos por ${reward.title}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Canjear',
            onPress: () => {
              Alert.alert(
                '⏳ Próximamente',
                'El sistema de canje estará disponible muy pronto. ¡Sigue acumulando puntos!',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando beneficios...</Text>
      </View>
    );
  }

  const activeBenefits = getBenefitsForScore(userStats.score);
  const lockedBenefits = getLockedBenefits(userStats.score, userStats.ranking);
  const rewards = getRewards();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎁 Tus Beneficios</Text>
        <Text style={styles.headerSubtitle}>
          Disfruta de ventajas exclusivas por conducir bien
        </Text>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Tu Score</Text>
              <Text style={styles.scoreValue}>
                {userStats.numRatings > 0 ? `⭐ ${userStats.score.toFixed(1)}` : '⭐ -'}
              </Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Ranking</Text>
              <Text style={styles.scoreValue}>
                {userStats.ranking > 0 ? `#${userStats.ranking}` : '-'}
              </Text>
              {userStats.totalUsers > 0 && (
                <Text style={styles.scoreSubtext}>de {userStats.totalUsers}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsIcon}>🏆</Text>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsLabel}>Puntos acumulados</Text>
            <Text style={styles.pointsValue}>{userStats.points} puntos</Text>
          </View>
        </View>
      </View>

      {/* Mensaje si no tiene evaluaciones */}
      {userStats.numRatings === 0 && (
        <View style={styles.noRatingsCard}>
          <Text style={styles.noRatingsIcon}>🚗</Text>
          <Text style={styles.noRatingsTitle}>Empieza a conducir</Text>
          <Text style={styles.noRatingsText}>
            Activa el Modo Conductor y recibe tus primeras evaluaciones para desbloquear beneficios exclusivos
          </Text>
        </View>
      )}

      {/* Beneficios Activos */}
      {activeBenefits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {activeBenefits.some(b => b.status === 'locked') ? '🔓 Tus Primeros Beneficios' : '✅ Beneficios Disponibles'}
          </Text>
          {activeBenefits.map(benefit => (
            <BenefitCard
              key={benefit.id}
              benefit={benefit}
              onPress={() => handleBenefitAction(benefit)}
            />
          ))}
        </View>
      )}

      {/* Próximos Beneficios */}
      {lockedBenefits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Desbloquea Más Beneficios</Text>
          {lockedBenefits.map(benefit => (
            <BenefitCard
              key={benefit.id}
              benefit={benefit}
              onPress={() => handleBenefitAction(benefit)}
            />
          ))}
        </View>
      )}

      {/* Sistema de Recompensas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎁 Canjea tus Puntos</Text>
        <View style={styles.pointsInfoCard}>
          <Text style={styles.pointsInfoIcon}>💡</Text>
          <Text style={styles.pointsInfoText}>
            Gana puntos evaluando conductores (+5) y recibiendo evaluaciones (+10)
          </Text>
        </View>
        {rewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            userPoints={userStats.points}
            onPress={() => handleRewardRedeem(reward)}
          />
        ))}
      </View>

      {/* CTA final */}
      <View style={styles.ctaCard}>
        <Text style={styles.ctaIcon}>🚀</Text>
        <Text style={styles.ctaTitle}>¿Quieres más beneficios?</Text>
        <Text style={styles.ctaDescription}>
          Activa el Modo Conductor, conduce de forma segura y cortés, y mejora tu score para desbloquear más ventajas
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Los beneficios se actualizan según tu score y actividad en tiempo real
        </Text>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// COMPONENTES
// ============================================================================

interface BenefitCardProps {
  benefit: Benefit;
  onPress: () => void;
}

function BenefitCard({ benefit, onPress }: BenefitCardProps) {
  const isLocked = benefit.status === 'locked';
  const isComingSoon = benefit.status === 'coming_soon';

  return (
    <TouchableOpacity
      style={[
        styles.benefitCard,
        isLocked && styles.benefitCardLocked
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.benefitHeader}>
        <Text style={styles.benefitIcon}>{benefit.icon}</Text>
        <View style={styles.benefitInfo}>
          <Text style={[styles.benefitTitle, isLocked && styles.benefitTitleLocked]}>
            {benefit.title}
          </Text>
          <Text style={[styles.benefitDescription, isLocked && styles.benefitDescriptionLocked]}>
            {benefit.description}
          </Text>
        </View>
        {benefit.discount && !isLocked && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{benefit.discount}</Text>
          </View>
        )}
      </View>

      {isLocked && benefit.requirement && (
        <View style={styles.requirementContainer}>
          <Text style={styles.requirementText}>{benefit.requirement}</Text>
          {benefit.progress !== undefined && benefit.progress > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${Math.min(benefit.progress * 100, 100)}%` }]} />
            </View>
          )}
        </View>
      )}

      {isComingSoon && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>⏳ Próximamente disponible</Text>
        </View>
      )}

      {benefit.action && !isLocked && (
        <View style={styles.benefitAction}>
          <Text style={styles.benefitActionText}>{benefit.action} →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onPress: () => void;
}

function RewardCard({ reward, userPoints, onPress }: RewardCardProps) {
  const canRedeem = userPoints >= reward.pointsCost;
  const progress = Math.min((userPoints / reward.pointsCost) * 100, 100);

  return (
    <TouchableOpacity
      style={[
        styles.rewardCard,
        !canRedeem && styles.rewardCardLocked
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rewardHeader}>
        <Text style={styles.rewardIcon}>{reward.icon}</Text>
        <View style={styles.rewardInfo}>
          <Text style={[styles.rewardTitle, !canRedeem && styles.rewardTitleLocked]}>
            {reward.title}
          </Text>
          <Text style={[styles.rewardDescription, !canRedeem && styles.rewardDescriptionLocked]}>
            {reward.description}
          </Text>
        </View>
      </View>

      <View style={styles.rewardFooter}>
        <View style={styles.rewardCost}>
          <Text style={styles.rewardCostIcon}>🏆</Text>
          <Text style={[styles.rewardCostText, canRedeem && styles.rewardCostTextActive]}>
            {reward.pointsCost} puntos
          </Text>
        </View>

        {!canRedeem && (
          <Text style={styles.rewardMissing}>
            Faltan {reward.pointsCost - userPoints} pts
          </Text>
        )}

        {canRedeem && (
          <View style={styles.rewardCanRedeem}>
            <Text style={styles.rewardCanRedeemText}>✅ Disponible</Text>
          </View>
        )}
      </View>

      <View style={styles.rewardProgressContainer}>
        <View style={[styles.rewardProgressBar, { width: `${progress}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

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
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  scoreLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  pointsCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  noRatingsCard: {
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
  noRatingsIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  noRatingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  noRatingsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    marginTop: 20,
  },
  benefitCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitCardLocked: {
    opacity: 0.6,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  benefitTitleLocked: {
    color: '#999',
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
  },
  benefitDescriptionLocked: {
    color: '#aaa',
  },
  discountBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  requirementContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  requirementText: {
    fontSize: 13,
    color: '#FF9500',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  comingSoonBadge: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
  },
  benefitAction: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  benefitActionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  pointsInfoCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsInfoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pointsInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rewardCardLocked: {
    opacity: 0.7,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  rewardTitleLocked: {
    color: '#999',
  },
  rewardDescription: {
    fontSize: 13,
    color: '#666',
  },
  rewardDescriptionLocked: {
    color: '#aaa',
  },
  rewardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rewardCost: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardCostIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  rewardCostText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  rewardCostTextActive: {
    color: '#34C759',
  },
  rewardMissing: {
    fontSize: 12,
    color: '#FF9500',
  },
  rewardCanRedeem: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardCanRedeemText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rewardProgressContainer: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  rewardProgressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  ctaCard: {
    backgroundColor: '#FFF3E0',
    margin: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  ctaIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  ctaDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
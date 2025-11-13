// app/raffle.tsx - Pantalla del Sorteo del Piloto

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/config/supabase';

export default function RaffleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [isAmbassador, setIsAmbassador] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Cargar código y stats
      const { data: codeData } = await supabase
        .from('user_referral_codes')
        .select('total_referrals')
        .eq('user_id', user.id)
        .maybeSingle();

      setTotalReferrals(codeData?.total_referrals || 0);

      // Cargar pendientes
      const { count: pendingCount } = await supabase
        .from('user_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'pending');

      setPendingReferrals(pendingCount || 0);

      // Check ambassador
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_ambassador')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsAmbassador(profile?.is_ambassador || false);

    } catch (error) {
      console.error('Error loading raffle data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando sorteo...</Text>
      </View>
    );
  }

  const entries = totalReferrals + (isAmbassador ? 5 : 0);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎁 Sorteo</Text>
        <Text style={styles.subtitle}>
          Tus papeletas y estado de invitaciones
        </Text>
      </View>

      {/* Papeletas del Sorteo */}
      <View style={styles.entriesCard}>
        <Text style={styles.entriesTitle}>Tus Papeletas del Sorteo</Text>
        <View style={styles.entriesBox}>
          <Text style={styles.entriesIcon}>🎟️</Text>
          <View style={styles.entriesInfo}>
            <Text style={styles.entriesValue}>{entries}</Text>
            <Text style={styles.entriesLabel}>
              papeleta{entries !== 1 ? 's' : ''} acumulada{entries !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        
        <View style={styles.entriesBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownIcon}>✅</Text>
            <Text style={styles.breakdownText}>
              {totalReferrals} amigo{totalReferrals !== 1 ? 's' : ''} verificado{totalReferrals !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.breakdownValue}>= {totalReferrals}</Text>
          </View>
          
          {isAmbassador && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownIcon}>👑</Text>
              <Text style={styles.breakdownText}>Bonus Embajador</Text>
              <Text style={styles.breakdownValue}>= +5</Text>
            </View>
          )}
        </View>
      </View>

      {/* Info del Sorteo */}
      <View style={styles.prizeCard}>
        <Text style={styles.prizeTitle}>📅 Información del Sorteo</Text>
        <View style={styles.prizeInfo}>
          <View style={styles.prizeItem}>
            <Text style={styles.prizeLabel}>Fecha orientativa:</Text>
            <Text style={styles.prizeValue}>9~12 de Diciembre</Text>
          </View>
          <View style={styles.prizeItem}>
            <Text style={styles.prizeLabel}>Premio:</Text>
            <Text style={styles.prizeValue}>Por anunciar próximamente</Text>
          </View>
          <View style={styles.prizeItem}>
            <Text style={styles.prizeLabel}>Formato:</Text>
            <Text style={styles.prizeValue}>Streaming en vivo 🎥</Text>
          </View>
          <View style={styles.prizeItem}>
            <Text style={styles.prizeLabel}>Duración:</Text>
            <Text style={styles.prizeValue}>Finalizará el 7 de Diciembre</Text>
          </View>
        </View>
        
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>⚠️ Importante:</Text>
          <Text style={styles.rulesText}>
            Solo los invitados que verifiquen su email se contabilizarán para el sorteo.

            Para estar al día sobre actualizaciones y novedades, visita: https://driveskore.vercel.app/
          </Text>
        </View>
      </View>

      {/* CTA Motivacional */}
      <View style={styles.motivationCard}>
        <Text style={styles.motivationIcon}>🚀</Text>
        <Text style={styles.motivationTitle}>¡Sigue invitando!</Text>
        <Text style={styles.motivationText}>
          Cuantos más amig@s invites y verifiquen su email, más entradas acumulas para el sorteo.
        </Text>
        <TouchableOpacity 
          style={styles.motivationButton}
          onPress={() => router.push('/(tabs)/referrals')}
        >
          <Text style={styles.motivationButtonText}>Invitar más amig@s</Text>
        </TouchableOpacity>
      </View>

      {/* CTA - Cómo funciona */}
      <View style={styles.ctaCard}>
        <Text style={styles.ctaIcon}>💡</Text>
        <Text style={styles.ctaTitle}>¿Cómo funciona el sorteo?</Text>
        <View style={styles.ctaList}>
          <Text style={styles.ctaItem}>1. Comparte tu código único</Text>
          <Text style={styles.ctaItem}>2. Tus amig@s se registran con el código</Text>
          <Text style={styles.ctaItem}>3. Verifican su email ✅</Text>
          <Text style={styles.ctaItem}>4. ¡Ganas 1 entrada al sorteo por cada amig@!</Text>
          <Text style={styles.ctaItem}>5. Con 10 amig@s → logro Embajador 👑 + 5 papeletas extra</Text>
        </View>
      </View>

      {/* Recordatorio si hay pendientes */}
      {pendingReferrals > 0 && (
        <View style={styles.reminderCard}>
          <Text style={styles.reminderIcon}>💡</Text>
          <Text style={styles.reminderTitle}>Recuerda a tus amig@s</Text>
          <Text style={styles.reminderText}>
            Tienes {pendingReferrals} invitación{pendingReferrals !== 1 ? 'es' : ''} pendiente{pendingReferrals !== 1 ? 's' : ''} de verificar email.
            ¡Recuérdales que revisen su correo para que cuenten en el sorteo!
          </Text>
        </View>
      )}
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
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#FF9500',
    padding: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  entriesCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  entriesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  entriesIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  entriesInfo: {
    flex: 1,
  },
  entriesValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  entriesLabel: {
    fontSize: 14,
    color: '#666',
  },
  entriesBreakdown: {
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  breakdownIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  breakdownText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  prizeCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prizeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  prizeInfo: {
    gap: 12,
    marginBottom: 15,
  },
  prizeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prizeLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  prizeValue: {
    fontSize: 14,
    color: '#000',
  },
  rulesBox: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9500',
    marginBottom: 5,
  },
  rulesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  motivationCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  motivationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  motivationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  motivationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  motivationButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  listCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listHeader: {
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  statusLegend: {
    flexDirection: 'row',
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  refItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  refLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  refIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  refInfo: {
    flex: 1,
  },
  refName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  refDate: {
    fontSize: 12,
    color: '#999',
  },
  refPending: {
    fontSize: 11,
    color: '#FF9500',
    fontStyle: 'italic',
    marginTop: 2,
  },
  refStatus: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  refStatusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  refStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  emptyCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  ctaCard: {
    backgroundColor: '#FFF3E0',
    margin: 20,
    marginTop: 0,
    padding: 25,
    borderRadius: 15,
  },
  ctaIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  ctaList: {
    gap: 8,
  },
  ctaItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reminderCard: {
    backgroundColor: '#FFF3E0',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    marginBottom: 40,
  },
  reminderIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  reminderText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
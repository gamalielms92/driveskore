// app/referrals.tsx - VERSIÓN SIMPLE (Solo compartir)

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/config/supabase';

interface Referral {
  id: string;
  created_at: string;
  status: 'pending' | 'completed';
  referred: {
    full_name: string;
  } | null;
}

export default function ReferralsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);

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

      // Cargar o crear código
      let { data: codeData } = await supabase
        .from('user_referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!codeData) {
        const newCode = generateCode();
        const { data: newCodeData } = await supabase
          .from('user_referral_codes')
          .insert({
            user_id: user.id,
            referral_code: newCode
          })
          .select()
          .single();
        
        codeData = newCodeData;
      }

      setCode(codeData?.referral_code || '');
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

      // Cargar lista completa de referidos
      const { data: list } = await supabase
        .from('user_referrals')
        .select(`
          id,
          created_at,
          status,
          user_profiles!user_referrals_referred_id_fkey(full_name)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      // Mapear respuesta
      const formattedList = (list || []).map(item => ({
        id: item.id,
        created_at: item.created_at,
        status: item.status as 'pending' | 'completed',
        referred: Array.isArray(item.user_profiles) && item.user_profiles.length > 0
          ? { full_name: item.user_profiles[0].full_name }
          : null
      }));

      setReferrals(formattedList);

    } catch (error) {
      console.error('Error loading referral data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DRIVE-';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleShare = async () => {
    if (!code) return;

    const message = `¡Únete a la prueba de DriveSkore! 🚗⭐

Soy parte integrante de la prueba. Únete y participa en el sorteo exclusivo.

🎁 Código: ${code}
📱 Descarga la app DriveSkore

https://driveskore.vercel.app/

¡Nos vemos en la carretera! 👋`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    
    try {
      Clipboard.setString(code);
      Alert.alert('✅ Copiado', 'Código copiado al portapapeles');
    } catch (error) {
      console.error('Error copying:', error);
      Alert.alert('Error', 'No se pudo copiar el código');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const progress = Math.min((totalReferrals / 10) * 100, 100);
  const remaining = Math.max(10 - totalReferrals, 0);
  const totalInvitations = totalReferrals + pendingReferrals;

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
        <Text style={styles.title}>🎯 Invita Amig@s</Text>
        <Text style={styles.subtitle}>
          Comparte tu código y gana papeletas del sorteo
        </Text>
      </View>

      {/* Badge o Progreso */}
      {isAmbassador ? (
        <View style={styles.ambassadorCard}>
          <Text style={styles.ambassadorIcon}>👑</Text>
          <Text style={styles.ambassadorTitle}>Embajador DriveSkore</Text>
          <Text style={styles.ambassadorText}>
            ¡Has invitado a {totalReferrals} amigos!
          </Text>
        </View>
      ) : (
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>
            Progreso a Embajador 👑
          </Text>
          <View style={styles.progressInfo}>
            <Text style={styles.progressCount}>{totalReferrals}/10 invitados verificados</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {remaining > 0 
              ? `${remaining} más para Badge Embajador`
              : '¡Ya eres Embajador!'
            }
          </Text>
        </View>
      )}

      {/* Código */}
      <View style={styles.codeCard}>
        <Text style={styles.codeTitle}>Tu Código de Invitación</Text>
        <Text style={styles.codeDescription}>
          Comparte este código con tus amig@s
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{code}</Text>
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Text style={styles.btnText}>📋 Copiar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.btnText}>📤 Compartir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ver detalles del sorteo */}
      <TouchableOpacity 
        style={styles.raffleButton}
        onPress={() => router.push('/raffle')}
      >
        <View style={styles.raffleContent}>
          <Text style={styles.raffleIcon}>🎁</Text>
          <View style={styles.raffleInfo}>
            <Text style={styles.raffleTitle}>Ver Sorteo del Piloto</Text>
            <Text style={styles.raffleSubtitle}>
              Tus papeletas y premio del sorteo
            </Text>
          </View>
          <Text style={styles.raffleArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Lista de Invitaciones con status */}
      {referrals.length > 0 && (
        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              👥 Tus Invitaciones ({totalInvitations})
            </Text>
            <View style={styles.statusLegend}>
              <View style={styles.legendItem}>
                <Text style={styles.legendIcon}>✅</Text>
                <Text style={styles.legendText}>{totalReferrals} Verificados</Text>
              </View>
              {pendingReferrals > 0 && (
                <View style={styles.legendItem}>
                  <Text style={styles.legendIcon}>⏳</Text>
                  <Text style={styles.legendText}>{pendingReferrals} Pendientes</Text>
                </View>
              )}
            </View>
          </View>
          
          {referrals.map((ref) => (
            <View key={ref.id} style={styles.refItem}>
              <View style={styles.refLeft}>
                <Text style={styles.refIcon}>
                  {ref.status === 'completed' ? '✅' : '⏳'}
                </Text>
                <View style={styles.refInfo}>
                  <Text style={styles.refName}>
                    {ref.referred?.full_name || 'Usuario'}
                  </Text>
                  <Text style={styles.refDate}>
                    {new Date(ref.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                  {ref.status === 'pending' && (
                    <Text style={styles.refPending}>
                      Pendiente de verificar email
                    </Text>
                  )}
                </View>
              </View>
              <View style={[
                styles.refStatus,
                ref.status === 'completed' && styles.refStatusCompleted
              ]}>
                <Text style={styles.refStatusText}>
                  {ref.status === 'completed' ? '✓' : '⏳'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Mensaje si aún no ha invitado */}
      {totalReferrals === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>Aún no has invitado a nadie</Text>
          <Text style={styles.emptyText}>
            Comparte tu código con amig@s para empezar a acumular papeletas para el sorteo exclusivo del piloto
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
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
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
  ambassadorCard: {
    backgroundColor: '#FFD700',
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
  ambassadorIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  ambassadorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  ambassadorText: {
    fontSize: 16,
    color: '#333',
  },
  progressCard: {
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
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  progressInfo: {
    marginBottom: 10,
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  codeCard: {
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
  codeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  codeDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  codeBox: {
    backgroundColor: '#f8f8f8',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 3,
    color: '#007AFF',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  raffleButton: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  raffleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  raffleIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  raffleInfo: {
    flex: 1,
  },
  raffleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  raffleSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  raffleArrow: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
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
    marginBottom: 40,
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
    minWidth: 40,
    alignItems: 'center',
  },
  refStatusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  refStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  ctaCard: {
    backgroundColor: '#FFF3E0',
    margin: 20,
    marginTop: 0,
    padding: 25,
    borderRadius: 15,
    marginBottom: 40,
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
});
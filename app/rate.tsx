// app/rate.tsx - CON CONTROLES ANTI-MANIPULACIÓN

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import UserCard from '../src/components/UserCard';
import { supabase } from '../src/config/supabase';
import { Analytics } from '../src/services/Analytics';
import type { Vehicle } from '../src/types/vehicle';
import { DRIVING_ATTRIBUTES } from '../src/utils/gamification';
import { validateSpanishPlate } from '../src/utils/plateValidator';

interface Attribute {
  id: string;
  label: string;
  icon: string;
  positive: string;
  negative: string;
}

export default function RateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userId?: string;
    plate?: string;
    photoUri?: string;
    matchScore?: string;
    fromMatching?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [attributes, setAttributes] = useState<{ [key: string]: boolean | null }>({});
  const [comment, setComment] = useState('');
  
  // Datos del conductor
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);

  const displayPlate = params.plate || 'Desconocida';
  const plateValidation = validateSpanishPlate(displayPlate);

  useEffect(() => {
    loadDriverData();
  }, [params.plate, params.userId]);

  const loadDriverData = async () => {
    try {
      setLoadingProfile(true);
      
      if (!params.plate) {
        setLoadingProfile(false);
        return;
      }

      // 1. Buscar el perfil del conductor por matrícula
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('plate', params.plate)
        .maybeSingle();

      setDriverProfile(profile);

      // 2. Si tiene user_id, cargar perfil de usuario y vehículos
      if (profile?.user_id) {
        // Cargar perfil de usuario
        const { data: userProf } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        setUserProfile(userProf);

        // Cargar vehículos del usuario
        const { data: userVehicles } = await supabase
          .from('user_vehicles')
          .select('*')
          .eq('user_id', profile.user_id);

        setVehicles(userVehicles || []);

        // Encontrar el vehículo actual (el que coincide con la matrícula)
        const current = userVehicles?.find(v => v.plate === params.plate);
        setCurrentVehicle(current || null);
      }

    } catch (error: any) {
      console.error('Error cargando datos del conductor:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const toggleAttribute = (attrId: string, value: boolean) => {
    setAttributes(prev => ({
      ...prev,
      [attrId]: prev[attrId] === value ? null : value
    }));
  };

  const getVoteSummary = () => {
    const values = Object.values(attributes);
    return {
      total: values.filter(v => v !== null).length,
      positive: values.filter(v => v === true).length,
      negative: values.filter(v => v === false).length,
    };
  };

  const calculateScore = () => {
    const { positive, negative } = getVoteSummary();
    const total = positive + negative;
    if (total === 0) return 0;
    return ((positive / total) * 5);
  };

  const handleSubmit = async () => {
    try {
      const { total } = getVoteSummary();
      
      if (total === 0) {
        Alert.alert('Atención', 'Por favor evalúa al menos un comportamiento');
        return;
      }

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // ============================================
      // 🛡️ CONTROLES ANTI-MANIPULACIÓN
      // ============================================

      // ✅ CONTROL 1: Auto-votación bloqueada
      if (params.userId && params.userId === user.id) {
        Alert.alert(
          '🚫 No permitido',
          'No puedes evaluarte a ti mismo.\n\nDriveSkore es un sistema de evaluación comunitaria, donde otros conductores valoran tu comportamiento en la vía.',
          [{ text: 'Entendido', onPress: () => router.back() }]
        );
        setLoading(false);
        return;
      }

      const displayPlateForInsert = params.userId 
        ? (currentVehicle?.plate || params.plate || 'Desconocida')
        : (params.plate || 'Desconocida');

      // ✅ CONTROL 2: Rate limit mismo conductor (24h)
      const { data: recentRating } = await supabase
        .from('ratings')
        .select('created_at')
        .eq('rater_id', user.id)
        .eq('plate', displayPlateForInsert)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (recentRating) {
        const hoursAgo = Math.floor(
          (Date.now() - new Date(recentRating.created_at).getTime()) / (60 * 60 * 1000)
        );
        
        Alert.alert(
          '⏳ Espera un momento',
          `Ya evaluaste a este conductor hace ${hoursAgo} hora${hoursAgo !== 1 ? 's' : ''}.\n\nPuedes evaluarlo nuevamente después de 24 horas.`,
          [{ text: 'Entendido', onPress: () => router.back() }]
        );
        setLoading(false);
        return;
      }

      // ✅ CONTROL 3: Rate limit global (20/día)
      const { count: todayRatings } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('rater_id', user.id)
        .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());

      const MAX_RATINGS_PER_DAY = 20;

      if (todayRatings && todayRatings >= MAX_RATINGS_PER_DAY) {
        Alert.alert(
          '🚫 Límite diario alcanzado',
          `Has alcanzado el límite de ${MAX_RATINGS_PER_DAY} evaluaciones por día.\n\nPodrás evaluar más conductores mañana.`,
          [{ text: 'Entendido' }]
        );
        setLoading(false);
        return;
      }

      // ✅ CONTROL 4: Matching score mínimo (50)
      if (params.fromMatching === 'true' && params.matchScore) {
        const matchScore = parseInt(params.matchScore);
        
        if (matchScore < 50) {
          Alert.alert(
            '⚠️ Confianza baja',
            `El matching tiene baja confianza (${matchScore}/100).\n\nPara garantizar evaluaciones justas, solo permitimos evaluar con confianza media o alta.`,
            [{ text: 'Entendido', onPress: () => router.back() }]
          );
          setLoading(false);
          return;
        }
      }

      // ============================================
      // ✅ TODOS LOS CONTROLES PASADOS - INSERTAR
      // ============================================

      const score = calculateScore();
      
      const positiveAttrs: { [key: string]: number } = {};
      Object.entries(attributes).forEach(([key, value]) => {
        if (value === true) {
          positiveAttrs[key] = 1;
        }
      });

      // Insertar valoración
      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          rater_id: user.id,
          plate: displayPlateForInsert,
          score: score,
          comment: comment.trim() || null,
          // AÑADIR ATRIBUTOS INDIVIDUALES
          respects_lights: attributes.respects_lights ?? null,
          keeps_distance: attributes.keeps_distance ?? null,
          uses_signals: attributes.uses_signals ?? null,
          yields_right: attributes.yields_right ?? null,
          appropriate_speed: attributes.appropriate_speed ?? null,
          parks_well: attributes.parks_well ?? null,
        });

      if (ratingError) throw ratingError;

      // Trackear primera valoración
      const { count, error: countError } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('rater_id', user.id);
    
      if (!countError && count === 1) {
        await Analytics.trackFirstRating(score);
      }

      // Actualizar o crear perfil del conductor
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('plate', displayPlateForInsert)
        .maybeSingle();

      if (existingProfile) {
        // Actualizar perfil existente
        const newTotalScore = existingProfile.total_score + score;
        const newNumRatings = existingProfile.num_ratings + 1;
        const newTotalVotes = existingProfile.total_votes + total;

        const updatedAttributes = { ...existingProfile.positive_attributes };
        Object.entries(positiveAttrs).forEach(([key, value]) => {
          updatedAttributes[key] = (updatedAttributes[key] || 0) + value;
        });

        await supabase
          .from('profiles')
          .update({
            total_score: newTotalScore,
            num_ratings: newNumRatings,
            positive_attributes: updatedAttributes,
            total_votes: newTotalVotes,
          })
          .eq('plate', displayPlateForInsert);
      } else {
        // Crear nuevo perfil
        await supabase
          .from('profiles')
          .insert({
            plate: displayPlateForInsert,
            total_score: score,
            num_ratings: 1,
            positive_attributes: positiveAttrs,
            total_votes: total,
            user_id: params.userId || null,
          });
      }

      const { positive, negative } = getVoteSummary();
      const successMessage = `Evaluación registrada:\n\n⭐ Puntuación: ${score.toFixed(1)}/5.0\n✅ Positivos: ${positive}\n❌ Negativos: ${negative}`;

      Alert.alert(
        '🎉 ¡Gracias por contribuir!', 
        successMessage,
        [{ 
          text: 'OK', 
          onPress: () => router.replace('/(tabs)') 
        }]
      );
    } catch (error: any) {
      console.error('💥 ERROR:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const { total, positive, negative } = getVoteSummary();
  const estimatedScore = calculateScore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {params.photoUri && (
          <Image source={{ uri: params.photoUri }} style={styles.photo} />
        )}

        {/* UserCard del conductor si tiene perfil */}
        {loadingProfile ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando perfil del conductor...</Text>
          </View>
        ) : userProfile ? (
          <View style={styles.driverSection}>
            <Text style={styles.sectionTitle}>👤 Evaluando a:</Text>
            <UserCard
              userId={driverProfile?.user_id || ''}
              fullName={userProfile.full_name}
              avatarUrl={userProfile.avatar_url}
              rating={driverProfile ? driverProfile.total_score / driverProfile.num_ratings : 0}
              numRatings={driverProfile?.num_ratings || 0}
              vehicles={vehicles}
              size="medium"
              showVehicles={false}
              showBadges={true}
            />
            
          </View>
        ) : (
          <View style={styles.unknownDriverSection}>
            <Text style={styles.plateLabel}>Evaluando a:</Text>
            <Text style={styles.plate}>{displayPlate}</Text>
              <Text style={styles.unknownDriverText}>
                Este conductor no tiene perfil en DriveSkore.
              </Text>
          </View>
        )}

        {/* Mostrar marca y modelo FUERA del UserCard */}
        {currentVehicle && (
          <View style={styles.currentVehicleInfo}>
            <Text style={styles.currentVehicleText}>
              🚗 {currentVehicle.brand} {currentVehicle.model}
            </Text>
            {currentVehicle.year && (
              <Text style={styles.currentVehiclePlate}>Año {currentVehicle.year}</Text>
            )}
          </View>
        )}
        
        {/* Resumen de evaluación */}
        {total > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen de tu evaluación</Text>
            <Text style={styles.summaryScore}>
              {estimatedScore.toFixed(1)} / 5.0
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#34C759' }]}>
                  {positive}
                </Text>
                <Text style={styles.summaryStatLabel}>Positivos</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#FF3B30' }]}>
                  {negative}
                </Text>
                <Text style={styles.summaryStatLabel}>Negativos</Text>
              </View>
            </View>
          </View>
        )}

        {/* Instrucciones */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsIcon}>💡</Text>
          <Text style={styles.instructionsText}>
            Evalúa cada comportamiento que observaste. Puedes votar solo los que viste, no es necesario evaluar todos.
          </Text>
        </View>

        {/* Atributos */}
        <View style={styles.attributesSection}>
          <Text style={styles.sectionTitle}>Comportamientos observados</Text>
          
          {DRIVING_ATTRIBUTES.map((attr) => (
            <View key={attr.id} style={styles.attributeRow}>
              <View style={styles.attributeInfo}>
                <Text style={styles.attributeIcon}>{attr.icon}</Text>
                <Text style={styles.attributeLabel}>{attr.label}</Text>
              </View>
              <View style={styles.attributeVoteButtons}>
                {/* Botón Positivo */}
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    styles.voteButtonPositive,
                    attributes[attr.id] === true && styles.voteButtonActive
                  ]}
                  onPress={() => toggleAttribute(attr.id, true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.voteButtonIcon,
                    attributes[attr.id] === true && styles.voteButtonIconActive
                  ]}>
                    ✓
                  </Text>
                </TouchableOpacity>
                
                {/* Botón Negativo */}
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    styles.voteButtonNegative,
                    attributes[attr.id] === false && styles.voteButtonActive
                  ]}
                  onPress={() => toggleAttribute(attr.id, false)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.voteButtonIcon,
                    attributes[attr.id] === false && styles.voteButtonIconActive
                  ]}>
                    ✗
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Comentario adicional (opcional)</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Detalles adicionales del comportamiento observado..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Guardando...' : '✅ Enviar Evaluación'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  content: {
    padding: 20,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 20,
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  driverSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  currentVehicleInfo: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  currentVehicleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 4,
  },
  currentVehiclePlate: {
    fontSize: 13,
    color: '#1976D2',
  },
  unknownDriverSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  plateLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  plate: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  plateInfo: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 15,
  },
  plateInfoText: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '600',
  },
  unknownDriverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  unknownDriverIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  unknownDriverText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  summaryScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 30,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#999',
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  instructionsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  attributesSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attributeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attributeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  attributeLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  attributeVoteButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  voteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  voteButtonPositive: {
    borderColor: '#34C759',
    backgroundColor: '#F1F8F4',
  },
  voteButtonNegative: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF1F0',
  },
  voteButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  voteButtonIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  voteButtonIconActive: {
    color: 'white',
  },
  commentSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
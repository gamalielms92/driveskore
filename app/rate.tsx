import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/config/supabase';
import { DRIVING_ATTRIBUTES } from '../src/utils/gamification';
import { formatPlate, validateSpanishPlate } from '../src/utils/plateValidator';


// Tipo para los atributos
type AttributeVotes = {
  [key: string]: boolean | null;
};

export default function RateScreen() {
  const params = useLocalSearchParams<{ plate: string; photoUri: string }>();
  const router = useRouter();
  const [attributes, setAttributes] = useState<AttributeVotes>({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const plateValidation = validateSpanishPlate(params.plate || '');
  const displayPlate = plateValidation.isValid 
    ? formatPlate(params.plate || '') 
    : params.plate;

  const toggleAttribute = (attrId: string, value: boolean) => {
    setAttributes(prev => ({
      ...prev,
      [attrId]: prev[attrId] === value ? null : value
    }));
  };

  const getVoteSummary = () => {
    const votes = Object.values(attributes).filter(v => v !== null);
    const positive = votes.filter(v => v === true).length;
    const negative = votes.filter(v => v === false).length;
    return { total: votes.length, positive, negative };
  };

  const calculateScore = () => {
    const { total, positive } = getVoteSummary();
    if (total === 0) return 0;
    return (positive / total) * 5;
  };

  const handleSubmit = async () => {
    const { total } = getVoteSummary();
    
    if (total === 0) {
      Alert.alert(
        '⚠️ Sin evaluación',
        'Selecciona al menos un comportamiento observado (positivo o negativo)',
        [{ text: 'OK' }]
      );
      return;
    }
  
    setLoading(true);
  
    try {
      const { data: { user } } = await supabase.auth.getUser();
  
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
  
      // Normalizar matrícula (importante para que coincida)
      const normalizedPlate = params.plate.replace(/\s+/g, ' ').trim().toUpperCase();
      
      console.log('🔍 Evaluando matrícula:', normalizedPlate);
  
      // 1. Buscar conductor activo para esta matrícula
      const { data: activeDriver, error: driverError } = await supabase
        .from('user_vehicles')
        .select('user_id, nickname')
        .eq('plate', normalizedPlate)
        .eq('online', true)
        .maybeSingle();
  
      console.log('👤 Conductor activo encontrado:', activeDriver);
      console.log('❌ Error búsqueda:', driverError);
  
      const driverUserId = activeDriver?.user_id || null;
  
      console.log('✅ Driver User ID final:', driverUserId);
  
      // ⚠️ VALIDACIÓN: No puede votarse a sí mismo
      if (driverUserId && driverUserId === user.id) {
        Alert.alert(
          '🚫 No permitido',
          'No puedes evaluarte a ti mismo. Esta valoración iría a tu propio perfil como conductor activo de este vehículo.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
  
      // 2. Preparar datos de atributos
      const attributeData: { [key: string]: boolean | null } = {};
      DRIVING_ATTRIBUTES.forEach(attr => {
        attributeData[attr.id] = attributes[attr.id] === true ? true : 
                                 attributes[attr.id] === false ? false : null;
      });
  
      // 3. Calcular puntuación basada en votos
      const score = calculateScore();
  
      console.log('⭐ Puntuación calculada:', score);
  
      // 4. Guardar valoración con driver_user_id
      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          plate: normalizedPlate,
          score: Math.round(score),
          comment: comment,
          photo_url: params.photoUri || '',
          rater_id: user.id,
          driver_user_id: driverUserId, // ← ESTE ES EL CAMPO CLAVE
          ...attributeData,
        });
  
      if (ratingError) {
        console.error('❌ Error guardando rating:', ratingError);
        throw ratingError;
      }
  
      console.log('✅ Valoración guardada correctamente');
  
      // 5. Actualizar o crear perfil correspondiente
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('plate', normalizedPlate)
        .eq('user_id', driverUserId)
        .maybeSingle();
  
      console.log('📊 Perfil existente:', existingProfile);
  
      // Calcular atributos positivos acumulados
      const positiveAttributes: { [key: string]: number } = existingProfile?.positive_attributes || {};
      DRIVING_ATTRIBUTES.forEach(attr => {
        if (attributes[attr.id] === true) {
          positiveAttributes[attr.id] = (positiveAttributes[attr.id] || 0) + 1;
        }
      });
  
      const totalVotes = (existingProfile?.total_votes || 0) + 1;
  
      if (existingProfile) {
        const newTotal = existingProfile.total_score + score;
        const newCount = existingProfile.num_ratings + 1;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            total_score: newTotal,
            num_ratings: newCount,
            positive_attributes: positiveAttributes,
            total_votes: totalVotes,
          })
          .eq('plate', normalizedPlate)
          .eq('user_id', driverUserId);
  
        if (updateError) {
          console.error('❌ Error actualizando perfil:', updateError);
        } else {
          console.log('✅ Perfil actualizado correctamente');
        }
      } else {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            plate: normalizedPlate,
            user_id: driverUserId,
            total_score: score,
            num_ratings: 1,
            positive_attributes: positiveAttributes,
            total_votes: totalVotes,
          });
  
        if (insertError) {
          console.error('❌ Error creando perfil:', insertError);
        } else {
          console.log('✅ Perfil creado correctamente');
        }
      }
  
      const { positive, negative } = getVoteSummary();
      
      let successMessage = `Gracias por contribuir a una conducción más segura.\n\n✅ ${positive} positivos\n❌ ${negative} negativos\n⭐ Puntuación: ${score.toFixed(1)}/5.0`;
      
      if (driverUserId) {
        const driverName = activeDriver?.nickname || 'Conductor';
        successMessage += `\n\n👤 Valoración registrada en el perfil de: ${driverName}`;
      } else {
        successMessage += '\n\n🚗 Valoración registrada en el perfil del vehículo';
      }
      
      Alert.alert(
        '¡Evaluación Enviada! 🎉', 
        successMessage,
        [{ 
          text: 'OK', 
          onPress: () => router.replace('/(tabs)') 
        }]
      );
    } catch (error: any) {
      console.error('💥 ERROR COMPLETO:', error);
      Alert.alert('Error', error.message);
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

        <Text style={styles.plateLabel}>Evaluando a:</Text>
        <Text style={styles.plate}>{displayPlate}</Text>
        
        {plateValidation.isValid && (
          <View style={styles.plateInfo}>
            <Text style={styles.plateInfoText}>
              📋 {plateValidation.format === 'current' 
                ? 'Formato actual' 
                : 'Formato provincial'}
            </Text>
          </View>
        )}

        {total > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Puntuación estimada</Text>
            <Text style={styles.summaryScore}>⭐ {estimatedScore.toFixed(1)}/5.0</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>✅ {positive}</Text>
                <Text style={styles.summaryStatLabel}>Positivos</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>❌ {negative}</Text>
                <Text style={styles.summaryStatLabel}>Negativos</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsIcon}>💡</Text>
          <Text style={styles.instructionsText}>
            Selecciona los comportamientos que observaste:{'\n'}
            ✅ = Correcto | ❌ = Incorrecto
          </Text>
        </View>

        <View style={styles.attributesSection}>
          {DRIVING_ATTRIBUTES.map(attr => (
            <View key={attr.id} style={styles.attributeRow}>
              <View style={styles.attributeInfo}>
                <Text style={styles.attributeIcon}>{attr.icon}</Text>
                <Text style={styles.attributeLabel}>{attr.label}</Text>
              </View>
              <View style={styles.attributeVoteButtons}>
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
            {loading ? 'Enviando...' : '✅ Enviar Evaluación'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => router.back()}
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
  plateLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  plate: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 3,
  },
  plateInfo: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  plateInfoText: {
    fontSize: 12,
    color: '#1976D2',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  summaryScore: {
    fontSize: 48,
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
    color: '#666',
  },
  instructionsCard: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionsIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  attributesSection: {
    marginBottom: 20,
  },
  attributeRow: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  attributeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attributeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  attributeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  attributeVoteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  voteButtonPositive: {
    borderColor: '#34C759',
    backgroundColor: '#fff',
  },
  voteButtonNegative: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff',
  },
  voteButtonActive: {
    transform: [{ scale: 1.1 }],
  },
  voteButtonIcon: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ccc',
  },
  voteButtonIconActive: {
    color: '#fff',
  },
  commentSection: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textarea: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#34C759',
    padding: 20,
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
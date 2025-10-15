import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/config/supabase';

export default function RateScreen() {
  const params = useLocalSearchParams<{ plate: string; photoUri: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Selecciona una puntuación');
      return;
    }

    setLoading(true);

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      // Guardar valoración
      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          plate: params.plate,
          score: rating,
          comment: comment,
          photo_url: params.photoUri || '',
          rater_id: user.id,
        });

      if (ratingError) throw ratingError;

      // Actualizar o crear perfil del conductor
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('plate', params.plate)
        .single();

      if (existingProfile) {
        // Actualizar perfil existente
        const newTotal = existingProfile.total_score + rating;
        const newCount = existingProfile.num_ratings + 1;
        
        await supabase
          .from('profiles')
          .update({
            total_score: newTotal,
            num_ratings: newCount,
          })
          .eq('plate', params.plate);
      } else {
        // Crear nuevo perfil
        await supabase
          .from('profiles')
          .insert({
            plate: params.plate,
            total_score: rating,
            num_ratings: 1,
          });
      }

      Alert.alert(
        '¡Éxito!', 
        'Valoración enviada correctamente',
        [{ 
          text: 'OK', 
          onPress: () => router.replace('/(tabs)') 
        }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {params.photoUri && (
          <Image source={{ uri: params.photoUri }} style={styles.photo} />
        )}

        <Text style={styles.plateLabel}>Matrícula:</Text>
        <Text style={styles.plate}>{params.plate}</Text>

        <Text style={styles.label}>Puntuación:</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Text style={styles.star}>
                {star <= rating ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingText}>
          {rating === 0 ? 'Sin valorar' : 
           rating === 1 ? 'Muy malo' :
           rating === 2 ? 'Malo' :
           rating === 3 ? 'Regular' :
           rating === 4 ? 'Bueno' : 'Excelente'}
        </Text>

        <Text style={styles.label}>Comentario (opcional):</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Describe el comportamiento del conductor..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Enviando...' : '✅ Enviar Valoración'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>❌ Cancelar</Text>
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
    borderRadius: 10,
    marginBottom: 20,
  },
  plateLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  plate: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 50,
  },
  ratingText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    fontWeight: '600',
  },
  textarea: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 10,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
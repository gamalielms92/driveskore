import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVoiceRecognition } from '../src/hooks/useVoiceRecognition';

export default function TestVoiceScreen() {
  const { isListening, transcript, startListening, stopListening, speak } = useVoiceRecognition({
    onCommand: (command) => {
      console.log('Comando detectado:', command);
      speak(`Comando ${command} detectado`);
    },
    onResult: (text) => {
      console.log('Texto reconocido:', text);
    }
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Test Voz' }} />
      
      <Text style={styles.title}>🎤 Test de Voz</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.status}>
          Estado: {isListening ? '🟢 Escuchando...' : '⚪ Inactivo'}
        </Text>
      </View>

      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptLabel}>Reconocido:</Text>
        <Text style={styles.transcript}>{transcript || '(nada aún)'}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isListening && styles.buttonActive]}
        onPress={isListening ? stopListening : startListening}
      >
        <Text style={styles.buttonText}>
          {isListening ? 'Detener' : 'Iniciar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.speakButton}
        onPress={() => speak('Hola, esto es una prueba de voz')}
      >
        <Text style={styles.buttonText}>🔊 Probar TTS</Text>
      </TouchableOpacity>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Prueba estos comandos:</Text>
        <Text style={styles.instructionsText}>
          • "Evaluar"{'\n'}
          • "Foto"{'\n'}
          • "Sí" / "No"{'\n'}
          • "Confirmar"{'\n'}
          • "Cancelar"
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  status: {
    fontSize: 18,
    fontWeight: '600',
  },
  transcriptContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    minHeight: 100,
  },
  transcriptLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  transcript: {
    fontSize: 18,
    color: '#000',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#FF3B30',
  },
  speakButton: {
    backgroundColor: '#34C759',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructions: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
});
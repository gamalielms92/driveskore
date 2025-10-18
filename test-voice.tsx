import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TestVoiceScreen() {
  const [result, setResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  useSpeechRecognitionEvent('start', () => {
    console.log('✅ START');
    setIsListening(true);
    setError('');
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('❌ END');
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript || '';
    console.log('📝 RESULT:', text);
    setResult(text);
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('🚨 ERROR:', event.error);
    setError(event.error || 'unknown');
  });

  const startTest = async () => {
    try {
      console.log('🎤 Solicitando permisos...');
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      
      if (!granted) {
        setError('Permiso denegado');
        return;
      }

      console.log('🎤 Iniciando reconocimiento...');
      await ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        continuous: false, // ← PROBAR PRIMERO SIN CONTINUO
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (err) {
      console.error('Error:', err);
      setError(String(err));
    }
  };

  const stopTest = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.error('Error stop:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TEST RECONOCIMIENTO</Text>
      
      <Text style={styles.status}>
        Estado: {isListening ? '🎤 ESCUCHANDO' : '⏸️ DETENIDO'}
      </Text>

      {error && (
        <Text style={styles.error}>Error: {error}</Text>
      )}

      {result && (
        <Text style={styles.result}>Detectado: {result}</Text>
      )}

      <TouchableOpacity 
        style={[styles.button, isListening && styles.buttonActive]} 
        onPress={startTest}
        disabled={isListening}
      >
        <Text style={styles.buttonText}>INICIAR</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={stopTest}
      >
        <Text style={styles.buttonText}>DETENER</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        1. Presiona INICIAR{'\n'}
        2. Habla INMEDIATAMENTE{'\n'}
        3. Di cualquier cosa en español
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  status: {
    fontSize: 20,
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 20,
  },
  error: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  result: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    padding: 15,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonActive: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 22,
  },
});
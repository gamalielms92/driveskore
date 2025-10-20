import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useState } from 'react';
import { voiceService, type VoiceCommand } from '../services/voiceService';

interface UseVoiceRecognitionOptions {
  onCommand?: (command: VoiceCommand) => void;
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  continuous?: boolean;
}

export const useVoiceRecognition = (options: UseVoiceRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('result', (event) => {
    if (!event.results || event.results.length === 0) return;
    
    const text = event.results[0]?.transcript || '';
    console.log('✅ TEXTO DETECTADO:', text);
    
    setTranscript(text);
    voiceService.handleRecognitionResult(text);
    
    if (options.onResult) {
      options.onResult(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    const errorCode = event.error || 'unknown';
    console.error('❌ Error:', errorCode);
    
    setError(`Error: ${errorCode}`);
    setIsListening(false);
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('🎤 Reconocimiento terminado');
    setIsListening(false);
  });

  useSpeechRecognitionEvent('start', () => {
    console.log('🎤 Reconocimiento iniciado');
    setIsListening(true);
    setError(null);
  });

  useEffect(() => {
    if (options.onCommand) {
      voiceService.onCommand(options.onCommand);
    }

    if (options.onResult) {
      voiceService.onResult(options.onResult);
    }

    return () => {
      voiceService.cleanup();
    };
  }, [options.onCommand, options.onResult]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    
    const started = await voiceService.start();
    setIsListening(started);
    return started;
  }, []);

  const stopListening = useCallback(async () => {
    await voiceService.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    await voiceService.speak(text);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    clearTranscript: () => setTranscript(''),
    clearError: () => setError(null),
  };
};
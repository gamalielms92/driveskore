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

  // Polling para actualizar estado
  useEffect(() => {
    const interval = setInterval(() => {
      setIsListening(voiceService.getIsListening());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Configurar callbacks del servicio
  useEffect(() => {
    if (options.onCommand) {
      voiceService.onCommand(options.onCommand);
    }

    if (options.onResult) {
      voiceService.onResult((text) => {
        setTranscript(text);
        if (options.onResult) {
          options.onResult(text);
        }
      });
    }

    return () => {
      voiceService.cleanup();
    };
  }, [options.onCommand, options.onResult]);

  // Auto-start si está configurado
  useEffect(() => {
    if (options.autoStart) {
      startListening();
    }

    return () => {
      stopListening();
    };
  }, [options.autoStart]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    
    const started = await voiceService.start({
      continuous: options.continuous || false,
    });
    
    setIsListening(started);
    return started;
  }, [options.continuous]);

  const stopListening = useCallback(async () => {
    await voiceService.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    await voiceService.speak(text);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    clearTranscript,
    clearError,
  };
};
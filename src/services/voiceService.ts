import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Alert } from 'react-native';

export type VoiceCommand = 
  | 'evaluar' | 'evaluate'
  | 'foto' | 'photo'
  | 'capturar' | 'capture'
  | 'camara' | 'camera'
  | 'si' | 'yes'
  | 'no'
  | 'correcto' | 'correct'
  | 'confirmar' | 'confirm'
  | 'repetir' | 'repeat'
  | 'cancelar' | 'cancel'
  | 'enviar' | 'send'
  | 'salir' | 'exit';

type SupportedLanguage = 'es-ES' | 'en-US';

class VoiceService {
  private isListening: boolean = false;
  private onResultCallback: ((text: string) => void) | null = null;
  private onCommandCallback: ((command: VoiceCommand) => void) | null = null;
  private currentLanguage: SupportedLanguage = 'es-ES';

  constructor() {
    this.isListening = false;
    this.currentLanguage = 'es-ES';
    console.log('🌍 Idioma: es-ES');
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      
      if (!granted) {
        Alert.alert(
          'Permiso denegado',
          'Para usar el modo conducción necesitas activar el micrófono en la configuración.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }

  async start(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        return false;
      }

      console.log('🎤 Iniciando reconocimiento...');

      await ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false, // NO CONTINUO
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
      });

      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error iniciando reconocimiento:', error);
      Alert.alert('Error', 'No se pudo iniciar el reconocimiento de voz');
      return false;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.isListening) {
        await ExpoSpeechRecognitionModule.stop();
        this.isListening = false;
        console.log('🎤 Reconocimiento detenido');
      }
    } catch (error) {
      console.error('Error deteniendo reconocimiento:', error);
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  async speak(text: string, options: Speech.SpeechOptions = {}): Promise<void> {
    try {
      const defaultOptions: Speech.SpeechOptions = {
        language: this.currentLanguage,
        pitch: 1.0,
        rate: 0.9,
        ...options
      };

      await Speech.speak(text, defaultOptions);
      console.log('🔊 Hablando:', text);
    } catch (error) {
      console.error('Error en text-to-speech:', error);
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Error deteniendo speech:', error);
    }
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:]/g, '');
  }

  detectCommand(text: string): VoiceCommand | null {
    const normalized = this.normalizeText(text);

    const commands: { [key: string]: VoiceCommand } = {
      'evaluar': 'evaluar',
      'evalua': 'evaluar',
      'foto': 'foto',
      'capturar': 'capturar',
      'camara': 'camara',
      'si': 'si',
      'vale': 'si',
      'correcto': 'correcto',
      'confirmar': 'confirmar',
      'no': 'no',
      'repetir': 'repetir',
      'cancelar': 'cancelar',
      'enviar': 'enviar',
      'salir': 'salir',
    };

    for (const [key, command] of Object.entries(commands)) {
      if (normalized.includes(key)) {
        return command;
      }
    }

    return null;
  }

  onResult(callback: (text: string) => void): void {
    this.onResultCallback = callback;
  }

  onCommand(callback: (command: VoiceCommand) => void): void {
    this.onCommandCallback = callback;
  }

  handleRecognitionResult(transcript: string): void {
    console.log('📝 Reconocido:', transcript);

    if (this.onResultCallback) {
      this.onResultCallback(transcript);
    }

    const command = this.detectCommand(transcript);
    if (command && this.onCommandCallback) {
      console.log('⚡ Comando detectado:', command);
      this.onCommandCallback(command);
    }
  }

  cleanup(): void {
    this.onResultCallback = null;
    this.onCommandCallback = null;
    this.stop();
  }
}

export const voiceService = new VoiceService();
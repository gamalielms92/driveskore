import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
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
  private shouldKeepListening: boolean = false;

  constructor() {
    this.setupVoiceListeners();
  }

  private setupVoiceListeners() {
    Voice.onSpeechStart = () => {
      console.log('🎤 Reconocimiento iniciado');
      this.isListening = true;
    };

    Voice.onSpeechEnd = () => {
      console.log('🎤 Reconocimiento terminado');
      this.isListening = false;
      
      // Reiniciar si debe seguir escuchando
      if (this.shouldKeepListening) {
        console.log('🔄 Auto-reiniciando...');
        setTimeout(() => {
          this.start({ continuous: true });
        }, 300);
      }
    };

    Voice.onSpeechResults = (event: SpeechResultsEvent) => {
      const results = event.value || [];
      if (results.length > 0) {
        const text = results[0];
        console.log('✅ TEXTO DETECTADO:', text);
        this.handleRecognitionResult(text);
      }
    };

    Voice.onSpeechError = (event: SpeechErrorEvent) => {
      console.error('❌ Error reconocimiento:', event.error);
      
      // Reintentar si debe seguir escuchando
      if (this.shouldKeepListening) {
        console.log('🔄 Error detectado, reiniciando...');
        setTimeout(() => {
          this.start({ continuous: true });
        }, 1000);
      }
    };
  }

  async start(config: { continuous?: boolean; language?: SupportedLanguage } = {}): Promise<boolean> {
    try {
      // Detener cualquier reconocimiento previo
      await this.forceStop();

      this.currentLanguage = config.language || 'es-ES';
      this.shouldKeepListening = config.continuous || false;

      console.log(`🎤 Iniciando reconocimiento (${this.currentLanguage}, continuous: ${this.shouldKeepListening})`);

      await Voice.start(this.currentLanguage);
      
      return true;
    } catch (error) {
      console.error('Error iniciando reconocimiento:', error);
      Alert.alert('Error', 'No se pudo iniciar el reconocimiento de voz');
      return false;
    }
  }

  async stop(): Promise<void> {
    try {
      this.shouldKeepListening = false;
      await Voice.stop();
      await Voice.destroy();
      this.isListening = false;
      console.log('🎤 Reconocimiento detenido');
    } catch (error) {
      console.error('Error deteniendo reconocimiento:', error);
    }
  }

  private async forceStop(): Promise<void> {
    try {
      await Voice.stop();
      await Voice.destroy();
    } catch (error) {
      // Ignorar errores al forzar stop
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getShouldKeepListening(): boolean {
    return this.shouldKeepListening;
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

    const spanishCommands: { [key: string]: VoiceCommand } = {
      'evaluar': 'evaluar',
      'evalua': 'evaluar',
      'valorar': 'evaluar',
      'foto': 'foto',
      'fotografia': 'foto',
      'capturar': 'capturar',
      'captura': 'capturar',
      'camara': 'camara',
      'si': 'si',
      'sí': 'si',
      'vale': 'si',
      'ok': 'si',
      'correcto': 'correcto',
      'bien': 'correcto',
      'confirmar': 'confirmar',
      'confirma': 'confirmar',
      'no': 'no',
      'repetir': 'repetir',
      'repite': 'repetir',
      'otra vez': 'repetir',
      'cancelar': 'cancelar',
      'cancela': 'cancelar',
      'atras': 'cancelar',
      'atrás': 'cancelar',
      'enviar': 'enviar',
      'envia': 'enviar',
      'salir': 'salir',
      'terminar': 'salir',
    };

    const englishCommands: { [key: string]: VoiceCommand } = {
      'evaluate': 'evaluate',
      'rate': 'evaluate',
      'photo': 'photo',
      'picture': 'photo',
      'capture': 'capture',
      'camera': 'camera',
      'yes': 'yes',
      'yeah': 'yes',
      'yep': 'yes',
      'ok': 'yes',
      'okay': 'yes',
      'correct': 'correct',
      'right': 'correct',
      'confirm': 'confirm',
      'no': 'no',
      'nope': 'no',
      'repeat': 'repeat',
      'again': 'repeat',
      'cancel': 'cancel',
      'back': 'cancel',
      'send': 'send',
      'submit': 'send',
      'exit': 'exit',
      'quit': 'exit',
    };

    const allCommands = { ...spanishCommands, ...englishCommands };

    for (const [key, command] of Object.entries(allCommands)) {
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
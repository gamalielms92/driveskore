import { NativeModules, Platform } from 'react-native';

export type SupportedLanguage = 'es-ES' | 'en-US';

export const getDeviceLanguage = (): SupportedLanguage => {
  let deviceLanguage = 'es-ES'; // Default español

  if (Platform.OS === 'ios') {
    deviceLanguage = NativeModules.SettingsManager?.settings?.AppleLocale ||
                    NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                    'es-ES';
  } else if (Platform.OS === 'android') {
    deviceLanguage = NativeModules.I18nManager?.localeIdentifier || 'es-ES';
  }

  // Normalizar a formato de reconocimiento de voz
  if (deviceLanguage.startsWith('en')) {
    return 'en-US';
  } else if (deviceLanguage.startsWith('es')) {
    return 'es-ES';
  }

  // Default
  return 'es-ES';
};

export const getLanguageName = (lang: SupportedLanguage): string => {
  return lang === 'es-ES' ? 'Español' : 'English';
};

export const getVoiceContextStrings = (lang: SupportedLanguage): string[] => {
  if (lang === 'en-US') {
    return ['evaluate', 'photo', 'capture', 'yes', 'no', 'confirm', 'cancel', 'send'];
  }
  return ['evaluar', 'foto', 'capturar', 'si', 'no', 'confirmar', 'cancelar', 'enviar'];
};
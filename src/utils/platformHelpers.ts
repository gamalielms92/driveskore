// src/utils/platformHelpers.ts

import { Platform } from 'react-native';

/**
 * Verifica si la app está corriendo en Web
 */
export const isWeb = (): boolean => {
  return Platform.OS === 'web';
};

/**
 * Verifica si la funcionalidad de captura está disponible
 * (Solo disponible en móvil)
 */
export const isCaptureAvailable = (): boolean => {
  return Platform.OS !== 'web';
};

/**
 * Verifica si el matching está disponible
 * (Solo disponible en móvil)
 */
export const isMatchingAvailable = (): boolean => {
  return Platform.OS !== 'web';
};

/**
 * Verifica si Bluetooth está disponible
 * (Solo disponible en móvil)
 */
export const isBluetoothAvailable = (): boolean => {
  return Platform.OS === 'android' || Platform.OS === 'ios';
};

/**
 * Obtiene mensaje explicativo de por qué una feature no está disponible
 */
export const getUnavailableFeatureMessage = (feature: 'capture' | 'matching' | 'bluetooth'): string => {
  const messages = {
    capture: 'La captura de eventos solo está disponible en la app móvil',
    matching: 'El sistema de matching solo está disponible en la app móvil',
    bluetooth: 'El botón Bluetooth solo está disponible en la app móvil',
  };
  
  return messages[feature];
};

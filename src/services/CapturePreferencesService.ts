// src/services/CapturePreferencesService.ts
// ✅ Gestiona las preferencias de métodos de captura del usuario

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  FLOATING_BUTTON_ENABLED: 'capture_preference_floating_button',
  AB_SHUTTER3_ENABLED: 'capture_preference_ab_shutter3',
};

class CapturePreferencesService {
  /**
   * Obtiene la preferencia del botón flotante
   */
  async getFloatingButtonEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.FLOATING_BUTTON_ENABLED);
      return value === 'true';
    } catch (error) {
      console.error('❌ Error leyendo preferencia botón flotante:', error);
      return false; // Por defecto desactivado
    }
  }

  /**
   * Guarda la preferencia del botón flotante
   */
  async setFloatingButtonEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.FLOATING_BUTTON_ENABLED, enabled.toString());
      console.log(`✅ Preferencia botón flotante guardada: ${enabled}`);
    } catch (error) {
      console.error('❌ Error guardando preferencia botón flotante:', error);
    }
  }

  /**
   * Obtiene la preferencia del AB Shutter 3
   */
  async getABShutter3Enabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.AB_SHUTTER3_ENABLED);
      return value === 'true';
    } catch (error) {
      console.error('❌ Error leyendo preferencia AB Shutter 3:', error);
      return false; // Por defecto desactivado
    }
  }

  /**
   * Guarda la preferencia del AB Shutter 3
   */
  async setABShutter3Enabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.AB_SHUTTER3_ENABLED, enabled.toString());
      console.log(`✅ Preferencia AB Shutter 3 guardada: ${enabled}`);
    } catch (error) {
      console.error('❌ Error guardando preferencia AB Shutter 3:', error);
    }
  }

  /**
   * Obtiene todas las preferencias
   */
  async getAllPreferences(): Promise<{
    floatingButtonEnabled: boolean;
    abShutter3Enabled: boolean;
  }> {
    const [floatingButtonEnabled, abShutter3Enabled] = await Promise.all([
      this.getFloatingButtonEnabled(),
      this.getABShutter3Enabled(),
    ]);

    return {
      floatingButtonEnabled,
      abShutter3Enabled,
    };
  }

  /**
   * Limpia todas las preferencias
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.FLOATING_BUTTON_ENABLED,
        KEYS.AB_SHUTTER3_ENABLED,
      ]);
      console.log('🧹 Preferencias de captura limpiadas');
    } catch (error) {
      console.error('❌ Error limpiando preferencias:', error);
    }
  }
}

export default new CapturePreferencesService();
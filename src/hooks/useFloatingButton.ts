// src/hooks/useFloatingButton.ts
// VERSIÓN ACTUALIZADA - Soporta Android (nativo) e iOS (local)

import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Analytics } from '../services/Analytics';
import CapturePreferencesService from '../services/CapturePreferencesService';
import EventCaptureService from '../services/EventCaptureService';
import FloatingButtonNative from '../services/FloatingButtonNative';

interface UseFloatingButtonResult {
  isActive: boolean;
  hasPermission: boolean;
  isChecking: boolean;
  startButton: () => Promise<void>;
  stopButton: () => Promise<void>;
  toggleButton: () => Promise<void>;
  requestPermission: () => void;
  checkPermission: () => Promise<void>;
  platform: 'android' | 'ios' | 'web';
  isLocalButton: boolean; // Para iOS
}

export function useFloatingButton(): UseFloatingButtonResult {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const platform = Platform.OS as 'android' | 'ios' | 'web';
  const isLocalButton = Platform.OS === 'ios';

  // Verificar estado inicial
  useEffect(() => {
    checkInitialState();
  }, []);

  const handleCaptureFromNative = useCallback(async () => {
    try {
      console.log('🎯 Captura activada desde botón flotante nativo');
      
      // Notificación de inicio
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📸 Capturando Evento...',
          body: 'Procesando información del incidente',
          sound: true,
        },
        trigger: null,
      });

      // Capturar evento
      const event = await EventCaptureService.captureEvent('car');
      console.log('✅ Evento capturado:', event.id);

      // Trackear uso del botón flotante
      await Analytics.trackFloatingButtonPressed();

      // Notificación de éxito
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Evento Capturado',
          body: `ID: ${event.id.slice(0, 8)}... - Revísalo en Eventos Pendientes`,
          data: { eventId: event.id },
          sound: true,
        },
        trigger: null,
      });

    } catch (error: any) {
      console.error('❌ Error capturando desde botón flotante:', error);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Error al Capturar',
          body: `No se pudo guardar: ${error?.message || 'Error desconocido'}`,
          sound: true,
        },
        trigger: null,
      });
    }
  }, []);

  // Solo para Android: escuchar eventos del botón nativo
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    console.log('👂 Registrando listener de eventos del botón flotante nativo');
    
    const unsubscribe = FloatingButtonNative.onCaptureEvent(() => {
      console.log('📡 Evento recibido desde módulo nativo');
      handleCaptureFromNative();
    });

    return () => {
      console.log('🛑 Desregistrando listener del botón flotante');
      unsubscribe();
    };
  }, [handleCaptureFromNative]);

  const checkInitialState = async () => {
    setIsChecking(true);
    
    if (Platform.OS === 'android') {
      // Android: verificar permisos del sistema
      const permission = await FloatingButtonNative.checkPermission();
      setHasPermission(permission);
      
      if (permission) {
        const running = await FloatingButtonNative.isRunning();
        setIsActive(running);
      }
    } else if (Platform.OS === 'ios') {
      // iOS: el botón local siempre tiene "permiso"
      setHasPermission(true);
      
      // Leer preferencia guardada
      const savedPreference = await CapturePreferencesService.getFloatingButtonEnabled();
      setIsActive(savedPreference);
    } else {
      // Web: no soportado
      setHasPermission(false);
      setIsActive(false);
    }
    
    setIsChecking(false);
  };

  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      const permission = await FloatingButtonNative.checkPermission();
      setHasPermission(permission);
    } else if (Platform.OS === 'ios') {
      setHasPermission(true); // iOS siempre tiene permiso para botón local
    } else {
      setHasPermission(false);
    }
  };

  const requestPermission = useCallback(() => {
    if (Platform.OS === 'android') {
      FloatingButtonNative.requestPermission();
      
      // Verificar permiso después de 2 segundos
      setTimeout(() => {
        checkPermission();
      }, 2000);
    }
    // iOS no necesita permisos para botón local
  }, []);

  const startButton = async () => {
    try {
      if (Platform.OS === 'android') {
        // Android: iniciar servicio nativo
        const started = await FloatingButtonNative.start();
        if (started) {
          setIsActive(true);
          await CapturePreferencesService.setFloatingButtonEnabled(true);
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🟢 Botón Flotante Activo',
              body: 'Minimiza la app para ver el botón flotante',
            },
            trigger: null,
          });
        }
      } else if (Platform.OS === 'ios') {
        // iOS: solo cambiar estado y guardar preferencia
        setIsActive(true);
        await CapturePreferencesService.setFloatingButtonEnabled(true);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🟢 Botón Flotante iOS Activo',
            body: 'El botón aparecerá en la esquina de la app',
          },
          trigger: null,
        });
      }
      
      console.log('💾 Preferencia guardada: Botón flotante ACTIVADO');
    } catch (error) {
      console.error('Error al iniciar botón flotante:', error);
      throw error;
    }
  };

  const stopButton = async () => {
    try {
      if (Platform.OS === 'android') {
        // Android: detener servicio nativo
        const stopped = await FloatingButtonNative.stop();
        if (stopped) {
          setIsActive(false);
          await CapturePreferencesService.setFloatingButtonEnabled(false);
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🔴 Botón Flotante Desactivado',
              body: 'Ya no capturarás eventos en segundo plano',
            },
            trigger: null,
          });
        }
      } else if (Platform.OS === 'ios') {
        // iOS: solo cambiar estado y guardar preferencia
        setIsActive(false);
        await CapturePreferencesService.setFloatingButtonEnabled(false);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔴 Botón Flotante iOS Desactivado',
            body: 'El botón ya no aparecerá en la app',
          },
          trigger: null,
        });
      }
      
      console.log('💾 Preferencia guardada: Botón flotante DESACTIVADO');
    } catch (error) {
      console.error('Error al detener botón flotante:', error);
      throw error;
    }
  };

  const toggleButton = async () => {
    if (!hasPermission && Platform.OS === 'android') {
      requestPermission();
      return;
    }

    if (isActive) {
      await stopButton();
    } else {
      await startButton();
    }
  };

  return {
    isActive,
    hasPermission,
    isChecking,
    startButton,
    stopButton,
    toggleButton,
    requestPermission,
    checkPermission,
    platform,
    isLocalButton,
  };
}
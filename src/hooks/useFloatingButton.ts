// src/hooks/useFloatingButton.ts
// Hook para gestionar el estado y eventos del botón flotante

import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
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
}

export function useFloatingButton(): UseFloatingButtonResult {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Verificar estado inicial
  useEffect(() => {
    checkInitialState();
  }, []);

  // Escuchar eventos de captura del botón nativo
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const unsubscribe = FloatingButtonNative.onCaptureEvent(() => {
      handleCaptureFromNative();
    });

    return () => unsubscribe();
  }, []);

  const checkInitialState = async () => {
    setIsChecking(true);
    
    // Verificar permiso
    const permission = await FloatingButtonNative.checkPermission();
    setHasPermission(permission);
    
    // Verificar si el servicio está activo
    if (permission) {
      const running = await FloatingButtonNative.isRunning();
      setIsActive(running);
    }
    
    setIsChecking(false);
  };

  const checkPermission = async () => {
    const permission = await FloatingButtonNative.checkPermission();
    setHasPermission(permission);
  };

  const requestPermission = useCallback(() => {
    FloatingButtonNative.requestPermission();
    
    // Verificar permiso después de 2 segundos
    setTimeout(() => {
      checkPermission();
    }, 2000);
  }, []);

  const startButton = async () => {
    try {
      const started = await FloatingButtonNative.start();
      if (started) {
        setIsActive(true);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🟢 Botón Flotante Activo',
            body: 'Minimiza la app para ver el botón flotante',
          },
          trigger: null,
        });
        
        return;
      }
      
      throw new Error('No se pudo iniciar el botón');
    } catch (error) {
      console.error('Error al iniciar botón flotante:', error);
      throw error;
    }
  };

  const stopButton = async () => {
    try {
      const stopped = await FloatingButtonNative.stop();
      if (stopped) {
        setIsActive(false);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔴 Botón Flotante Desactivado',
            body: 'Ya no capturarás eventos en segundo plano',
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error al detener botón flotante:', error);
      throw error;
    }
  };

  const toggleButton = async () => {
    if (!hasPermission) {
      requestPermission();
      return;
    }

    if (isActive) {
      await stopButton();
    } else {
      await startButton();
    }
  };

  const handleCaptureFromNative = async () => {
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

    } catch (error) {
      console.error('❌ Error capturando desde botón flotante:', error);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Error al Capturar',
          body: 'No se pudo guardar el evento. Intenta de nuevo.',
          sound: true,
        },
        trigger: null,
      });
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
  };
}
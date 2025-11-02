// src/components/FloatingCaptureButton.tsx
// ✅ Botón flotante que aparece sobre otras apps

import * as Notifications from 'expo-notifications';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity
} from 'react-native';
import EventCaptureService from '../services/EventCaptureService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingCaptureButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

export default function FloatingCaptureButton({ 
  isActive, 
  onToggle 
}: FloatingCaptureButtonProps) {
  // ✅ CORRECCIÓN: Usar useRef para mantener la referencia
  const position = useRef(
    new Animated.ValueXY({ x: SCREEN_WIDTH - 80, y: SCREEN_HEIGHT / 2 })
  ).current;
  
  const [capturing, setCapturing] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);

  // PanResponder para poder arrastrar el botón
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        // Hacer snap a los bordes
        const snapToEdge = gesture.moveX < SCREEN_WIDTH / 2 ? 20 : SCREEN_WIDTH - 80;
        
        Animated.spring(position, {
          toValue: { x: snapToEdge, y: gesture.dy },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleCapture = async () => {
    // Debounce: evitar doble captura
    const now = Date.now();
    if (now - lastCaptureTime < 2000) {
      console.log('⏱️ Debounce: ignorando captura repetida');
      return;
    }
    setLastCaptureTime(now);

    setCapturing(true);

    try {
      // Notificación inmediata
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📸 Capturando Evento...',
          body: 'Guardando información del incidente',
          sound: true,
        },
        trigger: null,
      });

      // Capturar evento
      const event = await EventCaptureService.captureEvent('car');
      console.log('✅ Evento capturado desde botón flotante:', event.id);

      // Notificación de éxito
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Evento Capturado',
          body: 'Revísalo más tarde en Eventos Pendientes',
          data: { eventId: event.id },
          sound: true,
        },
        trigger: null,
      });

      // ✅ CORRECCIÓN: Acceder correctamente a los valores animados
      // Opción 1: Usar getLayout() que devuelve los valores actuales
      const currentPosition = position.getLayout();
      
      // Feedback visual con rebote
      Animated.sequence([
        Animated.spring(position, {
          toValue: { 
            x: (position.x as any)._value, 
            y: (position.y as any)._value - 20 
          },
          useNativeDriver: false,
          friction: 3,
        }),
        Animated.spring(position, {
          toValue: { 
            x: (position.x as any)._value, 
            y: (position.y as any)._value + 20
          },
          useNativeDriver: false,
          friction: 3,
        }),
      ]).start();

    } catch (error) {
      console.error('❌ Error capturando desde botón flotante:', error);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Error',
          body: 'No se pudo capturar el evento',
          sound: true,
        },
        trigger: null,
      });
    } finally {
      setCapturing(false);
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[
          styles.button,
          capturing && styles.buttonCapturing,
        ]}
        onPress={handleCapture}
        activeOpacity={0.8}
        disabled={capturing}
      >
        <Text style={styles.buttonText}>
          {capturing ? '📸' : '🎯'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonCapturing: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    fontSize: 28,
  },
});
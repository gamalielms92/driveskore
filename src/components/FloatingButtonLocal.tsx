// src/components/FloatingButtonLocal.tsx
// Botón flotante LOCAL para iOS - funciona DENTRO de la app
// VERSIÓN CORREGIDA - Sin usar _value

import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../config/supabase';
import EventCaptureService from '../services/EventCaptureService';

const BUTTON_SIZE = 60;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingButtonLocalProps {
  enabled?: boolean;
}

export default function FloatingButtonLocal({ enabled = true }: FloatingButtonLocalProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Posición inicial
  const pan = useRef(new Animated.ValueXY({
    x: screenWidth - BUTTON_SIZE - 20,
    y: screenHeight / 2
  })).current;
  
  // Para animación de escala
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const lastTap = useRef<number>(0);
  const DOUBLE_TAP_DELAY = 300;

  // Solo mostrar en iOS
  if (Platform.OS !== 'ios' || !enabled || !isVisible) {
    return null;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Solo mover si el gesto es mayor a 5px (para diferenciar de tap)
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      
      onPanResponderGrant: () => {
        // Feedback háptico al tocar
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      
      onPanResponderRelease: (_, gestureState) => {
        // Si el movimiento fue mínimo, es un tap
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          handlePress();
        } else {
          // Snap to edge (efecto magnético a los bordes)
          const finalX = gestureState.moveX > screenWidth / 2 
            ? screenWidth - BUTTON_SIZE - 10 
            : 10;
          
          Animated.spring(pan, {
            toValue: { x: finalX, y: gestureState.moveY },
            useNativeDriver: false,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  const handlePress = async () => {
    const now = Date.now();
    
    // Detectar doble tap para acciones especiales
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      handleDoubleTap();
      return;
    }
    lastTap.current = now;

    // Captura simple
    if (isCapturing) return;
    
    try {
      setIsCapturing(true);
      
      // Feedback háptico fuerte
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Animación de presión
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
      ]).start();
      
      // Obtener usuario
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '❌ Error',
            body: 'Debes iniciar sesión primero',
            sound: true,
          },
          trigger: null,
        });
        return;
      }
      
      // Inicializar y capturar
      await EventCaptureService.initialize(userId);
      const event = await EventCaptureService.captureEvent('car');
      
      // Notificación de éxito
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Evento Capturado',
          body: `ID: ${event.id.slice(0, 8)}...`,
          sound: true,
        },
        trigger: null,
      });
      
    } catch (error: any) {
      console.error('❌ Error capturando:', error);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Error',
          body: error?.message || 'No se pudo capturar',
          sound: true,
        },
        trigger: null,
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDoubleTap = () => {
    // Doble tap: Ocultar temporalmente
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animación de desvanecimiento
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      
      // Volver después de 5 segundos
      setTimeout(() => {
        setIsVisible(true);
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }).start();
      }, 5000);
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scaleAnim },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[styles.button, isCapturing && styles.buttonCapturing]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.buttonInner}>
          {isCapturing ? (
            <Text style={styles.buttonText}>...</Text>
          ) : (
            <Text style={styles.buttonText}>📸</Text>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Indicador de iOS */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>iOS</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  buttonCapturing: {
    backgroundColor: '#34C759',
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useVoiceRecognition } from '../src/hooks/useVoiceRecognition';

type DrivingState = 'waiting' | 'sleep' | 'ready';

const { width } = Dimensions.get('window');

export default function DrivingModeScreen() {
  useKeepAwake();

  const router = useRouter();
  const [drivingState, setDrivingState] = useState<DrivingState>('waiting');
  const [inactivityTimeout, setInactivityTimeout] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false); // NUEVO
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { isListening, startListening, stopListening } = useVoiceRecognition({
    continuous: true,
    autoStart: false,
    onCommand: (command) => {
      handleVoiceCommand(command);
    }
  });

  // INICIALIZACIÓN - SOLO UNA VEZ
  useEffect(() => {
    if (isInitialized) return; // Evitar ejecución múltiple
    
    console.log('🚗 Inicializando modo conducción...');
    
    const initialize = async () => {
      // Esperar montaje completo
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Iniciar reconocimiento PRIMERO (sin hablar)
      console.log('🎤 Iniciando reconocimiento silencioso...');
      await startListening();
      
      // Esperar un poco más
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // AHORA hablar
      console.log('🔊 Reproduciendo mensaje de bienvenida...');
      Speech.speak(
        'Modo conducción activado',
        {
          language: 'es-ES',
          rate: 1.0
        }
      );
      
      setIsInitialized(true);
    };

    initialize();

    return () => {
      console.log('🛑 Limpiando modo conducción...');
      Speech.stop();
      stopListening();
      restoreBrightness();
    };
  }, []); // VACÍO - solo ejecutar una vez

  useEffect(() => {
    if (!isInitialized) return;
    
    if (drivingState === 'waiting') {
      startPulseAnimation();
      setBrightness(0.8);
      
      const timeout = setTimeout(() => {
        console.log('⏱️ Inactividad detectada, entrando en modo reposo');
        setDrivingState('sleep');
      }, 15000);
      
      setInactivityTimeout(timeout);

      return () => {
        if (timeout) clearTimeout(timeout);
        pulseAnim.stopAnimation();
      };
    } else if (drivingState === 'sleep') {
      setBrightness(0.2);
      fadeOut();
      stopListening();
    } else if (drivingState === 'ready') {
      setBrightness(1.0);
      fadeIn();
      startListening();
    }
  }, [drivingState, isInitialized]);

  const handleVoiceCommand = (command: string) => {
    console.log('🎤 Comando en modo conducción:', command);

    if (command === 'evaluar' || command === 'evaluate') {
      activateEvaluation();
    } else if (command === 'foto' || command === 'photo' || 
               command === 'capturar' || command === 'capture' || 
               command === 'camara' || command === 'camera') {
      if (drivingState === 'ready') {
        startCapture();
      } else {
        activateEvaluation();
      }
    } else if (command === 'salir' || command === 'exit') {
      exitDrivingMode();
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const setBrightness = async (value: number) => {
    try {
      await Brightness.setBrightnessAsync(value);
    } catch (error) {
      console.log('No se pudo ajustar brillo:', error);
    }
  };

  const restoreBrightness = async () => {
    try {
      await Brightness.setBrightnessAsync(0.8);
    } catch (error) {
      console.log('No se pudo restaurar brillo:', error);
    }
  };

  const handleScreenTouch = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (drivingState === 'sleep') {
      console.log('👆 Despertar de modo reposo');
      setDrivingState('waiting');
      startListening();
    } else if (drivingState === 'waiting') {
      console.log('👆 Activar evaluación');
      activateEvaluation();
    }
  };

  const activateEvaluation = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDrivingState('ready');
    
    Speech.speak('Listo para evaluar', {
      language: 'es-ES',
      rate: 1.0
    });
  };

  const startCapture = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    router.push({
      pathname: '/(tabs)/capture',
      params: { 
        viaVoice: 'true',
        drivingMode: 'true'
      }
    });
  };

  const cancelReady = () => {
    setDrivingState('waiting');
    Speech.speak('Cancelado', {
      language: 'es-ES',
      rate: 1.0
    });
  };

  const exitDrivingMode = () => {
    Speech.speak('Saliendo', {
      language: 'es-ES',
      rate: 1.0
    });
    
    restoreBrightness();
    stopListening();
    
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 1000);
  };

  return (
    <Pressable 
      style={styles.container}
      onPress={handleScreenTouch}
    >
      <Animated.View 
        style={[
          styles.content,
          { opacity: fadeAnim }
        ]}
      >
        {/* ESTADO: ESPERANDO */}
        {drivingState === 'waiting' && (
          <View style={styles.stateContainer}>
            <Text style={styles.stateIcon}>🚗</Text>
            <Text style={styles.stateTitle}>MODO CONDUCCIÓN</Text>
            
            <Animated.View 
              style={[
                styles.listeningIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Text style={styles.listeningText}>
                {isListening ? '🎤 ESCUCHANDO' : '⏳ Iniciando...'}
              </Text>
            </Animated.View>

            <Text style={styles.instruction}>
              Toca la pantalla o di "EVALUAR"
            </Text>

            <TouchableOpacity 
              style={styles.exitButton}
              onPress={exitDrivingMode}
            >
              <Text style={styles.exitButtonText}>Salir</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ESTADO: REPOSO */}
        {drivingState === 'sleep' && (
          <View style={styles.stateContainer}>
            <Text style={styles.sleepIcon}>😴</Text>
            <Text style={styles.sleepText}>Toca para activar</Text>
          </View>
        )}

        {/* ESTADO: LISTO */}
        {drivingState === 'ready' && (
          <View style={styles.stateContainer}>
            <Text style={styles.readyIcon}>🎤</Text>
            <Text style={styles.readyTitle}>LISTO PARA EVALUAR</Text>

            <TouchableOpacity 
              style={styles.captureButton}
              onPress={startCapture}
            >
              <Text style={styles.captureIcon}>📷</Text>
              <Text style={styles.captureText}>CAPTURAR FOTO</Text>
              <Text style={styles.captureHint}>(o di "FOTO")</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={cancelReady}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Indicador de estado */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {drivingState === 'waiting' && '🟢 Activo'}
          {drivingState === 'sleep' && '😴 Reposo'}
          {drivingState === 'ready' && '🎤 Listo'}
        </Text>
        {isListening && (
          <Text style={styles.statusText}>| 🎤</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 30,
  },
  stateIcon: {
    fontSize: 100,
    marginBottom: 30,
  },
  stateTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  listeningIndicator: {
    backgroundColor: 'rgba(52, 199, 89, 0.3)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 40,
  },
  listeningText: {
    fontSize: 20,
    color: '#34C759',
    fontWeight: 'bold',
  },
  instruction: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 60,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  exitButtonText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sleepIcon: {
    fontSize: 120,
    marginBottom: 30,
  },
  sleepText: {
    fontSize: 24,
    color: '#666',
    textAlign: 'center',
  },
  readyIcon: {
    fontSize: 100,
    marginBottom: 20,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 60,
    textAlign: 'center',
  },
  captureButton: {
    backgroundColor: '#007AFF',
    width: width * 0.8,
    paddingVertical: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  captureIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  captureText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  captureHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  cancelButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 18,
    fontWeight: '600',
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
});
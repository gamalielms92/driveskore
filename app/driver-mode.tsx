// app/driver-mode.tsx

import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import FloatingButtonListener from '../src/components/FloatingButtonListener';
import { supabase } from '../src/config/supabase';
import ABShutter3Service from '../src/services/ABShutter3Service';
import { Analytics } from '../src/services/Analytics';
import CapturePreferencesService from '../src/services/CapturePreferencesService';
import EventCaptureService from '../src/services/EventCaptureService';
import FloatingButtonNative from '../src/services/FloatingButtonNative';
import LocationTrackingService from '../src/services/LocationTrackingService';
import type { Vehicle } from '../src/types/vehicle'; // <-- IMPORTAR TIPO
import { getVehicleDescription, getVehicleDisplayName, getVehicleIcon } from '../src/utils/vehicleHelpers';

export default function DriverModeScreen() {
  const router = useRouter();
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [stats, setStats] = useState({
    duration: 0,
    distance: 0,
    lastUpdate: null as Date | null
  });

  const trackingInterval = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // Función para cargar vehículo emparejado
  const loadActiveVehicle = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserId('');
        setActiveVehicle(null);
        return;
      }

      setUserId(user.id);

      const { data: vehicle } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('online', true)
        .maybeSingle();

      setActiveVehicle(vehicle || null);
      console.log('🚗 Vehículo activo cargado:', vehicle || 'ninguno');
      
      // Verificar si el tracking ya está activo
      const trackingActive = LocationTrackingService.isActive();
      setIsTracking(trackingActive);
      console.log('📍 Tracking activo:', trackingActive);
      
    } catch (error) {
      console.error('Error cargando vehículo activo:', error);
      setActiveVehicle(null);
    } finally {
      setLoading(false);
    }
  };

  // Recargar cada vez que la pantalla gana el foco
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Driver Mode enfocado - Recargando vehículo emparejado...');
      loadActiveVehicle();
    }, [])
  );

  // ✅ Mantener las estadísticas actualizándose mientras el tracking está activo
  useEffect(() => {
    // Solo ejecutar si el tracking está activo
    if (!isTracking) {
      return;
    }

    console.log('⏱️ Configurando actualización periódica de stats');
    
    // Actualizar inmediatamente
    updateStats();
    
    // Configurar interval para actualizar cada 5 segundos
    const interval = setInterval(() => {
      console.log('🔄 Actualizando stats...');
      updateStats();
    }, 5000); // Actualizar cada 5 segundos para ver los cambios más rápido
    
    // Guardar referencia del interval
    trackingInterval.current = interval;
    
    // Limpiar al desmontar o cuando isTracking cambie
    return () => {
      console.log('🛑 Limpiando interval de stats');
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
        trackingInterval.current = null;
      }
    };
  }, [isTracking]); // Se reinicia cuando isTracking cambia
  
  useEffect(() => {
    // Manejar cambios en el estado de la app
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App volvió al foreground');
        if (isTracking) {
          checkTrackingStatus();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isTracking]);

  useEffect(() => {
    // Cleanup al desmontar
    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    };
  }, []);

  const checkTrackingStatus = async () => {
    const status = LocationTrackingService.isActive();
    setIsTracking(status);
    
    if (status) {
      updateStats();
    }
  };

  // También, asegúrate de que updateStats tenga logs para debug:
  const updateStats = async () => {
    //console.log('📊 updateStats() llamado');
    
    try {
      // Obtener datos reales del servicio de tracking
      const trackingData = await LocationTrackingService.getTrackingStats();
      //console.log('📊 Datos recibidos:', trackingData);
      
      if (trackingData) {
        const newStats = {
          duration: trackingData.duration || 0,
          distance: trackingData.distance || 0,
          lastUpdate: new Date()
        };
        
        //console.log('📊 Actualizando estado con:', newStats);
        setStats(newStats);
      } else {
        console.log('⚠️ No hay datos de tracking');
      }
    } catch (error) {
      console.error('❌ Error actualizando stats:', error);
    }
  };

  const handleStartTracking = async () => {
    try {
      console.log('═══════════════════════════════════════');
      console.log('🔧 handleStartTracking llamado');
      
      // Validación 1: Usuario autenticado
      if (!userId) {
        Alert.alert('Error', 'Debes iniciar sesión');
        return;
      }

      // Validación 2: Recargar y verificar vehículo emparejado EN TIEMPO REAL
      await loadActiveVehicle();
      
      console.log('📋 User ID:', userId);
      console.log('📋 Active Vehicle:', activeVehicle);
      
      if (!activeVehicle) {
        Alert.alert(
          'Sin vehículo activo',
          'Debes activar un vehículo en la pantalla "Mis Vehículos" para poder usar el Modo Conductor.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Ir a Vehículos',
              onPress: () => {
                router.push('/select-vehicle');
              }
            }
          ]
        );
        return;
      }

      // Validación 3: Permisos de ubicación
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'La app necesita acceso a tu ubicación para funcionar en modo conductor.'
        );
        return;
      }

      // En Android, también pedir permisos de background
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Permiso de ubicación en segundo plano',
            'Para un seguimiento continuo, permite el acceso a la ubicación "Siempre" en la configuración.'
          );
        }
      }

      // Preparar identificador del vehículo
      const vehicleIdentifier = activeVehicle.plate || 'unknown';
      const vehicleName = activeVehicle.brand && activeVehicle.model 
        ? `${activeVehicle.brand} ${activeVehicle.model}`
        : activeVehicle.nickname || vehicleIdentifier;

      // Iniciar tracking
      Alert.alert(
        'Iniciar Modo Conductor',
        `Se activará el seguimiento para el vehículo ${vehicleName}.\n\n` +
        '• Podrás recibir valoraciones\n' +
        '• Podrás evaluar otros conductores\n' +
        '• El modo funciona en segundo plano',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar',
            onPress: async () => {
              try {
                console.log('✅ Validaciones pasadas');
                console.log('🚀 Iniciando LocationTrackingService...');
                
                // Inicializar servicio con el identificador correcto
                await LocationTrackingService.initialize(userId, vehicleIdentifier);
                console.log('✅ LocationTrackingService inicializado');

                // ✅ Asegurar que EventCaptureService está inicializado
                console.log('🔧 Verificando EventCaptureService...');
                await EventCaptureService.initialize(userId);
                console.log('✅ EventCaptureService verificado/reinicializado');

                // Iniciar tracking
                console.log('📍 Llamando a startTracking()...');
                const success = await LocationTrackingService.startTracking();
                console.log('📊 startTracking() result:', success);
                
                if (success) {
                  setIsTracking(true);
                  // ✅ NUEVO: Leer preferencias de captura
                  const preferences = await CapturePreferencesService.getAllPreferences();
                  console.log('📋 Preferencias de captura:', preferences);

                  // ✅ NUEVO: Activar AB Shutter 3 si está en preferencias
                  if (preferences.abShutter3Enabled) {
                    console.log('🎮 Activando botón físico...');
                    ABShutter3Service.startListening();
                  }

                  // ✅ NUEVO: Activar Botón Flotante si está en preferencias
                  if (preferences.floatingButtonEnabled && Platform.OS === 'android') {
                    console.log('🔘 Activando botón virtual...');
    
                    // Verificar permiso
                    const hasPermission = await FloatingButtonNative.checkPermission();
                    if (hasPermission) {
                      await FloatingButtonNative.start();
                    } else {
                      console.warn('⚠️ No hay permiso para botón flotante');
                    }
                  }
                  // ✅ NUEVO: Trackear inicio del modo conductor
                  await Analytics.trackDriverModeStarted();
                  console.log('📊 Analytics: driver_mode_started');
                  
                  // Actualizar stats cada 10 segundos
                  trackingInterval.current = setInterval(() => {
                    updateStats();
                  }, 10000);
                  
                  Alert.alert(
                    '✅ Modo Conductor Activo',
                    'El seguimiento ha comenzado. Puedes minimizar la app.'
                  );
                  console.log('✅ Tracking iniciado exitosamente');
                } else {
                  Alert.alert('Error', 'No se pudo iniciar el tracking');
                  console.error('❌ startTracking() retornó false');
                }
              } catch (error: any) {
                console.error('❌ Error iniciando tracking:', error);
                
                // ✅ NUEVO: Registrar error en Crashlytics
                await Analytics.logError(error, 'handleStartTracking - Driver Mode');
                
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('═══════════════════════════════════════');
      console.error('❌ Error en handleStartTracking:', error);
      console.error('❌ Error message:', error.message);
      console.error('═══════════════════════════════════════');
      
      // ✅ NUEVO: Registrar error en Crashlytics
      await Analytics.logError(error, 'handleStartTracking - Outer catch');
      
      Alert.alert('Error', error.message || 'No se pudo iniciar el modo conductor');
    }
  };

  const handleStopTracking = async () => {
    Alert.alert(
      'Detener Modo Conductor',
      '¿Quieres finalizar el seguimiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('⏸️ Deteniendo tracking...');
              
              // ✅ NUEVO: Detener AB Shutter 3
              console.log('🛑 Deteniendo botón físico...');
              ABShutter3Service.stopListening();

              // ✅ NUEVO: Detener Botón Flotante
              if (Platform.OS === 'android') {
                console.log('🛑 Deteniendo botón virtual...');
                await FloatingButtonNative.stop();
              }
              // ✅ NUEVO: Usar duración de las stats existentes
              const duration = stats.duration || 0;
              
              await LocationTrackingService.stopTracking();
              setIsTracking(false);
              
              // ✅ NUEVO: Trackear fin del modo conductor con duración
              await Analytics.trackDriverModeStopped(duration);
              console.log(`📊 Analytics: driver_mode_stopped (${duration}s)`);
              
              if (trackingInterval.current) {
                clearInterval(trackingInterval.current);
                trackingInterval.current = null;
              }
              
              Alert.alert(
                '✅ Modo Conductor Detenido',
                'El seguimiento ha finalizado correctamente.'
              );
              console.log('✅ Tracking detenido');
            } catch (error: any) {
              console.error('❌ Error deteniendo tracking:', error);
              
              // ✅ NUEVO: Registrar error en Crashlytics
              await Analytics.logError(error, 'handleStopTracking - Driver Mode');
              
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>
            Activa el seguimiento mientras conduces para poder evaluar y ser evaluado.
          </Text>
        </View>

        {/* Estado del vehículo */}
<View style={[
    styles.vehicleCard,
    isTracking && styles.vehicleCardActive
  ]}>
  <Text style={styles.cardTitle}>
    {activeVehicle ? getVehicleIcon(activeVehicle.vehicle_type) : '🚗'} Vehículo activo
  </Text>
  {activeVehicle ? (
    <>
      <Text style={[
        styles.vehiclePlate,
        isTracking && styles.vehiclePlateTracking
      ]}>
        {isTracking ? '🟢' : '🔵'} {getVehicleDescription(activeVehicle)}
      </Text>
      <Text style={styles.vehicleIdentifier}>
        {getVehicleDisplayName(activeVehicle)}
      </Text>
      <Text style={styles.vehicleStatus}>
        {isTracking ? 'Estado: Online' : 'Listo para conducir'}
      </Text>
    </>
  ) : (
    <>
      <Text style={styles.noVehicle}>⚪ Sin vehículo activo</Text>
      <TouchableOpacity
        style={styles.selectVehicleButton}
        onPress={() => router.push('/select-vehicle')}
      >
        <Text style={styles.selectVehicleButtonText}>
          Seleccionar vehículo →
        </Text>
      </TouchableOpacity>
    </>
  )}
</View>

        {/* Control de tracking */}
        <View style={[
          styles.trackingCard,
          isTracking && styles.trackingCardActive
        ]}>
          <View style={styles.trackingHeader}>
            <Text style={styles.cardTitle}>
              {isTracking ? '🔴 Seguimiento Activo' : '⚪ Seguimiento Inactivo'}
            </Text>
            {isTracking && stats.lastUpdate && (
              <Text style={styles.lastUpdate}>
                Última actualización: {stats.lastUpdate.toLocaleTimeString()}
              </Text>
            )}
          </View>

          {isTracking ? (
            <>
              {/* Botón detener */}
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopTracking}
              >
                <Text style={styles.stopButtonText}>⏹️ Detener Seguimiento</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.startButton,
                !activeVehicle && styles.startButtonDisabled
              ]}
              onPress={handleStartTracking}
              disabled={!activeVehicle}
            >
              <Text style={styles.startButtonText}>▶️ Iniciar Seguimiento</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ajustes */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/select-vehicle')}
          >
            <Text style={styles.actionIcon}>🏢</Text>
            <Text style={styles.actionTitle}>Garaje</Text>
            <Text style={styles.actionDescription}>
              Añade o cambia tu vehículo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/capture-settings')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionTitle}>Ajustes</Text>
            <Text style={styles.actionDescription}>
              Selecciona la forma de evaluar
            </Text>
          </TouchableOpacity>
        </View>


        {/* Información */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 ¿Cómo funciona?</Text>
          <Text style={styles.infoText}>
            1. Activa un vehículo si no lo está{'\n'}
            2. Inicia el seguimiento antes de conducir{'\n'}
            3. Tu ubicación se registra automáticamente{'\n'}
            4. Puedes capturar para posterior valoración{'\n'}
            5. Otros conductores pueden valorarte{'\n'}
            6. Detén el seguimiento al terminar tu viaje
          </Text>
        </View>

        {/* Advertencias */}
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            - Al activar el seguimiento:{'\n'}
            • El gps consume ~3-5% batería/hora{'\n'}
            • La app funciona en segundo plano{'\n'}
            • Los datos se envían de forma segura{'\n'}
            • Solo almacenamos ubicación actual.
          </Text>
        </View>
      </View>
      {/* Listener del botón flotante (invisible) */}
      <FloatingButtonListener />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  vehicleCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCardActive: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  vehiclePlate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
    textAlign: 'center',
  },
  vehiclePlateTracking: {
    color: '#34C759',
  },
  vehicleIdentifier: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: '500',
  },
  vehicleStatus: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  noVehicle: {
    fontSize: 20,
    color: '#999',
    marginBottom: 15,
    textAlign: 'center',
  },
  selectVehicleButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectVehicleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  trackingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingCardActive: {
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  trackingHeader: {
    marginBottom: 15,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  logoImage: {
    width: 280,
    height: 80,
    marginTop: 20,
    alignSelf: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 22,
  },
});
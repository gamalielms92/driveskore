// app/_layout.tsx
// ✅ VERSIÓN CORREGIDA: Permite acceso público en web
declare global {
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean | undefined;
}
// Suprimir warnings de deprecación de Firebase
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import Constants from 'expo-constants';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { supabase } from '../src/config/supabase';
import ABShutter3Service from '../src/services/ABShutter3Service';
import { Analytics } from '../src/services/Analytics';
import EventCaptureService from '../src/services/EventCaptureService';
import { checkForUpdates } from '../src/services/UpdateChecker';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initializeAuth();
  }, []);

  // 🆕 VERIFICAR ACTUALIZACIONES
  useEffect(() => {
    // Solo en Android (no web)
    if (Platform.OS === 'android' && isReady) {
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // ✅ MODIFICADO: Protección de rutas adaptada para web
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    // ✅ NUEVO: En web, permitir acceso a tabs sin autenticación
    if (Platform.OS === 'web') {
      // En web, solo redirigir si está autenticado y en login
      if (isAuthenticated && inAuthGroup) {
        router.replace('(tabs)');
      }
      // Si no está autenticado, permitir navegar libremente
      // La landing page manejará el estado de login internamente
      return;
    }

    // En móvil, mantener protección estricta
    if (!isAuthenticated && !inAuthGroup) {
      // Usuario no autenticado intentando acceder a ruta protegida
      router.replace('(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Usuario autenticado en pantalla de login
      router.replace('(tabs)');
    }
  }, [isAuthenticated, segments, isReady]);

  const initializeAuth = async () => {
    try {
      console.log('🚀 Inicializando app...');

      // 1. Verificar sesión persistente
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('🔐 Sesión persistente detectada');
        console.log('👤 Usuario:', session.user.email);
        
        // Inicializar Analytics solo si no es web
        if (Platform.OS !== 'web') {
          await Analytics.initialize();
          await Analytics.setUserId(session.user.id);

          // Establecer propiedades del dispositivo
          await Analytics.setUserProperties({
            device_model: Constants.deviceName || 'unknown',
            android_version: Platform.Version?.toString() || 'unknown',
            app_version: Constants.expoConfig?.version || '1.0.0',
          });
          console.log('📊 Analytics configurado');
        }

        // Inicializar EventCaptureService (solo móvil)
        if (Platform.OS !== 'web') {
          await EventCaptureService.initialize(session.user.id);
          console.log('✅ EventCaptureService inicializado al arranque');
          
          // Inicializar ABShutter3Service
          await ABShutter3Service.initialize(session.user.id);
          console.log('✅ ABShutter3Service inicializado');
        }
        
        setIsAuthenticated(true);
      } else {
        console.log('ℹ️ No hay sesión persistente');
        setIsAuthenticated(false);
      }
      
      // 2. Escuchar cambios de autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔐 Auth state cambió:', event);
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔐 Usuario inició sesión');
            console.log('👤 Usuario:', session.user.email);
            
            // Inicializar servicios solo en móvil
            if (Platform.OS !== 'web') {
              // Inicializar EventCaptureService
              await EventCaptureService.initialize(session.user.id);
              console.log('✅ EventCaptureService inicializado');
              
              // Inicializar ABShutter3Service
              await ABShutter3Service.initialize(session.user.id);
              console.log('✅ ABShutter3Service listo');
            }
            
            setIsAuthenticated(true);
          }
          
          if (event === 'SIGNED_OUT') {
            console.log('🚪 Usuario cerró sesión');
            
            // Limpiar servicios solo en móvil
            if (Platform.OS !== 'web') {
              // Limpiar EventCaptureService
              EventCaptureService.cleanup();
              console.log('🧹 EventCaptureService limpiado');
              
              // Limpiar ABShutter3Service
              ABShutter3Service.cleanup();
              console.log('🧹 ABShutter3Service limpiado');
            }
            
            setIsAuthenticated(false);
          }
          
          if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token renovado');
            // No necesitamos reinicializar, solo loguear
          }
        }
      );
      
      // Cleanup al desmontar
      return () => {
        console.log('🧹 Limpiando subscription de auth');
        subscription.unsubscribe();
      };
      
    } catch (error) {
      console.error('❌ Error inicializando auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsReady(true);
      console.log('✅ App lista');
    }
  };

  // Pantalla de carga mientras inicializa
  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#fff'
      }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Cargando...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="success" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
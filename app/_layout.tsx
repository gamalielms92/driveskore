// app/_layout.tsx
// EJEMPLO COMPLETO: Inicialización de EventCaptureService con sesión persistente

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../src/config/supabase';
import EventCaptureService from '../src/services/EventCaptureService';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initializeAuth();
  }, []);

  // Protección de rutas: redirigir según autenticación
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

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
        
        // CRÍTICO: Inicializar EventCaptureService
        await EventCaptureService.initialize(session.user.id);
        console.log('✅ EventCaptureService inicializado al arranque');
        
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
            
            // Inicializar EventCaptureService
            await EventCaptureService.initialize(session.user.id);
            console.log('✅ EventCaptureService inicializado');
            
            setIsAuthenticated(true);
          }
          
          if (event === 'SIGNED_OUT') {
            console.log('🚪 Usuario cerró sesión');
            
            // Limpiar EventCaptureService
            EventCaptureService.cleanup();
            console.log('🧹 EventCaptureService limpiado');
            
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
    </Stack>
  );
}
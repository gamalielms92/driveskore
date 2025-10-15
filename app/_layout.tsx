import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../src/config/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = (session: Session | null) => {
    const inAuth = segments[0] === '(tabs)';

    if (session && !inAuth) {
      // Usuario autenticado → ir a tabs
      router.replace('/(tabs)');
    } else if (!session && inAuth) {
      // Usuario no autenticado → ir a login
      router.replace('/');
    }
  };

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="rate" 
        options={{ 
          presentation: 'modal',
          title: 'Valorar Conductor',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff'
        }} 
      />
    </Stack>
  );
}
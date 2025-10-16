import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../src/config/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // No hay sesión y no está en auth -> redirigir a login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Hay sesión y está en auth -> redirigir a select-vehicle
      router.replace('/select-vehicle');
    }
  }, [session, segments, loading]);

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="select-vehicle" 
        options={{ 
          headerShown: true,
          title: 'Seleccionar Vehículo',
          headerBackVisible: false
        }} 
      />
      <Stack.Screen name="rate" options={{ headerShown: true, title: 'Evaluar Conductor' }} />
      <Stack.Screen name="conductor/[plate]" options={{ headerShown: true }} />
    </Stack>
  );
}
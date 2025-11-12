// app/(tabs)/_layout.tsx
// ✅ VERSIÓN FINAL: Oculta tabs en web si no está logueado

import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import { supabase } from '../../src/config/supabase';

export default function TabLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Por defecto true para móvil

  useEffect(() => {
    // Solo en web, verificar autenticación
    if (Platform.OS === 'web') {
      checkAuth();
      
      // Escuchar cambios de autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setIsLoggedIn(!!session?.user);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#007AFF',
        // ✅ CLAVE: Ocultar tab bar en web si no está logueado
        tabBarStyle: Platform.OS === 'web' && !isLoggedIn ? { display: 'none' } : undefined,
        // ✅ CLAVE: Ocultar header en web si no está logueado
        headerShown: Platform.OS === 'web' && !isLoggedIn ? false : true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
          headerTitle: 'DriveSkore',
        }}
      />

      {/* ✅ OCULTAR en web - Eventos pendientes (solo móvil) */}
      <Tabs.Screen
        name="pending"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⏳</Text>,
          headerTitle: '⏳ Eventos',
          href: Platform.OS === 'web' ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🔍</Text>,
          headerTitle: '🔍 Buscar y Ranking',
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
          headerTitle: '👤 Perfil',
        }}
      />

      {/* ✅ NUEVO - Mostrar Sorteo solo en WEB */}
      <Tabs.Screen
        name="raffle"
        options={{
          title: 'Sorteo',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🎁</Text>,
          headerTitle: '🎁 Sorteo',
          href: Platform.OS === 'web' ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="referrals"
        options={{
          title: 'Invitar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👥</Text>,
          headerTitle: '👥 Construyamos la comunidad',
        }}
      />

      <Tabs.Screen
        name="help"
        options={{
          title: 'Ayuda',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
          headerTitle: '💬 Ayuda y Feedback',
        }}
      />

      <Tabs.Screen
        name="benefits"
        options={{
          title: 'Ventajas',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🎁</Text>,
          headerTitle: '🎁 Ventajas',
        }}
      />

    </Tabs>
  );
}
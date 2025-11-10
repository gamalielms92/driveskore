// app/(tabs)/_layout.tsx
// ✅ VERSIÓN CORREGIDA: Navegación adaptada para web

import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
          headerTitle: '🚗 DriveSkore',
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
          headerTitle: '🎁 Sorteo del Piloto',
          href: Platform.OS === 'web' ? undefined : null,
        }}
      />

      {/* ✅ NUEVO - Mostrar Referidos solo en WEB */}
      <Tabs.Screen
        name="referrals"
        options={{
          title: 'Referidos',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👥</Text>,
          headerTitle: '👥 Invita Amigos',
          href: Platform.OS === 'web' ? undefined : null,
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

      {/* ✅ OCULTAR en web - Ajustes de captura (solo móvil) */}
      <Tabs.Screen
        name="capture-settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
          headerTitle: '⚙️ Ajustes',
          href: Platform.OS === 'web' ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="benefits"
        options={{
          title: 'Beneficios',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🎁</Text>,
          headerTitle: '🎁 Beneficios',
        }}
      />

      {/* ✅ Ocultar otras rutas que no son tabs principales */}
      <Tabs.Screen
        name="vehicles"
        options={{
          href: null, // No mostrar en tabs
        }}
      />

      <Tabs.Screen
        name="driver-profile"
        options={{
          href: null, // No mostrar en tabs
        }}
      />

    </Tabs>
  );
}
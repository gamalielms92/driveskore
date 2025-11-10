// app/(tabs)/_layout.tsx

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

      <Tabs.Screen
        name="pending"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⏳</Text>,
          headerTitle: '⏳ Eventos',
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

      <Tabs.Screen
        name="help"
        options={{
          title: 'Ayuda',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
          headerTitle: '💬 Ayuda y Feedback',
        }}
      />

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

    </Tabs>
  );
}
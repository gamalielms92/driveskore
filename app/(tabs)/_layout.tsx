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
          title: 'Pendientes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⏰</Text>,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🔍</Text>,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />

      <Tabs.Screen
        name="help"
        options={{
          title: 'Ayuda',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
          headerTitle: 'Ayuda y Feedback',
        }}
      />

      <Tabs.Screen
        name="capture-settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
          href: Platform.OS === 'web' ? null : undefined,
        }}
      />



    </Tabs>
  );
}
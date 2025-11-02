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
      
      {/* ✅ OCULTO EN WEB: Captura de eventos */}
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Evaluar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📷</Text>,
          href: Platform.OS === 'web' ? null : undefined,
        }}
      />

      {/* ✅ OCULTO EN WEB: Eventos pendientes (matching) */}
      <Tabs.Screen
        name="pending"
        options={{
          title: 'Pendientes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⏰</Text>,
          href: Platform.OS === 'web' ? null : undefined,
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
        name="capture-settings"
        options={{
          title: 'Captura',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
          href: Platform.OS === 'web' ? null : undefined,
        }}
      />

    </Tabs>
  );
}

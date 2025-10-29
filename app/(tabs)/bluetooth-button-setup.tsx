// app/(tabs)/bluetooth-button-setup.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BluetoothButtonService from '../../src/services/BluetoothButtonService';

interface BluetoothDevice {
  id: string;
  name: string;
  rssi?: number;
}

export default function BluetoothButtonSetup() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'No disponible en Web',
        'Esta función solo está disponible en la app móvil',
        [{ text: 'Volver', onPress: () => router.back() }]
      );
      return;
    }

    // Cargar estado inicial
    loadInitialState();
  }, []);

  const loadInitialState = () => {
    const connected = BluetoothButtonService.getConnectedDevices();
    setConnectedDevices(connected);
    setIsListening(BluetoothButtonService.isActive());
  };

  const handleScanDevices = async () => {
    setIsScanning(true);
    setDevices([]);

    try {
      const foundDevices = await BluetoothButtonService.scanForDevices();
      
      // Filtrar dispositivos con nombre (los botones BT suelen tener nombre)
      const namedDevices = foundDevices
        .filter(d => d.name && d.name.length > 0)
        .map(d => ({
          id: d.id,
          name: d.name || 'Desconocido',
          rssi: d.rssi,
        }));

      setDevices(namedDevices);

      if (namedDevices.length === 0) {
        Alert.alert(
          'No se encontraron dispositivos',
          'Asegúrate de que tu botón Bluetooth esté encendido y en modo emparejamiento'
        );
      }
    } catch (error) {
      console.error('Error escaneando:', error);
      Alert.alert('Error', 'No se pudieron escanear dispositivos Bluetooth');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectDevice = async (device: BluetoothDevice) => {
    try {
      const success = await BluetoothButtonService.connectToDevice(device.id);
      
      if (success) {
        Alert.alert(
          '✅ Conectado',
          `${device.name} conectado correctamente. Ahora activa la escucha para comenzar.`
        );
        loadInitialState();
      } else {
        Alert.alert('Error', 'No se pudo conectar al dispositivo');
      }
    } catch (error) {
      console.error('Error conectando:', error);
      Alert.alert('Error', 'No se pudo conectar al dispositivo');
    }
  };

  const handleToggleListening = () => {
    if (connectedDevices.length === 0) {
      Alert.alert(
        'Sin dispositivos',
        'Primero conecta un botón Bluetooth'
      );
      return;
    }

    if (isListening) {
      BluetoothButtonService.stopListening();
      setIsListening(false);
      Alert.alert('⏸️ Pausado', 'Ya no se capturarán eventos automáticamente');
    } else {
      BluetoothButtonService.startListening();
      setIsListening(true);
      Alert.alert(
        '▶️ Activado',
        'Ahora puedes capturar eventos con tu botón Bluetooth mientras conduces. La app puede estar en segundo plano.'
      );
    }
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => handleConnectDevice(item)}
    >
      <View style={styles.deviceInfo}>
        <Ionicons name="bluetooth" size={24} color="#2196F3" />
        <View style={styles.deviceText}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceId}>{item.id}</Text>
          {item.rssi && (
            <Text style={styles.deviceRssi}>Señal: {item.rssi} dBm</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </TouchableOpacity>
  );

  const renderConnectedDevice = (device: any, index: number) => (
    <View key={index} style={styles.connectedCard}>
      <Ionicons name="bluetooth" size={24} color="#4CAF50" />
      <View style={styles.deviceText}>
        <Text style={styles.deviceName}>{device.name}</Text>
        <Text style={styles.connectedLabel}>✅ Conectado</Text>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Botón Bluetooth</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Información */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#2196F3" />
        <Text style={styles.infoText}>
          Conecta un botón Bluetooth (mando de selfie, volante BT, etc.) para
          capturar eventos sin tocar el teléfono mientras conduces
        </Text>
      </View>

      {/* Dispositivos Conectados */}
      {connectedDevices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispositivos Conectados</Text>
          {connectedDevices.map(renderConnectedDevice)}
        </View>
      )}

      {/* Toggle de Escucha */}
      {connectedDevices.length > 0 && (
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>
                {isListening ? '▶️ Escucha Activa' : '⏸️ Escucha Pausada'}
              </Text>
              <Text style={styles.toggleSubtitle}>
                {isListening
                  ? 'Capturando eventos con botón BT'
                  : 'No se capturarán eventos automáticamente'}
              </Text>
            </View>
            <Switch
              value={isListening}
              onValueChange={handleToggleListening}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={isListening ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      )}

      {/* Buscar Dispositivos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buscar Dispositivos</Text>
        
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={handleScanDevices}
          disabled={isScanning}
        >
          {isScanning ? (
            <>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.scanButtonText}>Escaneando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.scanButtonText}>Escanear Dispositivos BT</Text>
            </>
          )}
        </TouchableOpacity>

        {devices.length > 0 && (
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={(item) => item.id}
            style={styles.deviceList}
          />
        )}

        {!isScanning && devices.length === 0 && (
          <Text style={styles.emptyText}>
            Pulsa "Escanear" para buscar dispositivos Bluetooth cercanos
          </Text>
        )}
      </View>

      {/* Instrucciones */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>📖 Instrucciones:</Text>
        <Text style={styles.instructionItem}>
          1. Enciende tu botón Bluetooth y ponlo en modo emparejamiento
        </Text>
        <Text style={styles.instructionItem}>
          2. Pulsa "Escanear Dispositivos BT"
        </Text>
        <Text style={styles.instructionItem}>
          3. Selecciona tu dispositivo de la lista
        </Text>
        <Text style={styles.instructionItem}>
          4. Activa la "Escucha Activa"
        </Text>
        <Text style={styles.instructionItem}>
          5. ¡Listo! Ahora puedes capturar eventos con el botón
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  connectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 8,
  },
  connectedLabel: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceList: {
    marginTop: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceText: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceRssi: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
    fontSize: 14,
  },
  instructionsBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 13,
    color: '#E65100',
    marginBottom: 8,
    lineHeight: 18,
  },
});

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DriverMatchingService from '../../src/services/DriverMatchingService';
import EventCaptureService from '../../src/services/EventCaptureService';
import type { CapturedEvent } from '../../src/types/events';

export default function PendingScreen() {
  const router = useRouter();
  const [pendingEvents, setPendingEvents] = useState<CapturedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar eventos al montar el componente
  useEffect(() => {
    loadPendingEvents();
  }, []);

  // NUEVO: Recargar cada vez que la tab gana foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Tab Pendientes enfocada - Recargando eventos...');
      loadPendingEvents();
    }, [])
  );

  const loadPendingEvents = async () => {
    try {
      setLoading(true);
      const events = await EventCaptureService.getPendingEvents();
      // Ordenar por más recientes primero
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPendingEvents(events);
    } catch (error) {
      console.log('Error cargando eventos pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los eventos pendientes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingEvents();
    setRefreshing(false);
  };

  const handleReviewEvent = async (event: CapturedEvent) => {
    try {
      Alert.alert(
        '🔍 Buscando Candidatos',
        'Analizando conductores cercanos en ese momento...',
        [{ text: 'OK' }]
      );

      // Ejecutar algoritmo de matching - pasando el evento completo
      const candidates = await DriverMatchingService.findCandidates(event);

      if (candidates.length === 0) {
        Alert.alert(
          'Sin Resultados',
          'No se encontraron conductores activos cerca en ese momento.\n\n¿Deseas evaluar manualmente?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Evaluar Manual',
              onPress: () => {
                // Eliminar evento de pendientes
                EventCaptureService.removeEvent(event.id);
                
                // Ir a rate con los datos del evento
                router.push({
                  pathname: '/rate',
                  params: {
                    plate: event.plate || '',
                    photoUri: event.photo_uri || '',
                    eventId: event.id,
                    fromPending: 'true',
                  },
                });
              },
            },
          ]
        );
        return;
      }

      // Mostrar candidatos al usuario (próxima pantalla)
      router.push({
        pathname: '/matching-results',
        params: {
          eventId: event.id,
          candidates: JSON.stringify(candidates),
        },
      });
    } catch (error) {
      console.log('Error buscando candidatos:', error);
      Alert.alert('Error', 'No se pudo ejecutar el matching. Intenta de nuevo.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      'Eliminar Evento',
      '¿Estás seguro de que deseas eliminar este evento pendiente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await EventCaptureService.removeEvent(eventId);
            await loadPendingEvents();
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceEmoji = (deviceType: string) => {
    switch (deviceType) {
      case 'bicycle':
        return '🚴';
      case 'car':
        return '🚗';
      case 'motorcycle':
        return '🏍️';
      case 'pedestrian':
        return '🚶';
      default:
        return '📍';
    }
  };

  const renderEventCard = ({ item }: { item: CapturedEvent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.emoji}>{getDeviceEmoji(item.context.device_type)}</Text>
          <View>
            <Text style={styles.cardTitleText}>
              Evento capturado
            </Text>
            <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteEvent(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardInfo}>
        {/* NUEVO: Mostrar matrícula si existe */}
        {item.plate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🚗 Matrícula:</Text>
            <Text style={[styles.infoValue, styles.plateHighlight]}>
              {item.plate}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍 Ubicación:</Text>
          <Text style={styles.infoValue}>
            {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
          </Text>
        </View>

        {item.location.speed !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🚀 Velocidad:</Text>
            <Text style={styles.infoValue}>
              {(item.location.speed * 3.6).toFixed(1)} km/h
            </Text>
          </View>
        )}

        {item.motion.heading !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🧭 Dirección:</Text>
            <Text style={styles.infoValue}>{item.motion.heading}°</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🌙 Condición:</Text>
          <Text style={styles.infoValue}>
            {item.context.light_condition === 'day'
              ? '☀️ Día'
              : item.context.light_condition === 'night'
              ? '🌙 Noche'
              : '🌆 Atardecer'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.reviewButton}
        onPress={() => handleReviewEvent(item)}
      >
        <Text style={styles.reviewButtonText}>🔍 Buscar Conductor</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando eventos...</Text>
      </View>
    );
  }

  if (pendingEvents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No hay eventos pendientes</Text>
        <Text style={styles.emptyMessage}>
          Los eventos que captures aparecerán aquí para que puedas revisarlos más tarde
        </Text>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={() => router.push('/(tabs)/capture')}
        >
          <Text style={styles.captureButtonText}>📸 Capturar Evento</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Eventos Pendientes</Text>
        <Text style={styles.headerSubtitle}>
          {pendingEvents.length} evento{pendingEvents.length !== 1 ? 's' : ''} por revisar
        </Text>
      </View>

      <FlatList
        data={pendingEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#f44336',
  },
  cardInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  plateHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 2,
  },
  reviewButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
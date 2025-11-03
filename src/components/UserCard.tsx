// src/components/UserCard.tsx

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Vehicle } from '../types/vehicle';

/**
 * Componente para mostrar información de usuario centrada en la PERSONA
 * En lugar de mostrar solo matrícula, muestra:
 * - Foto de perfil
 * - Nombre completo
 * - Rating
 * - Vehículos como información secundaria
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface UserCardProps {
  // Datos del usuario
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  
  // Datos de valoración
  rating: number;
  numRatings: number;
  
  // Vehículos (opcional)
  vehicles?: Vehicle[];
  
  // Opciones de visualización
  size?: 'small' | 'medium' | 'large';
  showVehicles?: boolean;
  showBadges?: boolean;
  
  // Estilos personalizados
  containerStyle?: object;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function UserCard({
  userId,
  fullName,
  avatarUrl,
  rating,
  numRatings,
  vehicles = [],
  size = 'medium',
  showVehicles = true,
  showBadges = true,
  containerStyle
}: UserCardProps) {
  
  // Determinar tamaño de avatar
  const avatarSize = size === 'small' ? 50 : size === 'medium' ? 70 : 100;
  
  // Determinar color de rating
  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return '#34C759';
    if (rating >= 3.5) return '#4CAF50';
    if (rating >= 3.0) return '#FFC107';
    if (rating >= 2.0) return '#FF9500';
    return '#FF3B30';
  };
  
  // Renderizar estrellas
  const renderStars = (score: number) => {
    const fullStars = Math.floor(score);
    const halfStar = score % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      '⭐'.repeat(fullStars) +
      (halfStar ? '✨' : '') +
      '☆'.repeat(emptyStars)
    );
  };
  
  // Obtener vehículo activo
  const activeVehicle = vehicles.find(v => v.online);
  
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Avatar y nombre */}
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { width: avatarSize, height: avatarSize }]}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize }]}>
              <Text style={[styles.avatarPlaceholderText, { fontSize: avatarSize / 2 }]}>
                {fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.fullName, size === 'small' && styles.fullNameSmall]}>
            {fullName}
          </Text>
          
          {/* Rating */}
          <View style={styles.ratingRow}>
            <Text style={[styles.ratingValue, { color: getRatingColor(rating) }]}>
              ⭐ {rating.toFixed(1)}
            </Text>
            <Text style={styles.ratingCount}>
              ({numRatings} {numRatings === 1 ? 'valoración' : 'valoraciones'})
            </Text>
          </View>
          
          {size !== 'small' && (
            <Text style={styles.stars}>{renderStars(rating)}</Text>
          )}
        </View>
      </View>
      
      {/* Vehículos */}
      {showVehicles && vehicles.length > 0 && (
        <View style={styles.vehiclesSection}>
          <Text style={styles.vehiclesSectionTitle}>
            🚗 {vehicles.length === 1 ? 'Vehículo' : 'Vehículos'}:
          </Text>
          
          {size === 'small' ? (
            // Modo compacto: solo el activo o el primero
            <View style={styles.vehicleBadge}>
              <Text style={styles.vehicleBadgeText}>
                {activeVehicle?.plate || vehicles[0].plate || vehicles[0].serial_number}
              </Text>
            </View>
          ) : (
            // Modo normal: lista de vehículos
            <View style={styles.vehiclesList}>
              {vehicles.slice(0, 3).map((vehicle, index) => (
                <View
                  key={vehicle.id}
                  style={[
                    styles.vehicleItem,
                    vehicle.online && styles.vehicleItemActive
                  ]}
                >
                  <Text style={styles.vehicleIcon}>
                    {vehicle.vehicle_type === 'car' ? '🚗' : 
                     vehicle.vehicle_type === 'bike' ? '🚲' : '🛴'}
                  </Text>
                  
                  <View style={styles.vehicleDetails}>
                    <Text style={styles.vehicleText}>
                      {vehicle.brand} {vehicle.model}
                    </Text>
                    <Text style={styles.vehiclePlate}>
                      {vehicle.plate || vehicle.serial_number}
                    </Text>
                  </View>
                  
                  {vehicle.online && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Activo</Text>
                    </View>
                  )}
                </View>
              ))}
              
              {vehicles.length > 3 && (
                <Text style={styles.moreVehicles}>
                  +{vehicles.length - 3} más
                </Text>
              )}
            </View>
          )}
        </View>
      )}
      
      {/* Badges de verificación */}
      {showBadges && (
        <View style={styles.badgesSection}>
          {numRatings >= 10 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Perfil Verificado</Text>
            </View>
          )}
          {rating >= 4.5 && (
            <View style={[styles.badge, styles.badgeGold]}>
              <Text style={styles.badgeTextGold}>⭐ Conductor Ejemplar</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    borderRadius: 999,
  },
  avatarPlaceholder: {
    borderRadius: 999,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  fullName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  fullNameSmall: {
    fontSize: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  ratingCount: {
    fontSize: 13,
    color: '#666',
  },
  stars: {
    fontSize: 14,
  },
  vehiclesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  vehiclesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  vehicleBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  vehicleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1565C0',
  },
  vehiclesList: {
    gap: 8,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 10,
  },
  vehicleItemActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  vehicleIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 12,
    color: '#666',
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  moreVehicles: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  badgesSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565C0',
  },
  badgeGold: {
    backgroundColor: '#FFF3E0',
  },
  badgeTextGold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
});

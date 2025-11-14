// src/utils/vehicleHelpers.ts

import type { Vehicle } from '../types/vehicle';

/**
 * Determina si una matrícula es virtual (generada automáticamente para bicis/patinetes)
 */
export const isVirtualPlate = (plate: string | null): boolean => {
  if (!plate) return false;
  return plate.startsWith('BIKE') || plate.startsWith('SCOO');
};

/**
 * Obtiene el nombre para mostrar de un vehículo
 * Oculta las matrículas virtuales y muestra información relevante
 */
export const getVehicleDisplayName = (vehicle: Vehicle): string => {
  // Si es una matrícula virtual, no mostrarla
  if (vehicle.plate && isVirtualPlate(vehicle.plate)) {
    if (vehicle.nickname) return vehicle.nickname;
    return vehicle.vehicle_type === 'bike' ? 'Bicicleta' : 'Patinete';
  }
  
  // Para vehículos normales con matrícula real
  if (vehicle.plate) return vehicle.plate;
  
  // Si no tiene matrícula (no debería pasar, pero por si acaso)
  return vehicle.nickname || 'Vehículo';
};

/**
 * Obtiene el identificador completo del vehículo para mostrar con más detalle
 */
export const getVehicleFullIdentifier = (vehicle: Vehicle): string => {
  // Si tiene nickname, siempre mostrarlo primero
  if (vehicle.nickname) {
    // Si además tiene matrícula real (no virtual), mostrar ambos
    if (vehicle.plate && !isVirtualPlate(vehicle.plate)) {
      return `${vehicle.nickname} (${vehicle.plate})`;
    }
    return vehicle.nickname;
  }
  
  // Si no tiene nickname, usar la lógica normal
  return getVehicleDisplayName(vehicle);
};

/**
 * Obtiene el icono del vehículo
 */
export const getVehicleIcon = (vehicleType: string): string => {
  switch (vehicleType) {
    case 'car': return '🚗';
    case 'motorcycle': return '🏍️';
    case 'bike': return '🚲';
    case 'scooter': return '🛴';
    default: return '🚗';
  }
};

/**
 * Obtiene descripción completa del vehículo (marca y modelo)
 */
export const getVehicleDescription = (vehicle: Vehicle): string => {
  const parts = [];
  
  if (vehicle.brand) parts.push(vehicle.brand);
  if (vehicle.model) parts.push(vehicle.model);
  if (vehicle.year) parts.push(`(${vehicle.year})`);
  
  if (parts.length > 0) {
    return parts.join(' ');
  }
  
  // Si no hay marca/modelo, mostrar el tipo de vehículo
  switch (vehicle.vehicle_type) {
    case 'bike': return 'Bicicleta';
    case 'scooter': return 'Patinete';
    case 'motorcycle': return 'Motocicleta';
    default: return 'Vehículo';
  }
};
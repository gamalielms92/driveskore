// src/types/vehicle.ts

/**
 * Tipos para el sistema de vehículos
 */

export type VehicleType = 'car' | 'bike' | 'scooter';

export interface Vehicle {
  id: string;
  user_id: string;
  plate: string | null; // Opcional para bicis/patinetes
  nickname: string | null;
  online: boolean;
  
  // NUEVOS CAMPOS
  vehicle_photo_url: string; // OBLIGATORIO
  brand: string; // OBLIGATORIO (Seat, Trek, Xiaomi, etc.)
  model: string; // OBLIGATORIO (Ibiza, FX 3, M365, etc.)
  year: number; // OBLIGATORIO (1900-presente)
  color: string; // OBLIGATORIO (Rojo, Negro, etc.)
  vehicle_type: VehicleType; // OBLIGATORIO
  serial_number: string | null; // Para bicis/patinetes
  is_primary: boolean; // Vehículo principal
  
  created_at: string;
  updated_at?: string;
}

export interface VehicleFormData {
  vehicle_photo_url: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: VehicleType;
  plate?: string;
  serial_number?: string;
  nickname?: string;
  is_primary?: boolean;
}

export interface VehicleValidationResult {
  isValid: boolean;
  errors: string[];
}

// Colores predefinidos para selector
export const VEHICLE_COLORS = [
  'Blanco',
  'Negro',
  'Gris',
  'Plata',
  'Rojo',
  'Azul',
  'Verde',
  'Amarillo',
  'Naranja',
  'Marrón',
  'Beige',
  'Morado',
  'Rosa',
  'Otro'
] as const;

// Marcas comunes por tipo
export const VEHICLE_BRANDS = {
  car: [
    'Seat', 'Volkswagen', 'Ford', 'Renault', 'Peugeot', 'Citroën',
    'Opel', 'BMW', 'Mercedes-Benz', 'Audi', 'Toyota', 'Honda',
    'Nissan', 'Mazda', 'Hyundai', 'Kia', 'Fiat', 'Otro'
  ],
  bike: [
    'Trek', 'Giant', 'Specialized', 'Cannondale', 'Scott', 'Orbea',
    'BH', 'Merida', 'Decathlon', 'Monty', 'Otro'
  ],
  scooter: [
    'Xiaomi', 'Cecotec', 'Ninebot', 'Razor', 'E-Twow', 'Smartgyro',
    'Otro'
  ]
} as const;

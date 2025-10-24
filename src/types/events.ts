// src/types/events.ts

/**
 * Tipos compartidos para el sistema de captura de eventos y matching
 */

export interface CapturedEvent {
  id: string;
  evaluator_user_id: string;
  timestamp: string;
  location: LocationData;
  nearby_bluetooth: BluetoothDevice[];
  motion: MotionData;
  context: EventContext;
  status: EventStatus;
  plate?: string; // NUEVO: Matrícula capturada
  photo_uri?: string; // NUEVO: URI de la foto
  candidates?: DriverCandidate[];
  confirmed_driver?: ConfirmedDriver;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface BluetoothDevice {
  mac_address_hash: string;
  rssi: number;
  distance_estimate?: number;
  name?: string;
}

export interface MotionData {
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  velocity_estimated: number;
  heading: number;
}

export interface EventContext {
  device_type: 'bicycle' | 'car' | 'motorcycle' | 'pedestrian';
  weather_condition?: string;
  light_condition: 'day' | 'night' | 'dusk';
}

export type EventStatus = 'pending' | 'matched' | 'confirmed' | 'discarded';

export interface DriverCandidate {
  user_id: string;
  plate: string;
  match_score: number;
  match_factors: MatchFactors;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  confidence?: 'high' | 'medium' | 'low';
  explanation?: string;
  verification_level?: 'automatic' | 'partial' | 'manual';
  verification_badge?: string;
  verification_text?: string;
}

export interface MatchFactors {
  gps_proximity: number;
  bluetooth_detected: boolean;
  direction_match: number;
  speed_match: number;
  temporal_proximity: number;
}

export interface ConfirmedDriver {
  user_id: string;
  plate: string;
  confidence: number;
}

export interface ActiveDriver {
  user_id: string;
  plate: string;
  location: {
    latitude: number;
    longitude: number;
    captured_at: string;  // Renombrado de timestamp
  };
  motion: {
    speed: number;
    heading: number;
  };
  bluetooth_mac_hash: string;
}
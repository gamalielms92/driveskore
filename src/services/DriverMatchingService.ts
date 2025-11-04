// src/services/DriverMatchingService.ts

import { supabase } from '../config/supabase';
import type {
  ActiveDriver,
  CapturedEvent,
  DriverCandidate
} from '../types/events';

/**
 * Servicio de matching multifactorial para identificar conductores
 * 
 * ALGORITMO:
 * 1. Buscar usuarios activos en radio GPS (20-100m)
 * 2. Calcular score de proximidad GPS (0-40 puntos)
 * 3. Detectar match de Bluetooth (0-30 puntos)
 * 4. Comparar dirección de movimiento (0-20 puntos)
 * 5. Comparar velocidad (0-10 puntos)
 * 
 * SCORE TOTAL: 0-100 puntos
 * - >80: Alta confianza
 * - 60-80: Confianza media
 * - 40-60: Confianza baja
 * - <40: No match
 */
class DriverMatchingService {
  // Configuración del algoritmo
  private readonly MAX_SEARCH_RADIUS = 100; // metros
  private readonly MIN_SEARCH_RADIUS = 20; // metros
  private readonly TIME_WINDOW = 30; // segundos

  // Pesos del scoring
  private readonly WEIGHTS = {
    GPS_PROXIMITY: 40,
    BLUETOOTH_MATCH: 30,
    DIRECTION_MATCH: 20,
    SPEED_MATCH: 10,
  };

// FIX PARA: src/services/DriverMatchingService.ts
// Reemplaza el método findCandidates completo con esta versión

/**
 * Encuentra candidatos potenciales para un evento capturado
 */
async findCandidates(event: CapturedEvent): Promise<DriverCandidate[]> {
  console.log('🔍 Buscando candidatos para evento:', event.id);

  try {
    // 1. Obtener conductores activos en la zona
    const activeDrivers = await this.getActiveDriversInArea(
      event.location.latitude,
      event.location.longitude,
      this.MAX_SEARCH_RADIUS,
      event.timestamp
    );

    console.log(`📊 Encontrados ${activeDrivers.length} conductores activos en área`);

    if (activeDrivers.length === 0) {
      return [];
    }

    // 2. Calcular score para cada conductor
    const candidates: DriverCandidate[] = activeDrivers.map((driver) =>
      this.calculateMatchScore(event, driver)
    );

    // 3. ✅ DEDUPLICAR por user_id (mantener solo el mejor match de cada usuario)
    const uniqueCandidates = new Map<string, DriverCandidate>();
    candidates.forEach(candidate => {
      const existing = uniqueCandidates.get(candidate.user_id);
      // Si no existe o el nuevo tiene mejor score, reemplazar
      if (!existing || candidate.match_score > existing.match_score) {
        uniqueCandidates.set(candidate.user_id, candidate);
      }
    });

    const deduplicatedCandidates = Array.from(uniqueCandidates.values());
    console.log(`🔄 Deduplicados: ${candidates.length} → ${deduplicatedCandidates.length} candidatos únicos`);

    // 4. Ordenar por score descendente
    deduplicatedCandidates.sort((a, b) => b.match_score - a.match_score);

    // 5. Filtrar candidatos con score mínimo
    const viableCandidates = deduplicatedCandidates.filter((c) => c.match_score >= 40);

    // 6. Añadir metadatos útiles
    viableCandidates.forEach((candidate) => {
      candidate.confidence = this.getConfidenceLevel(candidate.match_score);
      candidate.explanation = this.generateMatchExplanation(candidate);
    });

    console.log(`✅ ${viableCandidates.length} candidatos viables encontrados`);

    return viableCandidates;
  } catch (error) {
    console.error('❌ Error buscando candidatos:', error);
    throw error;
  }
}

  /**
   * Obtiene conductores activos en un área geográfica
   */
  private async getActiveDriversInArea(
    latitude: number,
    longitude: number,
    radius: number,
    timestamp: string
  ): Promise<ActiveDriver[]> {
    // Calcular ventana de tiempo
    const eventTime = new Date(timestamp);
    const timeWindowStart = new Date(eventTime.getTime() - this.TIME_WINDOW * 1000);
    const timeWindowEnd = new Date(eventTime.getTime() + this.TIME_WINDOW * 1000);

    // Query a Supabase usando PostGIS para búsqueda geoespacial
    const { data, error } = await supabase.rpc('get_active_drivers_in_area', {
      center_lat: latitude,
      center_lon: longitude,
      radius_meters: radius,
      time_start: timeWindowStart.toISOString(),
      time_end: timeWindowEnd.toISOString(),
    });

    if (error) {
      console.error('Error obteniendo conductores activos:', error);
      return [];
    }

    // Mapear resultado a interfaz ActiveDriver
    return (data || []).map((row: any) => ({
      user_id: row.user_id,
      plate: row.plate,
      location: {
        latitude: row.location_lat,
        longitude: row.location_lon,
        captured_at: row.location_captured_at,  // Renombrado
      },
      motion: {
        speed: row.motion_speed,
        heading: row.motion_heading,
      },
      bluetooth_mac_hash: row.bluetooth_mac_hash,
    }));
  }

  /**
   * Calcula el score de matching entre un evento y un conductor
   */
  private calculateMatchScore(event: CapturedEvent, driver: ActiveDriver): DriverCandidate {
    let totalScore = 0;
    const factors = {
      gps_proximity: 0,
      bluetooth_detected: false,
      direction_match: 0,
      speed_match: 0,
      temporal_proximity: 0,
    };

    // FACTOR 1: Proximidad GPS (0-40 puntos)
    const distance = this.calculateDistance(
      event.location.latitude,
      event.location.longitude,
      driver.location.latitude,
      driver.location.longitude
    );

    if (distance <= this.MAX_SEARCH_RADIUS) {
      // Scoring inverso: más cerca = más puntos
      const proximityScore = Math.max(
        0,
        this.WEIGHTS.GPS_PROXIMITY * (1 - distance / this.MAX_SEARCH_RADIUS)
      );
      factors.gps_proximity = Math.round(proximityScore * 10) / 10;
      totalScore += factors.gps_proximity;
    }

    // FACTOR 2: Detección Bluetooth (0-30 puntos)
    const bluetoothMatch = event.nearby_bluetooth.some(
      (bt) => bt.mac_address_hash === driver.bluetooth_mac_hash
    );

    if (bluetoothMatch) {
      factors.bluetooth_detected = true;
      totalScore += this.WEIGHTS.BLUETOOTH_MATCH;
    }

    // FACTOR 3: Coincidencia de dirección (0-20 puntos)
    const headingDiff = this.calculateHeadingDifference(
      event.motion.heading,
      driver.motion.heading
    );

    // Mismo sentido si diferencia < 45 grados
    if (headingDiff < 45) {
      const directionScore = this.WEIGHTS.DIRECTION_MATCH * (1 - headingDiff / 180);
      factors.direction_match = Math.round(directionScore * 10) / 10;
      totalScore += factors.direction_match;
    }

    // FACTOR 4: Coincidencia de velocidad (0-10 puntos)
    const speedDiff = Math.abs(event.motion.velocity_estimated - driver.motion.speed);

    // Velocidades similares (diferencia < 20 km/h)
    if (speedDiff < 20) {
      const speedScore = this.WEIGHTS.SPEED_MATCH * (1 - speedDiff / 50);
      factors.speed_match = Math.round(speedScore * 10) / 10;
      totalScore += factors.speed_match;
    }

    // FACTOR 5: Proximidad temporal (usado para desempate)
    const timeDiff = Math.abs(
      new Date(event.timestamp).getTime() - new Date(driver.location.captured_at).getTime()
    );
    factors.temporal_proximity = Math.max(0, 100 - (timeDiff / 1000) * 3); // Penalizar por segundo

    return {
      user_id: driver.user_id,
      plate: driver.plate,
      match_score: Math.round(totalScore * 10) / 10,
      match_factors: factors,
      location: {
        latitude: driver.location.latitude,
        longitude: driver.location.longitude,
      },
      timestamp: driver.location.captured_at,  // Renombrado
    };
  }

  /**
   * Calcula distancia entre dos puntos GPS (fórmula de Haversine)
   * Retorna distancia en metros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }

  /**
   * Calcula la diferencia angular entre dos headings (0-360°)
   * Retorna el ángulo más pequeño (0-180°)
   */
  private calculateHeadingDifference(heading1: number, heading2: number): number {
    let diff = Math.abs(heading1 - heading2);
    if (diff > 180) {
      diff = 360 - diff;
    }
    return diff;
  }

  /**
   * Mejora el algoritmo con machine learning (futuro)
   * Aprende de las confirmaciones del usuario para ajustar pesos
   */
  async learnFromConfirmation(
    event: CapturedEvent,
    confirmedDriver: DriverCandidate,
    wasCorrect: boolean
  ) {
    // TODO: Implementar ML para ajustar pesos dinámicamente
    // Por ahora, solo registrar para análisis posterior

    await supabase.from('matching_feedback').insert({
      event_id: event.id,
      confirmed_driver_id: confirmedDriver.user_id,
      match_score: confirmedDriver.match_score,
      was_correct: wasCorrect,
      factors: confirmedDriver.match_factors,
      created_at: new Date().toISOString(),
    });

    console.log('📚 Feedback de matching registrado para ML futuro');
  }

  /**
   * Genera explicación legible del match para el usuario
   */
  generateMatchExplanation(candidate: DriverCandidate): string {
    const parts: string[] = [];

    if (candidate.match_factors.gps_proximity > 0) {
      parts.push(`📍 Estaba cerca (${candidate.match_factors.gps_proximity.toFixed(0)} pts)`);
    }

    if (candidate.match_factors.bluetooth_detected) {
      parts.push(`📡 Dispositivo detectado (30 pts)`);
    }

    if (candidate.match_factors.direction_match > 0) {
      parts.push(`🧭 Misma dirección (${candidate.match_factors.direction_match.toFixed(0)} pts)`);
    }

    if (candidate.match_factors.speed_match > 0) {
      parts.push(`⚡ Velocidad similar (${candidate.match_factors.speed_match.toFixed(0)} pts)`);
    }

    return parts.join(' • ');
  }

  /**
   * Clasifica la confianza del match
   */
  getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }
}

export default new DriverMatchingService();

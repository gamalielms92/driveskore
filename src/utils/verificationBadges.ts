// src/utils/verificationBadges.ts

export interface VerificationBadge {
  level: 'automatic' | 'partial' | 'manual';
  badge: string;
  text: string;
  description: string;
}

/**
 * Calcula el badge de verificación según el score del matching
 */
export function getVerificationBadge(score: number): VerificationBadge {
  if (score >= 80) {
    return {
      level: 'automatic',
      badge: '🥇',
      text: 'Verificado Automáticamente',
      description: 'Alta confianza - Matching automático con múltiples factores'
    };
  } else if (score >= 50) {
    return {
      level: 'partial',
      badge: '🥈',
      text: 'Verificación Parcial',
      description: 'Confianza media - Algunos factores coinciden'
    };
  } else {
    return {
      level: 'manual',
      badge: '🥉',
      text: 'Introducción Manual',
      description: 'Sin verificación automática - Matrícula introducida manualmente'
    };
  }
}

/**
 * Badge para cuando NO hay matching automático
 */
export function getManualVerificationBadge(): VerificationBadge {
  return {
    level: 'manual',
    badge: '✍️',
    text: 'Introducción Manual',
    description: 'No se encontró matching automático - Conductor sin app instalada'
  };
}

/**
 * Color del badge según nivel
 */
export function getBadgeColor(level: 'automatic' | 'partial' | 'manual'): string {
  switch (level) {
    case 'automatic':
      return '#FFD700'; // Dorado
    case 'partial':
      return '#C0C0C0'; // Plateado
    case 'manual':
      return '#CD7F32'; // Bronce
  }
}

/**
 * Porcentaje de confianza según score
 */
export function getConfidencePercentage(score: number): number {
  return Math.min(100, Math.max(0, score));
}

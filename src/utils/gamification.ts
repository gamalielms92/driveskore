// src/utils/gamification.ts

/**
 * Validador y gamificación de conducción
 */

// ==================== INTERFACES ====================

export interface DrivingAttribute {
  id: string;
  icon: string;
  label: string;
  positive: string;
  negative: string;
}

export interface AttributeStat extends DrivingAttribute {
  votes: number;
  percentage: number;
}

export interface AttributeStats {
  [key: string]: AttributeStat;
}

export interface DriverRank {
  name: string;
  icon: string;
  color: string;
  minScore: number;
  maxScore: number;
  description: string;
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  condition: (profile: any) => boolean;
}

export interface Profile {
  plate: string;
  total_score: number;
  num_ratings: number;
  positive_attributes?: { [key: string]: number };
  total_votes?: number;
}

// ==================== CONSTANTES ====================

/**
 * Atributos de conducción evaluables
 */
export const DRIVING_ATTRIBUTES: DrivingAttribute[] = [
  {
    id: 'respects_lights',
    icon: '🚦',
    label: 'Respeta semáforos',
    positive: 'Respeta semáforos',
    negative: 'Se salta semáforos',
  },
  {
    id: 'keeps_distance',
    icon: '🚗',
    label: 'Distancia de seguridad',
    positive: 'Mantiene distancia',
    negative: 'Va muy pegado',
  },
  {
    id: 'uses_signals',
    icon: '🔄',
    label: 'Usa intermitentes',
    positive: 'Usa intermitentes',
    negative: 'No señaliza',
  },
  {
    id: 'yields_right',
    icon: '🤝',
    label: 'Cede el paso',
    positive: 'Cede el paso',
    negative: 'No cede el paso',
  },
  {
    id: 'appropriate_speed',
    icon: '⚡',
    label: 'Velocidad adecuada',
    positive: 'Velocidad adecuada',
    negative: 'Conduce temerario',
  },
  {
    id: 'parks_well',
    icon: '🅿️',
    label: 'Estaciona correctamente',
    positive: 'Estaciona bien',
    negative: 'Estaciona mal',
  },
];

/**
 * Rangos de conductor según puntuación
 */
export const DRIVER_RANKS: DriverRank[] = [
  {
    name: 'Conductor Peligroso',
    icon: '🚫',
    color: '#FF3B30',
    minScore: 0,
    maxScore: 1.9,
    description: 'Evitar compartir vía con este conductor',
  },
  {
    name: 'Conductor Novato',
    icon: '🔰',
    color: '#FF9500',
    minScore: 2.0,
    maxScore: 2.9,
    description: 'Necesita mejorar sus hábitos de conducción',
  },
  {
    name: 'Conductor Promedio',
    icon: '🚗',
    color: '#FFC107',
    minScore: 3.0,
    maxScore: 3.4,
    description: 'Conductor estándar con margen de mejora',
  },
  {
    name: 'Buen Conductor',
    icon: '👍',
    color: '#4CAF50',
    minScore: 3.5,
    maxScore: 4.4,
    description: 'Conductor responsable y seguro',
  },
  {
    name: 'Conductor Ejemplar',
    icon: '⭐',
    color: '#34C759',
    minScore: 4.5,
    maxScore: 4.7,
    description: 'Modelo de conducción responsable',
  },
  {
    name: 'Conductor Elite',
    icon: '🏆',
    color: '#FFD700',
    minScore: 4.8,
    maxScore: 5.0,
    description: 'Excelencia absoluta en conducción',
  },
];

/**
 * Insignias por logros
 */
export const BADGES: Badge[] = [
  {
    id: 'first_rating',
    icon: '🎯',
    name: 'Primera Evaluación',
    description: 'Recibió su primera valoración',
    condition: (profile: Profile) => profile.num_ratings >= 1,
  },
  {
    id: 'popular',
    icon: '🌟',
    name: 'Conductor Popular',
    description: 'Más de 10 valoraciones',
    condition: (profile: Profile) => profile.num_ratings >= 10,
  },
  {
    id: 'trusted',
    icon: '✅',
    name: 'Conductor Confiable',
    description: 'Más de 50 valoraciones',
    condition: (profile: Profile) => profile.num_ratings >= 50,
  },
  {
    id: 'excellent',
    icon: '💎',
    name: 'Conductor Excepcional',
    description: 'Promedio superior a 4.5 con +20 valoraciones',
    condition: (profile: Profile) => {
      const avg = profile.num_ratings > 0 ? profile.total_score / profile.num_ratings : 0;
      return avg >= 4.5 && profile.num_ratings >= 20;
    },
  },
  {
    id: 'perfect',
    icon: '👑',
    name: 'Perfección Absoluta',
    description: 'Puntuación perfecta 5.0 con +10 valoraciones',
    condition: (profile: Profile) => {
      const avg = profile.num_ratings > 0 ? profile.total_score / profile.num_ratings : 0;
      return avg === 5.0 && profile.num_ratings >= 10;
    },
  },
];

// ==================== FUNCIONES ====================

/**
 * Obtiene el rango de un conductor según su puntuación
 */
export const getDriverRank = (averageScore: number): DriverRank => {
  const rank = DRIVER_RANKS.find(
    r => averageScore >= r.minScore && averageScore <= r.maxScore
  );
  return rank || DRIVER_RANKS[0];
};

/**
 * Obtiene las insignias conseguidas por un conductor
 */
export const getEarnedBadges = (profile: Profile): Badge[] => {
  return BADGES.filter(badge => badge.condition(profile));
};

/**
 * Calcula estadísticas de atributos positivos
 */
export const calculateAttributeStats = (
  positiveAttributes: { [key: string]: number } | null | undefined, 
  totalVotes: number
): AttributeStats => {
  if (totalVotes === 0) return {};
  
  const attrs = positiveAttributes || {};
  
  const stats: AttributeStats = {};
  DRIVING_ATTRIBUTES.forEach(attr => {
    const votes = attrs[attr.id] || 0;
    stats[attr.id] = {
      ...attr,
      votes,
      percentage: Math.round((votes / totalVotes) * 100),
    };
  });
  
  return stats;
};

/**
 * Obtiene los 3 mejores atributos de un conductor
 */
export const getTopAttributes = (attributeStats: AttributeStats): AttributeStat[] => {
  return Object.values(attributeStats)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);
};
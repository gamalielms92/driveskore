// src/utils/gamification.ts
/**
 * Sistema de Gamificación DriveSkore v2.0
 * 
 * CAMBIOS PRINCIPALES:
 * - Niveles basados en valoraciones
 * - Badges de ranking semanal con contador
 * - Badge "Beta Tester" para participantes del piloto
 * - Requisitos más altos para badges élite
 * - Sistema de progreso a siguiente nivel
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

export interface UserLevel {
  level: number;
  name: string;
  icon: string;
  color: string;
  minRatings: number;
  maxRatings: number;
  description: string;
}

export interface LevelProgress {
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  currentRatings: number;
  ratingsToNext: number;
  progressPercentage: number;
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: 'ranking' | 'achievement' | 'special';
  condition: (profile: any) => boolean;
  locked?: boolean;
  progress?: string; // Texto de progreso para badges bloqueados
  count?: number; // Para badges de ranking (x3, x5, etc)
}

export interface Profile {
  plate: string;
  total_score: number;
  num_ratings: number;
  positive_attributes?: { [key: string]: number };
  total_votes?: number;
}

export interface UserStats {
  ratingsGiven: number; // Valoraciones hechas a otros
  ratingsReceived: number; // Valoraciones recibidas
  averageScore: number;
  badgeCounts?: {
    gold: number;
    silver: number;
    bronze: number;
  };
  pilotSurveyCompleted?: boolean;
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
];

/**
 * 🆕 Niveles de usuario basados en VALORACIONES REALIZADAS
 * Incentiva la participación activa en la comunidad
 */
export const USER_LEVELS: UserLevel[] = [
  {
    level: 1,
    name: 'Novato',
    icon: '🌱',
    color: '#95A5A6',
    minRatings: 0,
    maxRatings: 9,
    description: 'Empezando a explorar la comunidad',
  },
  {
    level: 2,
    name: 'Aprendiz',
    icon: '📚',
    color: '#3498DB',
    minRatings: 10,
    maxRatings: 24,
    description: 'Contribuyendo activamente',
  },
  {
    level: 3,
    name: 'Experimentado',
    icon: '⚡',
    color: '#9B59B6',
    minRatings: 25,
    maxRatings: 49,
    description: 'Miembro valioso de la comunidad',
  },
  {
    level: 4,
    name: 'Veterano',
    icon: '🛡️',
    color: '#E67E22',
    minRatings: 50,
    maxRatings: 99,
    description: 'Experto evaluador de conductores',
  },
  {
    level: 5,
    name: 'Maestro',
    icon: '👑',
    color: '#F39C12',
    minRatings: 100,
    maxRatings: 249,
    description: 'Líder de la comunidad',
  },
  {
    level: 6,
    name: 'Leyenda',
    icon: '🏆',
    color: '#FFD700',
    minRatings: 250,
    maxRatings: Infinity,
    description: 'Contribuidor legendario',
  },
];

/**
 * Rangos de conductor según puntuación (REPUTACIÓN)
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
 * 🆕 Insignias rediseñadas con categorías
 */
export const BADGES: Badge[] = [
  // === CATEGORÍA: RANKING SEMANAL ===
  {
    id: 'first_place',
    icon: '🥇',
    name: 'Primer Puesto',
    description: 'Quedaste 1º en el ranking semanal',
    category: 'ranking',
    condition: (stats: UserStats) => (stats.badgeCounts?.gold ?? 0) > 0,
  },
  {
    id: 'second_place',
    icon: '🥈',
    name: 'Segundo Puesto',
    description: 'Quedaste 2º en el ranking semanal',
    category: 'ranking',
    condition: (stats: UserStats) => (stats.badgeCounts?.silver ?? 0) > 0,
  },
  {
    id: 'third_place',
    icon: '🥉',
    name: 'Tercer Puesto',
    description: 'Quedaste 3º en el ranking semanal',
    category: 'ranking',
    condition: (stats: UserStats) => (stats.badgeCounts?.bronze ?? 0) > 0,
  },
  
  // === CATEGORÍA: LOGROS (REPUTACIÓN) ===
  {
    id: 'first_rating',
    icon: '🎯',
    name: 'Primera Evaluación',
    description: 'Recibiste tu primera valoración',
    category: 'achievement',
    condition: (stats: UserStats) => stats.ratingsReceived >= 1,
  },
  {
    id: 'popular',
    icon: '🌟',
    name: 'Conductor Popular',
    description: 'Alcanzaste 10 valoraciones',
    category: 'achievement',
    condition: (stats: UserStats) => stats.ratingsReceived >= 10,
  },
  {
    id: 'trusted',
    icon: '✅',
    name: 'Conductor Confiable',
    description: 'Alcanzaste 50 valoraciones',
    category: 'achievement',
    condition: (stats: UserStats) => stats.ratingsReceived >= 50,
  },
  {
    id: 'excellent',
    icon: '💎',
    name: 'Conductor Excepcional',
    description: 'Promedio ≥4.5 con +50 valoraciones',
    category: 'achievement',
    condition: (stats: UserStats) => {
      return stats.averageScore >= 4.5 && stats.ratingsReceived >= 50;
    },
  },
  {
    id: 'perfect',
    icon: '👑',
    name: 'Perfección Absoluta',
    description: 'Puntuación perfecta 5.0 con +100 valoraciones',
    category: 'achievement',
    condition: (stats: UserStats) => {
      return stats.averageScore === 5.0 && stats.ratingsReceived >= 100;
    },
  },
  
  // === CATEGORÍA: LOGROS (PARTICIPACIÓN) ===
  {
    id: 'active_rater',
    icon: '🚀',
    name: 'Evaluador Activo',
    description: 'Has evaluado a +10 conductores',
    category: 'achievement',
    condition: (stats: UserStats) => stats.ratingsGiven >= 10,
  },
  
  // === CATEGORÍA: ESPECIALES ===
  {
    id: 'beta_tester',
    icon: '🎖️',
    name: 'Beta Tester',
    description: 'Yo estuve aquí (completaste la encuesta)',
    category: 'special',
    condition: (stats: UserStats) => stats.pilotSurveyCompleted === true,
  },
];

// ==================== FUNCIONES ====================

/**
 * 🆕 Obtiene el nivel del usuario según valoraciones REALIZADAS
 */
export const getUserLevel = (ratingsGiven: number): UserLevel => {
  const level = USER_LEVELS.find(
    l => ratingsGiven >= l.minRatings && ratingsGiven <= l.maxRatings
  );
  return level || USER_LEVELS[0];
};

/**
 * 🆕 Calcula el progreso hacia el siguiente nivel
 */
export const getLevelProgress = (ratingsGiven: number): LevelProgress => {
  const currentLevel = getUserLevel(ratingsGiven);
  const nextLevelIndex = USER_LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  const nextLevel = nextLevelIndex < USER_LEVELS.length ? USER_LEVELS[nextLevelIndex] : null;
  
  const progressPercentage = nextLevel
    ? Math.round(((ratingsGiven - currentLevel.minRatings) / (nextLevel.minRatings - currentLevel.minRatings)) * 100)
    : 100;
  
  const ratingsToNext = nextLevel ? nextLevel.minRatings - ratingsGiven : 0;
  
  return {
    currentLevel,
    nextLevel,
    currentRatings: ratingsGiven,
    ratingsToNext: Math.max(0, ratingsToNext),
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
  };
};

/**
 * Obtiene el rango de un conductor según su puntuación (REPUTACIÓN)
 */
export const getDriverRank = (averageScore: number): DriverRank => {
  const rank = DRIVER_RANKS.find(
    r => averageScore >= r.minScore && averageScore <= r.maxScore
  );
  return rank || DRIVER_RANKS[0];
};

/**
 * 🆕 Obtiene las insignias conseguidas y bloqueadas con progreso
 */
export const getEarnedBadges = (stats: UserStats): Badge[] => {
  return BADGES.filter(badge => badge.condition(stats)).map(badge => {
    // Añadir contador para badges de ranking
    if (badge.category === 'ranking' && stats.badgeCounts) {
      let count = 0;
      if (badge.id === 'first_place') count = stats.badgeCounts.gold;
      if (badge.id === 'second_place') count = stats.badgeCounts.silver;
      if (badge.id === 'third_place') count = stats.badgeCounts.bronze;
      
      return { ...badge, count };
    }
    return badge;
  });
};

/**
 * 🆕 Obtiene badges bloqueados con información de progreso
 */
export const getLockedBadges = (stats: UserStats): Badge[] => {
  return BADGES.filter(badge => !badge.condition(stats)).map(badge => {
    let progress = '';
    
    // Calcular progreso según el badge
    switch (badge.id) {
      case 'first_rating':
        progress = 'Necesitas recibir tu primera valoración';
        break;
      case 'popular':
        progress = `Te faltan ${10 - stats.ratingsReceived} valoraciones`;
        break;
      case 'trusted':
        progress = `Te faltan ${50 - stats.ratingsReceived} valoraciones`;
        break;
      case 'excellent':
        if (stats.ratingsReceived < 50) {
          progress = `Te faltan ${50 - stats.ratingsReceived} valoraciones`;
        } else {
          progress = `Necesitas promedio ≥4.5 (actual: ${stats.averageScore.toFixed(1)})`;
        }
        break;
      case 'perfect':
        if (stats.ratingsReceived < 100) {
          progress = `Te faltan ${100 - stats.ratingsReceived} valoraciones`;
        } else {
          progress = `Necesitas promedio perfecto 5.0 (actual: ${stats.averageScore.toFixed(1)})`;
        }
        break;
      case 'active_rater':
        progress = `Te faltan ${10 - stats.ratingsGiven} evaluaciones`;
        break;
      case 'first_place':
      case 'second_place':
      case 'third_place':
        progress = 'Entra al top 3 del ranking semanal';
        break;
      case 'beta_tester':
        progress = 'Completa la encuesta del piloto';
        break;
    }
    
    return { 
      ...badge, 
      locked: true,
      progress 
    };
  });
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
 * Obtiene los 3 mejores atributos de un conductor (sin medallas)
 */
export const getTopAttributes = (attributeStats: AttributeStats): AttributeStat[] => {
  return Object.values(attributeStats)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);
};
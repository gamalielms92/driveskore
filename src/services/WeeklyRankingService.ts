// src/services/WeeklyRankingService.ts
/**
 * Servicio de Rankings Semanales y Posición Global
 * 
 * Gestiona:
 * - Rankings semanales (top 10)
 * - Posición global del usuario
 * - Histórico de rankings
 * - Actualización de contadores de medallas
 */

import { supabase } from '../config/supabase';

export interface WeeklyRankingEntry {
  user_id: string;
  position: number;
  total_ratings: number;
  average_score: number;
  week_start: string;
  week_end: string;
  // Datos enriquecidos del usuario
  full_name?: string;
  avatar_url?: string | null;
  vehicles?: Array<{
    plate: string;
    brand: string;
    model: string;
    vehicle_photo_url: string | null;
  }>;
}

export interface GlobalRankingEntry {
  user_id: string;
  position: number;
  total_ratings: number;
  average_score: number;
  full_name: string;
  avatar_url: string | null;
  level: number; // ⚠️ Este campo contiene ratingsGiven (no el nivel calculado)
  vehicles: Array<{
    plate: string;
    brand: string;
    model: string;
    vehicle_photo_url: string | null;
  }>;
}

class WeeklyRankingService {
  
  /**
   * Obtiene el ranking semanal actual (top 10)
   */
  async getCurrentWeeklyRanking(): Promise<WeeklyRankingEntry[]> {
    try {
      console.log('📊 Cargando ranking semanal actual...');
      
      // Calcular inicio de semana (lunes)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si es domingo, retroceder 6 días
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      
      const weekStart = monday.toISOString().split('T')[0];
      
      console.log(`📅 Semana actual: desde ${weekStart}`);
      
      // Buscar ranking de esta semana
      const { data: rankings, error: rankingsError } = await supabase
        .from('weekly_rankings')
        .select('*')
        .eq('week_start', weekStart)
        .order('position', { ascending: true })
        .limit(10);
      
      if (rankingsError) throw rankingsError;
      
      if (!rankings || rankings.length === 0) {
        console.log('⚠️ No hay ranking para esta semana todavía');
        return [];
      }
      
      // Enriquecer con datos de usuario
      const enrichedRankings: WeeklyRankingEntry[] = [];
      
      for (const ranking of rankings) {
        // Cargar perfil de usuario
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', ranking.user_id)
          .maybeSingle();
        
        // Cargar vehículos
        const { data: vehicles } = await supabase
          .from('user_vehicles')
          .select('plate, brand, model, vehicle_photo_url')
          .eq('user_id', ranking.user_id)
          .limit(3);
        
        enrichedRankings.push({
          ...ranking,
          full_name: userProfile?.full_name || 'Usuario sin nombre',
          avatar_url: userProfile?.avatar_url || null,
          vehicles: vehicles || [],
        });
      }
      
      console.log(`✅ Ranking cargado: ${enrichedRankings.length} usuarios`);
      return enrichedRankings;
      
    } catch (error: any) {
      console.error('❌ Error cargando ranking semanal:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene el ranking global actual (top 10)
   * Basado en promedio de score y número de valoraciones
   */
  async getGlobalRanking(): Promise<GlobalRankingEntry[]> {
    try {
      console.log('🌍 Cargando ranking global...');
      
      // 1. Obtener usuarios con sus estadísticas agregadas
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, plate, total_score, num_ratings')
        .not('user_id', 'is', null);
      
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];
      
      // 2. Agrupar por user_id y agregar puntuaciones
      const userScores = new Map<string, {
        total_score: number;
        num_ratings: number;
        plates: string[];
      }>();
      
      profiles.forEach(profile => {
        if (!profile.user_id) return;
        
        const existing = userScores.get(profile.user_id);
        if (existing) {
          existing.total_score += profile.total_score;
          existing.num_ratings += profile.num_ratings;
          existing.plates.push(profile.plate);
        } else {
          userScores.set(profile.user_id, {
            total_score: profile.total_score,
            num_ratings: profile.num_ratings,
            plates: [profile.plate],
          });
        }
      });
      
      // 3. Convertir a array y ordenar
      const sortedUsers = Array.from(userScores.entries())
        .filter(([_, stats]) => stats.num_ratings >= 3) // Mínimo 3 valoraciones
        .map(([userId, stats]) => ({
          user_id: userId,
          average_score: stats.total_score / stats.num_ratings,
          total_ratings: stats.num_ratings,
        }))
        .sort((a, b) => {
          // Ordenar por score promedio, luego por número de valoraciones
          if (Math.abs(a.average_score - b.average_score) < 0.01) {
            return b.total_ratings - a.total_ratings;
          }
          return b.average_score - a.average_score;
        })
        .slice(0, 10); // Top 10
      
      // 4. Enriquecer con datos de usuario
      const enrichedRankings: GlobalRankingEntry[] = [];
      
      for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        
        // Cargar perfil
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.user_id)
          .maybeSingle();
        
        // Cargar vehículos
        const { data: vehicles } = await supabase
          .from('user_vehicles')
          .select('plate, brand, model, vehicle_photo_url')
          .eq('user_id', user.user_id)
          .limit(3);
        
        // Cargar número de valoraciones REALIZADAS (ratingsGiven) para calcular nivel
        const { count: ratingsGiven } = await supabase
          .from('ratings')
          .select('*', { count: 'exact', head: true })
          .eq('rater_id', user.user_id);
        
        enrichedRankings.push({
          user_id: user.user_id,
          position: i + 1,
          total_ratings: user.total_ratings,
          average_score: user.average_score,
          full_name: userProfile?.full_name || 'Usuario sin nombre',
          avatar_url: userProfile?.avatar_url || null,
          level: ratingsGiven || 0, // Guardar ratingsGiven, no el nivel calculado
          vehicles: vehicles || [],
        });
      }
      
      console.log(`✅ Ranking global cargado: ${enrichedRankings.length} usuarios`);
      return enrichedRankings;
      
    } catch (error: any) {
      console.error('❌ Error cargando ranking global:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene la posición global de un usuario específico
   */
  async getUserGlobalPosition(userId: string): Promise<number> {
    try {
      console.log(`🎯 Calculando posición global para usuario ${userId}...`);
      
      // 1. Obtener todos los perfiles con user_id
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, plate, total_score, num_ratings')
        .not('user_id', 'is', null);
      
      if (error) throw error;
      if (!profiles || profiles.length === 0) return 9999;
      
      // 2. Agrupar por user_id
      const userScores = new Map<string, {
        total_score: number;
        num_ratings: number;
      }>();
      
      profiles.forEach(profile => {
        if (!profile.user_id) return;
        
        const existing = userScores.get(profile.user_id);
        if (existing) {
          existing.total_score += profile.total_score;
          existing.num_ratings += profile.num_ratings;
        } else {
          userScores.set(profile.user_id, {
            total_score: profile.total_score,
            num_ratings: profile.num_ratings,
          });
        }
      });
      
      // 3. Ordenar usuarios
      const sortedUsers = Array.from(userScores.entries())
        .filter(([_, stats]) => stats.num_ratings > 0)
        .map(([uid, stats]) => ({
          user_id: uid,
          average_score: stats.total_score / stats.num_ratings,
          total_ratings: stats.num_ratings,
        }))
        .sort((a, b) => {
          if (Math.abs(a.average_score - b.average_score) < 0.01) {
            return b.total_ratings - a.total_ratings;
          }
          return b.average_score - a.average_score;
        });
      
      // 4. Encontrar posición del usuario
      const position = sortedUsers.findIndex(u => u.user_id === userId) + 1;
      
      console.log(`✅ Posición global: #${position || '?'}`);
      return position || 9999;
      
    } catch (error: any) {
      console.error('❌ Error calculando posición global:', error);
      return 9999;
    }
  }
  
  /**
   * Obtiene el historial de rankings de un usuario
   */
  async getUserRankingHistory(userId: string, limit: number = 4): Promise<WeeklyRankingEntry[]> {
    try {
      const { data, error } = await supabase
        .from('weekly_rankings')
        .select('*')
        .eq('user_id', userId)
        .order('week_start', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
      
    } catch (error: any) {
      console.error('❌ Error cargando historial de rankings:', error);
      return [];
    }
  }
  
  /**
   * Verifica si un usuario está en el top 3 esta semana
   */
  async isUserInTopThree(userId: string): Promise<{
    inTop3: boolean;
    position: number | null;
  }> {
    try {
      const ranking = await this.getCurrentWeeklyRanking();
      const userEntry = ranking.find(r => r.user_id === userId);
      
      if (userEntry && userEntry.position <= 3) {
        return {
          inTop3: true,
          position: userEntry.position,
        };
      }
      
      return { inTop3: false, position: null };
      
    } catch (error: any) {
      console.error('❌ Error verificando top 3:', error);
      return { inTop3: false, position: null };
    }
  }
  
  /**
   * 🔧 FUNCIÓN DE TESTING: Calcular ranking manualmente
   * (Solo para desarrollo/testing - en producción se usa la función SQL)
   */
  async calculateWeeklyRankingManual(): Promise<void> {
    try {
      console.log('🔧 [DEV] Calculando ranking semanal manualmente...');
      
      // Calcular semana actual
      const today = new Date();
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const weekStart = monday.toISOString().split('T')[0];
      const weekEnd = sunday.toISOString().split('T')[0];
      
      console.log(`📅 Calculando para semana: ${weekStart} - ${weekEnd}`);
      
      // Esta función está incompleta intencionalmente
      // En producción se debe usar la función SQL calculate_weekly_ranking()
      
      console.log('⚠️ Esta es una función de desarrollo. En producción usar SQL function.');
      
    } catch (error: any) {
      console.error('❌ Error en cálculo manual:', error);
      throw error;
    }
  }
}

export default new WeeklyRankingService();
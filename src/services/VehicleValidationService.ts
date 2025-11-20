// src/services/VehicleValidationService.ts

import type { VehicleFormData, VehicleValidationResult } from '../types/vehicle';

/**
 * Servicio para validar datos de vehículos
 */

export class VehicleValidationService {
  
  /**
   * Valida el formulario completo de vehículo
   */
  static validateVehicleForm(data: VehicleFormData): VehicleValidationResult {
    const errors: string[] = [];
    
    // 1. Foto obligatoria
    if (!data.vehicle_photo_url || data.vehicle_photo_url.trim() === '') {
      errors.push('📷 La foto del vehículo es obligatoria');
    }
    
    // 2. Marca obligatoria
    if (!data.brand || data.brand.trim() === '') {
      errors.push('🏭 La marca es obligatoria');
    }
    
    // 3. Modelo obligatorio
    if (!data.model || data.model.trim() === '') {
      errors.push('🚗 El modelo es obligatorio');
    }
    
    // 4. Color obligatorio
    if (!data.color || data.color.trim() === '') {
      errors.push('🎨 El color es obligatorio');
    }
    
    // 5. Año obligatorio y válido
    const currentYear = new Date().getFullYear();
    
    if (!data.year) {
      errors.push('📅 El año es obligatorio');
    } else if (data.year < 1900 || data.year > currentYear + 1) {
      errors.push(`📅 Año inválido (debe estar entre 1900 y ${currentYear + 1})`);
    }
    
    // 6. Validar según tipo de vehículo
    if (data.vehicle_type === 'car' || data.vehicle_type === 'motorcycle') {
      // Los vehículos motorizados DEBEN tener matrícula
      if (!data.plate || data.plate.trim() === '') {
        errors.push('🚙 Los vehículos motorizados requieren matrícula');
      } else {
        // Validar formato de matrícula española
        const plateValidation = this.validateSpanishPlate(data.plate);
        if (!plateValidation.isValid) {
          errors.push(plateValidation.error || '🚙 Formato de matrícula inválido');
        }
      }
    }
    
    // 7. Validar nickname si existe
    if (data.nickname && data.nickname.length > 50) {
      errors.push('✏️ El apodo no puede tener más de 50 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Valida formato de matrícula española
   */
  static validateSpanishPlate(plate: string): { isValid: boolean; error?: string } {
    // Limpiar espacios y guiones
    const cleanPlate = plate.replace(/[-\s]/g, '').toUpperCase();
    
    // Formato nuevo: 1234ABC
    const newFormatRegex = /^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/;
    
    // Formato antiguo: A-1234-BC o AB-1234-C
    const oldFormatRegex = /^[A-Z]{0,2}[0-9]{4}[A-Z]{1,2}$/;
    
    if (!newFormatRegex.test(cleanPlate) && !oldFormatRegex.test(cleanPlate)) {
      return {
        isValid: false,
        error: 'Formato inválido. Ejemplo: 1234 ABC o matrícula anterior al año 2000'
      };
    }
    
    return { isValid: true };
  }
}

export default VehicleValidationService;
// src/utils/plateValidator.ts

/**
 * Validador de matrículas españolas
 * Soporta diferentes formatos históricos
 */

// ==================== INTERFACES ====================

export interface PlateValidation {
  isValid: boolean;
  format?: 'current' | 'provincial';
  plate?: string;
  numbers?: string;
  letters?: string;
  province?: string;
  year?: string;
  raw: string;
  error?: string;
}

// ==================== CONSTANTES ====================

// Formato actual (desde 2000): 1234 ABC
const CURRENT_FORMAT = /\b(\d{4})\s?([A-Z]{3})\b/;

// Formato antiguo provincial: M 1234 BC o MA 1234 BC
const PROVINCIAL_FORMAT = /\b([A-Z]{1,2})\s?(\d{4})\s?([A-Z]{1,2})\b/;

// Lista negra de combinaciones de letras prohibidas por la DGT
const BLACKLISTED_LETTERS: string[] = ['SEX', 'GAY', 'KKK', 'ETA', 'PNV'];

// ==================== FUNCIONES ====================

/**
 * Limpia el texto OCR para mejorar detección
 */
const cleanOCRText = (text: string): string => {
  return text
    .toUpperCase()
    .replace(/[^0-9A-Z\s]/g, '') // Solo números, letras y espacios
    .replace(/\s+/g, ' ')         // Normalizar espacios
    .trim();
};

/**
 * Normaliza matrícula para BASE DE DATOS (con espacio, sin guiones)
 */
export const normalizePlate = (plate: string | null | undefined): string => {
  if (!plate) return '';
  
  // Eliminar guiones y normalizar espacios múltiples
  const cleaned = plate
    .toUpperCase()
    .replace(/-/g, '')        // Elimina guiones
    .replace(/\s+/g, ' ')     // Normaliza espacios múltiples a uno
    .trim();
  
  // Si es formato nuevo sin espacio (1234ABC), añadir espacio
  if (/^(\d{4})([A-Z]{3})$/.test(cleaned)) {
    return cleaned.replace(/^(\d{4})([A-Z]{3})$/, '$1 $2'); // → "1234 ABC"
  }
  
  // Si es formato provincial sin espacios (M1234BC), añadir espacios
  if (/^([A-Z]{1,2})(\d{4})([A-Z]{1,2})$/.test(cleaned)) {
    return cleaned.replace(/^([A-Z]{1,2})(\d{4})([A-Z]{1,2})$/, '$1 $2 $3'); // → "M 1234 BC"
  }
  
  // Si ya tiene el formato correcto, devolverlo
  return cleaned;
};

/**
 * Valida y formatea matrícula española
 */
export const validateSpanishPlate = (text: string | null | undefined): PlateValidation => {
  if (!text) {
    return {
      isValid: false,
      plate: undefined,
      raw: '',
      error: 'Texto vacío'
    };
  }

  const cleaned = cleanOCRText(text);

  // Probar formato actual (2000+): 1234 ABC
  let match = cleaned.match(CURRENT_FORMAT);
  if (match) {
    return {
      isValid: true,
      format: 'current',
      plate: `${match[1]} ${match[2]}`,
      numbers: match[1],
      letters: match[2],
      year: '2000-actualidad',
      raw: text
    };
  }

  // Probar formato provincial: M 1234 BC
  match = cleaned.match(PROVINCIAL_FORMAT);
  if (match) {
    return {
      isValid: true,
      format: 'provincial',
      plate: `${match[1]} ${match[2]} ${match[3]}`,
      province: match[1],
      numbers: match[2],
      letters: match[3],
      year: '1971-2000',
      raw: text
    };
  }

  // No se encontró formato válido
  return {
    isValid: false,
    plate: undefined,
    raw: text,
    error: 'Formato de matrícula no reconocido'
  };
};

/**
 * Corrige errores comunes del OCR
 */
export const correctOCRErrors = (text: string): string => {
  let corrected = text.toUpperCase();

  // Correcciones comunes para la parte numérica
  const numCorrections: { [key: string]: string } = {
    'O': '0',
    'I': '1',
    'L': '1',
    'S': '5',
    'B': '8',
    'Z': '2',
  };

  // Correcciones comunes para la parte de letras
  const letterCorrections: { [key: string]: string } = {
    '0': 'O',
    '1': 'I',
    '5': 'S',
    '8': 'B',
    '2': 'Z',
  };

  // Intentar formato 1234 ABC
  const pattern = /(\w{4})\s?(\w{3})/;
  const match = corrected.match(pattern);
  
  if (match) {
    let nums = match[1];
    let lets = match[2];

    // Corregir parte numérica (solo números)
    nums = nums.split('').map((char: string) => {
      if (/[A-Z]/.test(char)) {
        return numCorrections[char] || char;
      }
      return char;
    }).join('');

    // Corregir parte de letras (solo letras)
    lets = lets.split('').map((char: string) => {
      if (/[0-9]/.test(char)) {
        return letterCorrections[char] || char;
      }
      return char;
    }).join('');

    corrected = `${nums} ${lets}`;
  }

  return corrected;
};

/**
 * Verifica si la matrícula está en lista negra
 * (palabras ofensivas prohibidas por la DGT)
 */
export const isBlacklisted = (plate: string | null | undefined): boolean => {
  if (!plate) return false;
  
  const validation = validateSpanishPlate(plate);
  if (!validation.isValid || !validation.letters) return false;
  
  return BLACKLISTED_LETTERS.includes(validation.letters);
};

/**
 * Formatea matrícula para VISUALIZACIÓN (con espacio, para mostrar al usuario)
 */
export const formatPlate = (plate: string | null | undefined): string => {
  if (!plate) return '';
  
  const validation = validateSpanishPlate(plate);
  return validation.isValid && validation.plate ? validation.plate : plate;
};
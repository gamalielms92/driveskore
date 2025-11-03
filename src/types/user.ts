// src/types/user.ts

/**
 * Tipos para perfiles de usuario
 */

export interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileFormData {
  full_name: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  profile: UserProfile | null;
}

export interface UserValidationResult {
  isValid: boolean;
  errors: string[];
}

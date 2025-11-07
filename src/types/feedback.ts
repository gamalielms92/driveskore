// src/types/feedback.ts

export type FeedbackCategory = 'bug' | 'suggestion' | 'other';
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface FeedbackSubmission {
  category: FeedbackCategory;
  description: string;
  screenshot_uri?: string; // URI local de la imagen (si existe)
  user_email?: string;
}

export interface FeedbackMetadata {
  device_model: string;
  os_version: string;
  app_version: string;
}

export interface FeedbackRecord {
  id: string;
  user_id: string;
  user_email: string | null;
  category: FeedbackCategory;
  description: string;
  screenshot_url: string | null;
  device_model: string | null;
  os_version: string | null;
  app_version: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormspreeResponse {
  ok: boolean;
  next?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

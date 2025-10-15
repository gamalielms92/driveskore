import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// CAMBIA ESTOS VALORES por los tuyos de Supabase
const supabaseUrl = 'https://dfpwfkeeapdbnetkyzwi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcHdma2VlYXBkYm5ldGt5endpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzcyMTAsImV4cCI6MjA3NTcxMzIxMH0.P6ENMwmG4dju4CeHcWoOWZELtSIYWIEpKiqbSjsrQ98';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
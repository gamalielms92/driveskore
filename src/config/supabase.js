import { createClient } from '@supabase/supabase-js';

// Detectar si estamos en el navegador o en Node.js
const isBrowser = typeof window !== 'undefined';

// Solo importar AsyncStorage en React Native/cliente
let AsyncStorage;
if (isBrowser && typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dfpwfkeeapdbnetkyzwi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcHdma2VlYXBkYm5ldGt5endpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzcyMTAsImV4cCI6MjA3NTcxMzIxMH0.P6ENMwmG4dju4CeHcWoOWZELtSIYWIEpKiqbSjsrQ98';

// Configuración adaptativa según el entorno
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
};

// Solo usar AsyncStorage en React Native
if (AsyncStorage) {
  supabaseConfig.auth.storage = AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseConfig);

// ✅ Manejar errores de refresh token silenciosamente
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Token refrescado correctamente');
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 Usuario cerró sesión');
  } else if (event === 'SIGNED_IN') {
    console.log('🔐 Usuario inició sesión');
  }
});

// ✅ Capturar errores de refresh token al iniciar
if (AsyncStorage) {
  supabase.auth.getSession().catch(async (error) => {
    console.log('⚠️ Error recuperando sesión inicial:', error.message);
    // Limpiar storage corrupto si es error de refresh token
    if (error.message?.includes('Refresh Token')) {
      console.log('🧹 Limpiando storage corrupto...');
      try {
        await AsyncStorage.removeItem('supabase.auth.token');
      } catch (e) {
        console.log('Error limpiando storage:', e);
      }
    }
  });
}
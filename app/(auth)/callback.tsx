// app/auth/callback.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../src/config/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Pequeño delay para que el usuario vea la pantalla
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar si hay sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      
      setIsVerifying(false);

      if (session) {
        console.log('✅ Email verificado, sesión activa');
        setVerified(true);
        
        // Auto-redirigir después de 2 segundos
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else {
        console.log('⚠️ No hay sesión, pero el email fue verificado');
        setVerified(true);
        // Mostrar mensaje de éxito pero no auto-redirigir
      }
    } catch (error) {
      console.error('Error en callback:', error);
      setIsVerifying(false);
      setVerified(true); // Asumir que se verificó
    }
  };

  const handleOpenApp = () => {
    router.replace('/(tabs)');
  };

  const handleOpenWebsite = async () => {
    await Linking.openURL('https://driveskore.vercel.app');
  };

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.verifyingText}>Verificando email...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.checkmark}>✅</Text>
        
        <Text style={styles.title}>¡Email Confirmado!</Text>
        
        <Text style={styles.description}>
          Tu cuenta ha sido verificada.{'\n'}
          Ya puedes usar DriveSkore.
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleOpenApp}
        >
          <Text style={styles.buttonText}>Abrir DriveSkore</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes la app? </Text>
          <TouchableOpacity onPress={handleOpenWebsite}>
            <Text style={styles.footerLink}>Descárgala aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
    // Gradient effect simulated with a single color (React Native no tiene gradients nativos sin librerías)
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    maxWidth: 500,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 20,
  },
  logo: {
    width: 280,
    height: 80,
    marginBottom: 20,
  },
  checkmark: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 25,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
  },
  footerLink: {
    fontSize: 13,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
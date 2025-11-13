import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import { Analytics } from '../../src/services/Analytics';
import EventCaptureService from '../../src/services/EventCaptureService';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor rellena todos los campos');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // REGISTRO SIMPLE
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://driveskore.vercel.app/success.html',
          }
        });

        if (error) throw error;

        await Analytics.trackSignUp('email');

        Alert.alert(
          '🎉 ¡Registro exitoso!',
          'Por favor verifica tu email antes de iniciar sesión.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
        
      } else {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Inicializar EventCaptureService con el userId
        if (data.user) {
          console.log('🔐 Login exitoso, inicializando EventCaptureService...');
          await EventCaptureService.initialize(data.user.id);
          console.log('✅ EventCaptureService inicializado para:', data.user.email);
        }
        
        // El _layout.tsx se encargará de redirigir
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>
          {isSignUp ? 'Crea tu cuenta' : 'Evalúa conductores, mejora las carreteras'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoImage: {
    width: 280,
    height: 80,
    marginBottom: 20,
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    padding: 10,
  },
  switchText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
  },
});
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import { Analytics } from '../../src/services/Analytics';
import EventCaptureService from '../../src/services/EventCaptureService';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Helper para mostrar alertas en web y móvil
  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      onOk?.();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showAlert('Error', 'Por favor rellena todos los campos');
      return;
    }

        // ✅ VALIDACIÓN DEL CHECKBOX
        if (isSignUp && !acceptedPrivacy) {
          showAlert(
            'Política de Privacidad', 
            'Debes aceptar la Política de Privacidad para registrarte'
          );
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

        showAlert(
          '🎉 ¡Registro exitoso!',
          'Por favor verifica tu email antes de iniciar sesión.',
          () => setIsSignUp(false)
        );
        
      } else {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Manejar diferentes tipos de errores
          if (error.message.includes('Email not confirmed')) {
            showAlert(
              '📧 Email no verificado',
              'Por favor, verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada y spam.'
            );
          } else if (error.message.includes('Invalid login credentials')) {
            showAlert(
              '❌ Credenciales incorrectas',
              'El email o contraseña no son correctos. Por favor, inténtalo de nuevo.'
            );
          } else if (error.message.includes('User not found')) {
            showAlert(
              '👤 Usuario no encontrado',
              'No existe una cuenta con este email. ¿Quizás necesitas registrarte primero?'
            );
          } else {
            // Error genérico
            showAlert('Error de inicio de sesión', error.message);
          }
          setLoading(false);
          return;
        }
        
        // Inicializar EventCaptureService con el userId
        if (data.user) {
          console.log('🔐 Login exitoso, inicializando EventCaptureService...');
          await EventCaptureService.initialize(data.user.id);
          console.log('✅ EventCaptureService inicializado para:', data.user.email);
        }
        
        // El _layout.tsx se encargará de redirigir
      }
    } catch (error: any) {
      // Error genérico para casos no manejados
      showAlert('Error', error.message || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

    // ✅ FUNCIÓN PARA ABRIR POLÍTICA DE PRIVACIDAD
    const openPrivacyPolicy = () => {
      if (Platform.OS === 'web') {
        // En web, navegar internamente
        router.push('/privacy');
      } else {
        // En móvil, abrir en navegador externo
        const privacyUrl = 'https://driveskore.vercel.app/privacy.html';
        Linking.openURL(privacyUrl).catch(err => 
          console.error('Error abriendo política de privacidad:', err)
        );
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

        {/* ✅ CHECKBOX DE PRIVACIDAD (solo en registro) */}
        {isSignUp && (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, acceptedPrivacy && styles.checkboxChecked]}>
                      {acceptedPrivacy && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      Acepto la{' '}
                      <Text style={styles.link} onPress={openPrivacyPolicy}>
                        Política de Privacidad
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}

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
  // ✅ ESTILOS DEL CHECKBOX
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'white',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  link: {
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
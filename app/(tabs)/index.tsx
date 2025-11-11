// app/(tabs)/index.tsx
// ✅ LANDING PAGE COMPLETA para Web + Home para Móvil

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';

interface ActiveVehicle {
  id: string;
  plate: string;
  nickname: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeVehicle, setActiveVehicle] = useState<ActiveVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // ✅ Re-verificar auth cuando vuelve a la pantalla (navegación)
  useEffect(() => {
    if (Platform.OS === 'web') {
      // En web, escuchar cambios de auth para actualizar UI
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setIsLoggedIn(!!session?.user);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      if (user && Platform.OS !== 'web') {
        // Solo cargar vehículo en móvil
        const { data: vehicles } = await supabase
          .from('user_vehicles')
          .select('*')
          .eq('user_id', user.id)
          .eq('online', true)
          .maybeSingle();

        setActiveVehicle(vehicles);
      }
    } catch (error) {
      console.error('Error verificando auth:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // VERSIÓN WEB - LANDING PAGE
  // ========================================
  if (Platform.OS === 'web') {
    // Si está logueado, mostrar dashboard web
    if (isLoggedIn) {
      return (
        <ScrollView style={styles.webContainer}>
          <View style={styles.webLoggedInContent}>
            {/* Header */}
            <View style={styles.webHeader}>
              <Text style={styles.webHeaderTitle}>¡Bienvenido a DriveSkore! 🚗</Text>
              <Text style={styles.webHeaderSubtitle}>
                Usa los tabs de navegación para explorar la plataforma
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.webQuickActions}>
              <TouchableOpacity 
                style={styles.webActionCard}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Text style={styles.webActionIcon}>🔍</Text>
                <Text style={styles.webActionTitle}>Buscar Conductores</Text>
                <Text style={styles.webActionDesc}>Consulta valoraciones y rankings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.webActionCard}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Text style={styles.webActionIcon}>👤</Text>
                <Text style={styles.webActionTitle}>Mi Perfil</Text>
                <Text style={styles.webActionDesc}>Estadísticas y configuración</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.webActionCard}
                onPress={() => router.push('/(tabs)/referrals')}
              >
                <Text style={styles.webActionIcon}>👥</Text>
                <Text style={styles.webActionTitle}>Invitar Amigos</Text>
                <Text style={styles.webActionDesc}>Comparte tu código único</Text>
              </TouchableOpacity>
            </View>

            {/* Info importante */}
            <View style={styles.webInfoBox}>
              <Text style={styles.webInfoIcon}>📱</Text>
              <Text style={styles.webInfoText}>
                Para capturar eventos y usar el modo conductor, descarga la app móvil
              </Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    // Si NO está logueado, mostrar landing page
    return (
      <ScrollView style={styles.landingContainer}>
      {/* ========== HERO SECTION CON IMAGEN DE FONDO ========== */}
      <View style={styles.heroSection}>
        {/* ✅ IMAGEN DE FONDO - Solo en Web */}
        {Platform.OS === 'web' && (
          <>
            {/* Capa 1: Imagen de fondo */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'url(/assets/images/hero-background.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.6)',
                zIndex: 0,
              }}
            />
            
            {/* Capa 2: Overlay azul */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 122, 255, 0.75)',
                zIndex: 1,
              }}
            />
          </>
        )}
        
        {/* ✅ CONTENIDO DEL HERO - Sobre las capas */}
        <View style={{ zIndex: 2, alignItems: 'center', width: '100%', maxWidth: 800 }}>
          <Text style={styles.heroLogo}>🚗</Text>
          <Text style={styles.heroTitle}>DriveSkore</Text>
          <Text style={styles.heroSubtitle}>
            Evalúa conductores, mejora la seguridad vial
          </Text>
          <Text style={styles.heroDescription}>
            Una comunidad que valora y promueve la conducción responsable
          </Text>
          
          {/* QR y Descarga */}
          <View style={styles.downloadSection}>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrIcon}>📱</Text>
              <Text style={styles.qrText}>Escanea para descargar</Text>
              <Text style={styles.qrSubtext}>
                O usa el enlace de descarga
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => {
                // TODO: Reemplazar con tu link real de EAS Build o Play Store
                alert('Link de descarga: Configura tu URL de EAS Build aquí');
              }}
            >
              <Text style={styles.downloadButtonText}>📥 Descargar APK</Text>
            </TouchableOpacity>
          </View>

          {/* Botón Login */}
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>🔐 Acceder a Estadísticas</Text>
          </TouchableOpacity>
        </View>
      </View>

        {/* QUÉ ES DRIVESKORE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué es DriveSkore?</Text>
          <Text style={styles.sectionText}>
            DriveSkore es una aplicación móvil que permite a la comunidad evaluar el comportamiento 
            de conductores mediante reconocimiento de matrículas y GPS en tiempo real.
          </Text>
          <Text style={styles.sectionText}>
            Nuestro objetivo es crear transparencia en torno al comportamiento al volante, 
            especialmente útil para carpooling y compartir vehículos de forma segura.
          </Text>
        </View>

        {/* CÓMO FUNCIONA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Cómo funciona?</Text>
          
          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>1</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>📱 Descarga la App</Text>
              <Text style={styles.stepText}>
                Disponible para Android. Regístrate con tu email.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>2</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>🚗 Registra tu Vehículo</Text>
              <Text style={styles.stepText}>
                Añade tus matrículas para recibir valoraciones en tu perfil.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>3</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>📸 Captura Eventos</Text>
              <Text style={styles.stepText}>
                Usa el botón flotante o mando Bluetooth mientras conduces para registrar comportamientos.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>4</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>⭐ Valora Conductores</Text>
              <Text style={styles.stepText}>
                Puntúa del 1 al 5 estrellas y añade comentarios sobre la conducción observada.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>5</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>🏆 Gana Niveles</Text>
              <Text style={styles.stepText}>
                Participa en la comunidad, sube de nivel y desbloquea logros.
              </Text>
            </View>
          </View>
        </View>

        {/* SORTEO DEL PILOTO */}
        <View style={[styles.section, styles.sectionHighlight]}>
          <Text style={styles.sectionTitle}>🎁 Sorteo del Piloto</Text>
          <Text style={styles.sectionText}>
            Durante nuestro programa piloto en el campus, ¡puedes ganar premios!
          </Text>
          
          <View style={styles.prizeCard}>
            <Text style={styles.prizeLabel}>📅 Fecha del sorteo:</Text>
            <Text style={styles.prizeValue}>9-12 de Diciembre 2025</Text>
          </View>

          <View style={styles.prizeCard}>
            <Text style={styles.prizeLabel}>🎟️ Cómo participar:</Text>
            <Text style={styles.prizeValue}>
              Invita amigos con tu código único. Por cada amigo que verifique su email, 
              ganas 1 papeleta. ¡Con 10 amigos te conviertes en Embajador y ganas 5 papeletas extra!
            </Text>
          </View>

          <View style={styles.prizeCard}>
            <Text style={styles.prizeLabel}>🎥 Streaming en vivo:</Text>
            <Text style={styles.prizeValue}>
              El sorteo se realizará en directo para total transparencia
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.ctaButtonText}>Participar en el Sorteo</Text>
          </TouchableOpacity>
        </View>

        {/* SISTEMA DE REFERIDOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Invita a tus Amigos</Text>
          <Text style={styles.sectionText}>
            Cada usuario tiene un código único de invitación. Compártelo con amigos del campus 
            para que se unan a la comunidad.
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✅</Text>
              <Text style={styles.benefitText}>
                Gana papeletas para el sorteo del piloto
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>👑</Text>
              <Text style={styles.benefitText}>
                Conviértete en Embajador con 10 referidos
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🏆</Text>
              <Text style={styles.benefitText}>
                Desbloquea insignias especiales
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📊</Text>
              <Text style={styles.benefitText}>
                Sube posiciones en el ranking global
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Preguntas Frecuentes</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Es gratis DriveSkore?</Text>
            <Text style={styles.faqAnswer}>
              Sí, DriveSkore es completamente gratuito para todos los usuarios.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Cómo se protege mi privacidad?</Text>
            <Text style={styles.faqAnswer}>
              Cumplimos con GDPR. Las fotos de perfil son opcionales, no mostramos matrículas 
              en perfiles públicos, y puedes controlar qué información compartes.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Puedo valorar mi propia conducción?</Text>
            <Text style={styles.faqAnswer}>
              No. El sistema bloquea autoevaluaciones para garantizar valoraciones imparciales.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Cómo funciona el sistema de niveles?</Text>
            <Text style={styles.faqAnswer}>
              Subes de nivel participando activamente: dando valoraciones, invitando amigos, 
              y contribuyendo a la comunidad. Hay 6 niveles desde Novato hasta Leyenda.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Qué hago si recibo una valoración injusta?</Text>
            <Text style={styles.faqAnswer}>
              Puedes reportar valoraciones mediante el sistema de ayuda. Cada caso se revisa 
              individualmente. Además, las valoraciones extremas se promedian con el tiempo.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Por qué necesito verificar mi email?</Text>
            <Text style={styles.faqAnswer}>
              La verificación de email ayuda a prevenir cuentas falsas y spam, manteniendo 
              la comunidad segura y confiable.
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>¿Listo para empezar?</Text>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.footerButtonText}>Crear Cuenta Gratis</Text>
          </TouchableOpacity>
          
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/help')}>
              <Text style={styles.footerLink}>Ayuda</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>•</Text>
            <TouchableOpacity onPress={() => {
              // TODO: Añadir link a política de privacidad
              alert('Política de Privacidad');
            }}>
              <Text style={styles.footerLink}>Privacidad</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>•</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/help')}>
              <Text style={styles.footerLink}>Contacto</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerCopyright}>
            © 2025 DriveSkore - TFM Universidad de Huelva
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ========================================
  // VERSIÓN MÓVIL - HOME SCREEN
  // ========================================
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚗</Text>
          <Text style={styles.title}>DriveSkore</Text>
          <Text style={styles.subtitle}>Evalúa conductores, mejora las carreteras</Text>
        </View>

        {/* Vehículo activo */}
        {!loading && activeVehicle && (
          <View style={styles.activeVehicleCard}>
            <Text style={styles.activeVehicleTitle}>🟢 Vehículo emparejado</Text>
            <Text style={styles.activeVehiclePlate}>{activeVehicle.plate}</Text>
            {activeVehicle.nickname && (
              <Text style={styles.activeVehicleNickname}>{activeVehicle.nickname}</Text>
            )}
            <Text style={styles.activeVehicleSubtext}>
              Apareces en búsquedas con esta matrícula
            </Text>
          </View>
        )}

        {/* Acciones Rápidas */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/driver-mode')}
          >
            <Text style={styles.actionIcon}>🚗</Text>
            <Text style={styles.actionTitle}>Modo Conductor</Text>
            <Text style={styles.actionDescription}>
              Activa tracking y captura
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/pending')}
          >
            <Text style={styles.actionIcon}>⏳</Text>
            <Text style={styles.actionTitle}>Eventos</Text>
            <Text style={styles.actionDescription}>
              Valora capturas pendientes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionTitle}>Buscar</Text>
            <Text style={styles.actionDescription}>
              Consulta conductores
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gestión de Vehículos */}
        <TouchableOpacity 
          style={styles.vehicleManagementCard}
          onPress={() => router.push('/vehicles')}
        >
          <Text style={styles.vehicleManagementIcon}>🚙</Text>
          <View style={styles.vehicleManagementContent}>
            <Text style={styles.vehicleManagementTitle}>Gestionar Vehículos</Text>
            <Text style={styles.vehicleManagementDescription}>
              Añade o activa tus matrículas
            </Text>
          </View>
          <Text style={styles.vehicleManagementArrow}>→</Text>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Cómo usar DriveSkore</Text>
          <Text style={styles.infoText}>
            1. Activa el Modo Conductor cuando empieces a circular{'\n'}
            2. Captura eventos con el botón flotante o mando Bluetooth{'\n'}
            3. Valora los eventos pendientes cuando termines{'\n'}
            4. Consulta perfiles de conductores antes de compartir vehículo
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Versión 1.0.0 - Piloto Campus UHU
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  // ===== ESTILOS MÓVIL =====
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  activeVehicleCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  activeVehicleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  activeVehiclePlate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  activeVehicleNickname: {
    fontSize: 16,
    color: '#388E3C',
    marginBottom: 8,
  },
  activeVehicleSubtext: {
    fontSize: 12,
    color: '#66BB6A',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  vehicleManagementCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleManagementIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  vehicleManagementContent: {
    flex: 1,
  },
  vehicleManagementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  vehicleManagementDescription: {
    fontSize: 14,
    color: '#666',
  },
  vehicleManagementArrow: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

  // ===== ESTILOS WEB - LANDING PAGE =====
  landingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  heroSection: {
    backgroundColor: '#007AFF',
    padding: 60,
    alignItems: 'center',
    // ✅ Imagen de fondo local
    ...(Platform.OS === 'web' && {
      minHeight: 600,
      position: 'relative',
    }),
  },
  heroLogo: {
    fontSize: 80,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 24,
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: 600,
    marginBottom: 40,
  },
  downloadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginBottom: 20,
  },
  qrPlaceholder: {
    backgroundColor: '#FFF',
    width: 180,
    height: 180,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrIcon: {
    fontSize: 60,
    marginBottom: 8,
  },
  qrText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  qrSubtext: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  downloadButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  downloadButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  loginButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    padding: 60,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  sectionHighlight: {
    backgroundColor: '#FFF9E6',
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 26,
    marginBottom: 16,
    textAlign: 'center',
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 20,
    width: 50,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  prizeCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  prizeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  prizeValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  benefitsList: {
    marginTop: 24,
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  faqItem: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  faqAnswer: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  footerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  footerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 32,
  },
  footerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  footerLink: {
    fontSize: 14,
    color: '#007AFF',
  },
  footerSeparator: {
    fontSize: 14,
    color: '#999',
  },
  footerCopyright: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

  // ===== ESTILOS WEB - LOGGED IN =====
  webContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  webLoggedInContent: {
    padding: 40,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  webHeader: {
    marginBottom: 40,
  },
  webHeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  webHeaderSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  webQuickActions: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 40,
  },
  webActionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    cursor: 'pointer',
  },
  webActionIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  webActionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  webActionDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  webInfoBox: {
    backgroundColor: '#E3F2FD',
    padding: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  webInfoIcon: {
    fontSize: 32,
  },
  webInfoText: {
    flex: 1,
    fontSize: 15,
    color: '#1565C0',
    lineHeight: 22,
  },
});
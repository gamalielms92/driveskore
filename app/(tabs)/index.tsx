// app/(tabs)/index.tsx
// ✅ LANDING PAGE COMPLETA para Web + Home para Móvil
// ✅ PARALLAX FUNCIONANDO CORRECTAMENTE

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/config/supabase';
import type { Vehicle } from '../../src/types/vehicle';
import { getVehicleDescription, getVehicleDisplayName, getVehicleIcon } from '../../src/utils/vehicleHelpers';

// Componente helper para crear secciones con parallax
interface ParallaxSectionProps {
  children: React.ReactNode;
  backgroundImage: string;
  overlayColor?: string;
  minHeight?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const videoRef = useRef<Video>(null);

  const loadActiveVehicle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoggedIn(false);
        setActiveVehicle(null);
        return;
      }
  
      setIsLoggedIn(true);
  
      // Buscar vehículo activo
      const { data: vehicle } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('online', true)
        .maybeSingle();
  
      setActiveVehicle(vehicle);
      console.log('🔄 Vehículo activo recargado:', vehicle?.plate || vehicle?.nickname || 'ninguno');
      
    } catch (error) {
      console.error('Error cargando vehículo activo:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // ✅ CLAVE: CSS para parallax real
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Añadir estilos CSS para parallax
      const style = document.createElement('style');
      style.innerHTML = `
        .parallax-section {
          position: relative;
          min-height: 600px;
          background-attachment: fixed !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          background-size: cover !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .parallax-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
        }
        
        .parallax-content {
          position: relative;
          z-index: 2;
          max-width: 1000px;
          width: 100%;
          padding: 60px 20px;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Añadir useFocusEffect después del useEffect existente:
useFocusEffect(
  useCallback(() => {
    console.log('🏠 Index enfocado - Recargando vehículo activo...');
    if (Platform.OS !== 'web') {
      loadActiveVehicle();
    }
  }, [])
);

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

  // ✅ COMPONENTE PARALLAX CORREGIDO - USA className en vez de style inline
  const ParallaxSection: React.FC<ParallaxSectionProps> = ({ 
    children, 
    backgroundImage, 
    overlayColor = 'rgba(0, 0, 0, 0.5)', 
    minHeight = 600 
    }) => {
      if (Platform.OS !== 'web') {
        return <View style={{ padding: 60 }}>{children}</View>;
      }
    return (
      <div 
        className="parallax-section"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          minHeight: `${minHeight}px`,
        }}
      >
        <div 
          className="parallax-overlay"
          style={{
            backgroundColor: overlayColor,
          }} 
        />
        
        <div className="parallax-content">
          {children}
        </div>
      </div>
    );
  };

  // ========================================
  // COMPONENTE MODAL DE VIDEO
  // ========================================
  const VideoModal = () => (
    <Modal
      visible={showVideoModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setShowVideoModal(false);
        videoRef.current?.pauseAsync();
      }}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity 
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => {
            setShowVideoModal(false);
            videoRef.current?.pauseAsync();
          }}
        />
        
        <View style={styles.videoContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              setShowVideoModal(false);
              videoRef.current?.pauseAsync();
            }}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          
          <Video
            ref={videoRef}
            source={{ uri: 'https://driveskore.vercel.app/instalacion.mp4' }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
          />
        </View>
      </View>
    </Modal>
  );

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
                      <View style={{ alignItems: 'center' }}>
          <img 
            src="/logo.svg"
            alt="DriveSkore Logo"
            style={{
              width: '100%',
              maxWidth: '1000px',
              height: 'auto',
              marginBottom: '24px',
              //filter: 'brightness(0) invert(1)',  // Hace el logo blanco
            }}
          />
            
              <Text style={styles.webHeaderTitle}>¡Bienvenido a DriveSkore!</Text>
              <Text style={styles.webHeaderSubtitle}>
                Usa los tabs de navegación para explorar la plataforma
              </Text>
            </View>
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

  // ========================================
  // 🏠 LANDING PAGE CON PARALLAX
  // ========================================

  // Sino está logueado, muestra el landing page:
  return (
    <ScrollView style={styles.landingContainer}>
      
      {/* ========== 1. HERO SECTION ========== */}
      <ParallaxSection 
        backgroundImage="/hero.jpg"
        overlayColor="rgba(0, 122, 255, 0.75)"
        minHeight={700}
      >
        <View style={{ alignItems: 'center' }}>
          <img 
            src="/logo.svg"
            alt="DriveSkore Logo"
            style={{
              width: '100%',
              maxWidth: '1000px',
              height: 'auto',
              marginBottom: '24px',
              filter: 'brightness(0) invert(1)',  // Hace el logo blanco
            }}
          />
          <Text style={styles.heroSubtitle}>
            Evalúa conductores, mejora la seguridad vial
          </Text>
          <Text style={styles.heroDescription}>
            Una comunidad que valora y promueve la conducción responsable
          </Text>

          {/* QR y Descarga */}
          <View style={styles.downloadSection}>
            {/* QR Code */}
            <TouchableOpacity 
              onPress={async () => {
                const url = 'https://github.com/gamalielms92/driveskore/releases/download/v1.0.0-beta/DriveSkore_v.1.0.0-beta.apk';
                
                try {
                  const supported = await Linking.canOpenURL(url);
                  if (supported) {
                    await Linking.openURL(url);
                  } else {
                    alert('No se puede abrir el enlace. Visita: https://github.com/gamalielms92/driveskore/releases/tag/v1.0.0-beta');
                  }
                } catch (error) {
                  console.error('Error abriendo enlace:', error);
                  alert('Error al abrir descarga');
                }
              }}
            >
              <View style={styles.qrContainer}>
                <Image
                  source={require('../../assets/images/qr.png')}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>

           {/* Botón de ayuda de instalación */}
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => setShowVideoModal(true)}
            >
              <Ionicons name="play-circle" size={24} color="#FFF" />
              <Text style={styles.helpButtonText}>¿Cómo instalar la app?</Text>
            </TouchableOpacity>
            {/* Modal de video */}
            <VideoModal />

            {/* Botón de Descarga Directa */}
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={async () => {
                const url = 'https://github.com/gamalielms92/driveskore/releases/download/v1.0.0-beta/DriveSkore_v.1.0.0-beta.apk';
                
                try {
                  const supported = await Linking.canOpenURL(url);
                  if (supported) {
                    await Linking.openURL(url);
                  } else {
                    alert('No se puede abrir el enlace');
                  }
                } catch (error) {
                  console.error('Error:', error);
                  alert('Error al abrir descarga');
                }
              }}
            >
              <Text style={styles.downloadButtonText}>📥 Descargar APK</Text>
            </TouchableOpacity>

            {/* GitHub Link */}
            <TouchableOpacity
              style={styles.githubLink}
              onPress={async () => {
                const githubUrl = 'https://github.com/gamalielms92/driveskore/releases/tag/v1.0.0-beta';
                try {
                  await Linking.openURL(githubUrl);
                } catch (error) {
                  console.error('Error abriendo GitHub:', error);
                }
              }}
            >
              <Image
                source={require('../../assets/images/github-mark-white.png')}
                style={styles.githubIcon}
                resizeMode="contain"
              />
              <Text style={styles.githubText}>Ver en GitHub</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>v1.0.0-beta · Piloto Campus UHU</Text>
            </View>
          </View>
      </ParallaxSection>

      {/* ========== 2. ¿QUÉ ES DRIVESKORE? ========== */}
      <ParallaxSection 
        backgroundImage="/whatis.jpeg"
        overlayColor="rgba(255, 255, 255, 0.8)"
        minHeight={500}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué es DriveSkore?</Text>
          <Text style={[styles.sectionText, { color: '#333' }]}>
            DriveSkore es una aplicación móvil que permite a la comunidad evaluar el comportamiento 
            de conductores mediante un algoritmo de proximidad.
          </Text>
          <Text style={[styles.sectionText, { color: '#333' }]}>
            Nuestro objetivo es aspirar a transformar la cultura vial mediante la aplicación del concepto de "aldea global digital", donde los conductores son conscientes de que sus acciones son observables y evaluables por la comunidad.
          </Text>
          <Text style={[styles.sectionSubTitle, { color: '#333' }]}>
            Misión
          </Text>
          <Text style={[styles.sectionText, { color: '#333' }]}>
            Aportar los conocimientos tecnológicos y empresariales necesarios para desarrollar e implementar soluciones innovadoras que mejoren la vida de las personas, centrándose en la seguridad vial mediante la aplicación de tecnologías de evaluación social y gamificación.
          </Text>
          <Text style={[styles.sectionSubTitle, { color: '#333' }]}>
            Visión
          </Text>
          <Text style={[styles.sectionText, { color: '#333' }]}>
            Hacer que los ciudadanos del planeta conduzcan de manera más segura, cortés y responsable gracias al concepto de la "aldea global digital", donde las personas no son anónimas y están motivadas a comportarse de manera ejemplar, creando así una cultura vial global basada en el respeto mutuo y la responsabilidad compartida.
          </Text>
          <Text style={[styles.sectionSubTitle, { color: '#333' }]}>
            Valores Fundamentales
          </Text>
          <Text style={[styles.sectionText, { color: '#333' }]}>
            Honestidad: Transparencia total en el funcionamiento del sistema, protección contra manipulaciones y valoraciones falsas, comunicación clara sobre el uso de datos.
          </Text>
          <Text style={[styles.sectionText, { color: '#333' }]}>
            Cuidado del Planeta: Reducción de accidentes y congestión se tráfico que contribuye a menor contaminación. Promoción de conducción eficiente que reduce emisiones.
          </Text>
          <Text style={[styles.sectionText, { color: '#333' }]}>
            Tratar al Prójimo como a Ti Mismo: Fomentar la empatía y cortesía en la carretera. Crear una comunidad que se cuida mutuamente. Promover el respeto por todos los usuarios de la vía (conductores, ciclistas, peatones).
          </Text>
        </View>
      </ParallaxSection>

      {/* ========== 3. ¿CÓMO FUNCIONA? ========== */}
      <ParallaxSection 
        backgroundImage="/howitwork.jpg"
        overlayColor="rgba(0, 0, 0, 0.8)"
        minHeight={800}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFF' }]}>¿Cómo funciona?</Text>
          
          {[
            { num: '1', icon: '📱', title: 'Descarga la App', text: 'Disponible para Android (en iOS próximanente). Regístrate con tu email.' },
            { num: '2', icon: '🚗', title: 'Registra tu Vehículo', text: 'Añade tu vehículo para recibir valoraciones y votar a los demás.' },
            { num: '3', icon: '🎮', title: 'Captura Eventos', text: 'Configura el botón flotante o el mando Bluetooth.' },
            { num: '4', icon: '⭐', title: 'Valora Conductores', text: 'Puntúa comportamientos entre 0 y 5 estrellas.' },
            { num: '5', icon: '🏆', title: 'Sube de Nivel', text: 'Sube de nivel, desbloquea logros y consigue beneficios.' },
          ].map((step) => (
            <View key={step.num} style={styles.stepCard}>
              <Text style={styles.stepNumber}>{step.num}</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.icon} {step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ParallaxSection>

      {/* ========== 4. SORTEO DEL PILOTO ========== */}
      <ParallaxSection 
        backgroundImage="/raffle.jpg"
        overlayColor="rgba(255, 193, 7, 0.8)"
        minHeight={600}
      >
        <View style={[styles.section, styles.sectionHighlight]}>
          <Text style={[styles.sectionTitle, { color: '#000' }]}>🎁 Sorteo</Text>
          <Text style={[styles.sectionText, { color: '#000' }]}>
            Durante nuestro programa de pruebas, ¡puedes ganar un premio!
          </Text>
          
          <View style={styles.prizeCard}>
            <Text style={styles.prizeLabel}>📅 Fecha del sorteo:</Text>
            <Text style={styles.prizeValue}>9-12 de Diciembre 2025, aún por concretar.</Text>
          </View>

          <View style={styles.prizeCard}>
            <Text style={styles.prizeLabel}>🎟️ Cómo participar:</Text>
            <Text style={styles.prizeValue}>
              Invita a tus amigos, con tu código único, durante el periodo de pruebas. 
              Por cada uno que verifique su email, ganas 1 papeleta. 
              ¡Con 10 amigos te conviertes en Embajador y ganas 5 papeletas extra.
              El sorteo estará vigente hasta el 7 de diciembre de 2025. 
              En cuanto tengamos más información, lo publicaremos en esta sección.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.ctaButtonText}>¡Quiero participar!</Text>
          </TouchableOpacity>
        </View>
      </ParallaxSection>

      {/* ========== 5. SISTEMA DE REFERIDOS ========== */}
      <ParallaxSection 
        backgroundImage="/referral.jpg"
        overlayColor="rgba(52, 152, 219, 0.8)"
        minHeight={500}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFF' }]}>👥 Invita a tus amigos</Text>
          <Text style={[styles.sectionText, { color: '#FFF' }]}>
            Cada usuario tiene un código único de invitación. Compártelo con amigos 
            para que se unan a la comunidad.
          </Text>

          <View style={styles.benefitsList}>
            {[
              { icon: '✅', text: 'Gana papeletas para el sorteo del piloto' },
              { icon: '👑', text: 'Conviértete en Embajador con 10 referidos' },
              { icon: '🏆', text: 'Desbloquea insignias especiales' },
              { icon: '📊', text: 'Sube posiciones en el ranking global' },
            ].map((benefit, idx) => (
              <View key={idx} style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                <Text style={[styles.benefitText, { color: '#FFF' }]}>{benefit.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ParallaxSection>

      {/* ========== 6. FAQ ========== */}
      <ParallaxSection 
        backgroundImage="/faq.jpg"
        overlayColor="rgba(255, 255, 255, 0.8)"
        minHeight={700}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Preguntas Frecuentes</Text>

          {[
            {
              q: '¿Es gratis DriveSkore?',
              a: 'Sí, DriveSkore es completamente gratuito para todos los usuarios.'
            },
            {
              q: '¿Cómo se protege mi privacidad?',
              a: 'Cumplimos con GDPR. Las fotos de perfil son opcionales, no mostramos matrículas en perfiles públicos sin el consentimiento y puedes controlar qué información compartes.'
            },
            {
              q: '¿Puedo valorar mi propia conducción?',
              a: 'No. El sistema bloquea autoevaluaciones para garantizar valoraciones imparciales.'
            },
            {
              q: '¿Cómo funciona el sistema de niveles?',
              a: 'Subes de nivel participando activamente: dando valoraciones, invitando amigos y contribuyendo a la comunidad. Hay 6 niveles desde Novato hasta Leyenda.'
            },
            {
              q: '¿El sistemas de beneficios funciona?',
              a: 'Actualmente no, porque estamos en periodo de pruebas, pero depende completamente de vosotros que se haga realidad, "Juntos podemos lograrlo" Con una base de usuarios consolidada, los beneficios se convierten en activos negociables con terceros'
            },
            {
              q: '¿Pero el sorteo es real?',
              a: 'Sí, eso si se llevará a cabo. Lo que no está claro, actualmente, es la fecha exacta y el premio, estamos en proceso de negociación.'
            },
          ].map((faq, idx) => (
            <View key={idx} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </View>
      </ParallaxSection>

      {/* ========== FOOTER CON IMAGEN ========== */}
    <div style={{
      position: 'relative',
      height: '400px',  // ✅ Altura fija pequeña
      width: '100%',    // ✅ Ancho completo
      padding: '80px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'url("/header.jpg")',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    }}>
      {/* Overlay azul */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 123, 255, 0.8)',
        zIndex: 1,
      }} />
      
      {/* Contenido */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '800px',
      }}>
        <Text style={[styles.footerTitle, { color: '#FFF' }]}>¿Listo para empezar?</Text>
        <TouchableOpacity 
          style={[styles.footerButton, { backgroundColor: '#FFF', borderWidth: 0 }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={[styles.footerButtonText, { color: '#007AFF' }]}>Crear Cuenta Gratis</Text>
        </TouchableOpacity>
        
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/help')}>
            <Text style={[styles.footerLink, { color: '#FFF' }]}>Ayuda</Text>
          </TouchableOpacity>
          <Text style={[styles.footerSeparator, { color: 'rgba(255,255,255,0.6)' }]}>•</Text>

          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={[styles.footerLink, { color: '#FFF' }]}>Política de Privacidad</Text>
          </TouchableOpacity>

          <Text style={[styles.footerSeparator, { color: 'rgba(255,255,255,0.6)' }]}>•</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/help')}>
            <Text style={[styles.footerLink, { color: '#FFF' }]}>Contacto</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerCopyright, { color: 'rgba(255,255,255,0.9)' }]}>
          © 2025 DriveSkore - TFM Ingeniería Informática - Universidad de Huelva
        </Text>
      </div>
    </div>
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
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Evalúa conductores, mejora las carreteras</Text>
        </View>

{/* Vehículo activo */}
{!loading && activeVehicle && (
  <View style={styles.activeVehicleCard}>
    <Text style={styles.activeVehicleTitle}>
      {getVehicleIcon(activeVehicle.vehicle_type)} Vehículo activo
    </Text>
    <Text style={styles.activeVehiclePlate}>
      {getVehicleDescription(activeVehicle)}
    </Text>
    <Text style={styles.activeVehicleIdentifier}>
      {getVehicleDisplayName(activeVehicle)}
    </Text>
    {activeVehicle.nickname && activeVehicle.brand && (
      <Text style={styles.activeVehicleNickname}>"{activeVehicle.nickname}"</Text>
    )}
    <Text style={styles.activeVehicleSubtext}>
      Necesario para recibir valoraciones en tu perfil
    </Text>
  </View>
)}

        {/* BOTÓN MODO CONDUCTOR */}
        <TouchableOpacity
          style={styles.drivingModeButton}
          onPress={() => router.push('/driver-mode')}
        >
          <Text style={styles.drivingModeIcon}>🔘</Text>
          <View style={styles.drivingModeContent}>
            <Text style={styles.drivingModeTitle}>MODO CONDUCTOR</Text>
            <Text style={styles.drivingModeSubtitle}>
              Activa GPS y botón de captura
            </Text>
          </View>
        </TouchableOpacity>

        {/* Gestión de Vehículos */}
        <TouchableOpacity 
          style={styles.vehicleManagementCard}
          onPress={() => router.push('/raffle')}
        >
          <Text style={styles.vehicleManagementIcon}>📣</Text>
          <View style={styles.vehicleManagementContent}>
            <Text style={styles.vehicleManagementTitle}>¡Novedades!</Text>
            <Text style={styles.vehicleManagementDescription}>
              ¡Sorteo en juego!
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
            4. Ayuda a crear una comunidad de conductores responsables
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DriveSkore - Conducción colaborativa y segura
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
  logoImage: {
    width: 280,
    height: 80,
    marginBottom: 10,
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
  activeVehicleIdentifier: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
  },
  drivingModeButton: {
    backgroundColor: '#007AFF',
    padding: 25,
    borderRadius: 20,
    marginBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  drivingModeIcon: {
    fontSize: 50,
    marginRight: 20,
  },
  drivingModeContent: {
    flex: 1,
  },
  drivingModeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  drivingModeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
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
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
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
    width: 250,
    marginBottom: 30,
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
    marginTop: 30,
    marginBottom: 30,
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
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionSubTitle: {
    fontSize: 24,
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
    maxWidth: 400,
    alignSelf: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  qrContainer: {
    alignItems: 'center',
    marginTop: 34,
    marginBottom: 34,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  githubLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  githubIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  githubText: {
    fontSize: 14,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  // ===== MODAL DE VIDEO =====
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  videoContainer: {
    width: '40%',
    height: '90%',  
    backgroundColor: '#000',
    alignSelf: 'center',
    justifyContent: 'center',  
    alignItems: 'center', 
  },
  video: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',     // ✅ Centra el video
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 24,
    padding: 8,
  },
});
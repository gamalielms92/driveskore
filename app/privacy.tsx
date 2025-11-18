// app/privacy.tsx
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      {/* Header con botón volver */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>POLÍTICA DE PRIVACIDAD</Text>
        <Text style={styles.subtitle}>DriveSkore</Text>
        <Text style={styles.date}>Última actualización: 18 de noviembre de 2025</Text>
        <Text style={styles.institution}>Universidad de Huelva - Trabajo Fin de Máster</Text>

        {/* Sección 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>1.</Text>
          <Text style={styles.sectionTitle}>RESPONSABLE DEL TRATAMIENTO</Text>
        </View>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Identidad:</Text> DriveSkore (Proyecto Académico TFM){'\n'}
          <Text style={styles.bold}>Responsable:</Text> [Gamaliel Moreno Sánchez]{'\n'}
          <Text style={styles.bold}>Universidad:</Text> Universidad de Huelva{'\n'}
          <Text style={styles.bold}>Contacto:</Text> [gamaliel.moreno@alu.uhu.es]{'\n'}
          <Text style={styles.bold}>Finalidad:</Text> Proyecto de ingeniería Informática (Trabajo Fin de Máster)
        </Text>

        {/* Sección 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>2.</Text>
          <Text style={styles.sectionTitle}>PRINCIPIOS DEL TRATAMIENTO</Text>
        </View>
        <Text style={styles.paragraph}>
          DriveSkore trata tus datos personales conforme al <Text style={styles.bold}>Reglamento (UE) 2016/679 (RGPD)</Text> y la <Text style={styles.bold}>Ley Orgánica 3/2018 de Protección de Datos (LOPDGDD)</Text>, garantizando:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Licitud y transparencia:</Text> Solo tratamos datos con tu consentimiento explícito.</Text>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Minimización:</Text> Solo recopilamos datos estrictamente necesarios.</Text>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Exactitud:</Text> Puedes modificar tus datos en cualquier momento.</Text>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Limitación de conservación:</Text> Datos eliminados tras finalizar el piloto académico.</Text>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Integridad y confidencialidad:</Text> Cifrado SSL/TLS y almacenamiento seguro.</Text>
        </View>

        {/* Sección 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>3.</Text>
          <Text style={styles.sectionTitle}>DATOS QUE RECOPILAMOS</Text>
        </View>

        <Text style={styles.subsectionTitle}>3.1. Datos obligatorios (registro)</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Email</Text> (autenticación y comunicación)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Nombre completo</Text> (identificación en la app)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Contraseña</Text> (cifrada con bcrypt)</Text>
        </View>

        <Text style={styles.subsectionTitle}>3.2. Datos opcionales (voluntarios)</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Foto de perfil</Text> (puedes usar avatar por defecto)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Matrícula(s) de vehículo(s)</Text> (solo si es un coche o una moto)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Foto del vehículo</Text> (solo si quieres valorar y ser valorado)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Nivel de conductor</Text> (según sistema de puntos interno)</Text>
        </View>

        <Text style={styles.subsectionTitle}>3.3. Datos generados automáticamente</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Valoraciones</Text> realizadas/recibidas</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Código de referidos</Text> (sistema de invitaciones)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Fecha de registro</Text> y última actividad</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Ubicación GPS</Text> (solo cuando usas captura en tiempo real)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Datos técnicos:</Text> Tipo de dispositivo, versión de app, IP</Text>
        </View>

        {/* Sección 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>4.</Text>
          <Text style={styles.sectionTitle}>FINALIDAD DEL TRATAMIENTO</Text>
        </View>
        <Text style={styles.paragraph}>Utilizamos tus datos exclusivamente para:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Gestión de cuenta:</Text> Registro, autenticación y perfil</Text>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Funcionalidad de la app:</Text> Sistema de valoraciones y ranking</Text>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Sistema cerrado:</Text> Solo usuarios registrados pueden ser valorados</Text>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Sistema de referidos:</Text> Código de invitación y programa Embajador</Text>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Sorteo:</Text> Participación en sorteo (7 dic 2025)</Text>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Análisis académico:</Text> Estadísticas anónimas para el TFM</Text>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Mejora del servicio:</Text> Feedback y corrección de errores</Text>
          <Text style={styles.bulletItem}>📌 <Text style={styles.bold}>Comunicaciones:</Text> Notificaciones sobre actualizaciones y sorteo</Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            <Text style={styles.bold}>NO vendemos, alquilamos ni cedemos tus datos a terceros con fines comerciales.</Text>
          </Text>
        </View>

        {/* Sección 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>5.</Text>
          <Text style={styles.sectionTitle}>BASE LEGAL DEL TRATAMIENTO</Text>
        </View>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Consentimiento explícito</Text> (Art. 6.1.a RGPD): Al registrarte y aceptar esta política</Text>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Interés legítimo</Text> (Art. 6.1.f RGPD): Prevención de fraude y seguridad</Text>
          <Text style={styles.bulletItem}>✅ <Text style={styles.bold}>Cumplimiento contractual</Text> (Art. 6.1.b RGPD): Prestación del servicio</Text>
        </View>

        {/* Sección 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>6.</Text>
          <Text style={styles.sectionTitle}>DESTINATARIOS DE LOS DATOS</Text>
        </View>

        <Text style={styles.subsectionTitle}>6.1. Proveedores tecnológicos</Text>
        <View style={styles.providerBox}>
          <Text style={styles.providerItem}>🔹 <Text style={styles.bold}>Supabase</Text> (Supabase Inc., EE.UU.): Base de datos [Cláusulas UE]</Text>
          <Text style={styles.providerItem}>🔹 <Text style={styles.bold}>Firebase</Text> (Google LLC, EE.UU.): Analytics [Privacy Shield]</Text>
          <Text style={styles.providerItem}>🔹 <Text style={styles.bold}>Vercel</Text> (Vercel Inc., EE.UU.): Hosting landing</Text>
          <Text style={styles.providerItem}>🔹 <Text style={styles.bold}>OCR.space</Text> (A9t9 GmbH, Austria - UE): OCR matrículas</Text>
          <Text style={styles.providerItem}>🔹 <Text style={styles.bold}>Formspree</Text> (Formspree LLC, EE.UU.): Feedback</Text>
        </View>

        <Text style={styles.subsectionTitle}>6.2. Otros usuarios (limitado)</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Tu <Text style={styles.bold}>nombre</Text> y <Text style={styles.bold}>puntuación</Text> son visibles en rankings</Text>
          <Text style={styles.bulletItem}>• Tu <Text style={styles.bold}>matrícula NUNCA</Text> es visible en tu perfil público sin tu consentimiento</Text>
        </View>

        {/* Sección 7 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>7.</Text>
          <Text style={styles.sectionTitle}>TRANSFERENCIAS INTERNACIONALES</Text>
        </View>
        <Text style={styles.paragraph}>
          Algunos datos se almacenan en servidores fuera de la UE (EE.UU.), protegidos mediante:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>✅ Cláusulas Contractuales Tipo de la Comisión Europea</Text>
          <Text style={styles.bulletItem}>✅ Certificación Privacy Shield (cuando aplica)</Text>
          <Text style={styles.bulletItem}>✅ Cifrado SSL/TLS en tránsito</Text>
        </View>

        {/* Sección 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>8.</Text>
          <Text style={styles.sectionTitle}>PLAZO DE CONSERVACIÓN</Text>
        </View>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Durante el piloto:</Text> Datos activos mientras uses la app</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Fin del piloto</Text> (31 de diciembre 2025): Datos personales eliminados en 30 días</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Estadísticas anónimas:</Text> Conservadas para el TFM (sin identificadores)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Derecho de supresión:</Text> Puedes eliminar tu cuenta en cualquier momento</Text>
        </View>

        {/* Sección 9 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>9.</Text>
          <Text style={styles.sectionTitle}>TUS DERECHOS (RGPD)</Text>
        </View>
        <Text style={styles.paragraph}>
          Puedes ejercer estos derechos enviando email a <Text style={styles.email}>[gamaliel.moreno@alu.uhu.es]</Text>:
        </Text>
        <View style={styles.rightsBox}>
          <Text style={styles.rightItem}>🔹 <Text style={styles.bold}>Acceso:</Text> Solicitar copia de tus datos</Text>
          <Text style={styles.rightItem}>🔹 <Text style={styles.bold}>Rectificación:</Text> Corregir datos inexactos</Text>
          <Text style={styles.rightItem}>🔹 <Text style={styles.bold}>Supresión</Text> ("derecho al olvido"): Eliminar tu cuenta</Text>
          <Text style={styles.rightItem}>🔹 <Text style={styles.bold}>Oposición:</Text> Oponerte a ciertos tratamientos</Text>
          <Text style={styles.rightItem}>🔹 <Text style={styles.bold}>Portabilidad:</Text> Recibir tus datos (JSON/CSV)</Text>
          <Text style={styles.rightItem}>🔹 <Text style={styles.bold}>Limitación:</Text> Restringir el procesamiento</Text>
          <Text style={styles.rightItem}>🔹 <Text style={styles.bold}>Reclamación:</Text> Queja ante la AEPD → www.aepd.es</Text>
        </View>
        <Text style={styles.highlight}>Respuesta garantizada en 30 días.</Text>

        {/* Sección 10 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>10.</Text>
          <Text style={styles.sectionTitle}>SEGURIDAD DE LOS DATOS</Text>
        </View>
        <View style={styles.securityBox}>
          <Text style={styles.securityItem}>🔒 <Text style={styles.bold}>Cifrado:</Text> SSL/TLS en tránsito, contraseñas hasheadas (bcrypt)</Text>
          <Text style={styles.securityItem}>🔒 <Text style={styles.bold}>Acceso restringido:</Text> Solo personal autorizado</Text>
          <Text style={styles.securityItem}>🔒 <Text style={styles.bold}>Auditorías:</Text> Logs de acceso y monitorización</Text>
          <Text style={styles.securityItem}>🔒 <Text style={styles.bold}>Backups:</Text> Copias de seguridad cifradas</Text>
        </View>

        {/* Sección 11 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>11.</Text>
          <Text style={styles.sectionTitle}>COOKIES Y TECNOLOGÍAS</Text>
        </View>
        <Text style={styles.subsectionTitle}>11.1. Landing page</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Cookies técnicas:</Text> Necesarias para navegación</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Firebase Analytics:</Text> Estadísticas anónimas</Text>
        </View>
        <Text style={styles.subsectionTitle}>11.2. App móvil</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>No usa cookies</Text> (app nativa)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Firebase Analytics:</Text> Eventos anónimos (crashlytics)</Text>
        </View>

        {/* Sección 12 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>12.</Text>
          <Text style={styles.sectionTitle}>MENORES DE EDAD</Text>
        </View>
        <View style={styles.ageBox}>
          <Text style={styles.ageIcon}>🔞</Text>
          <View style={styles.ageContent}>
            <Text style={styles.ageText}>
              DriveSkore está destinado a <Text style={styles.bold}>mayores de 18 años</Text>.
              {'\n\n'}
              Si detectamos usuarios menores:
              {'\n'}1. Suspensión inmediata de cuenta
              {'\n'}2. Solicitud de verificación de edad
              {'\n'}3. Eliminación de datos si no se acredita mayoría de edad
            </Text>
          </View>
        </View>

        {/* Sección 13 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>13.</Text>
          <Text style={styles.sectionTitle}>CAMBIOS EN ESTA POLÍTICA</Text>
        </View>
        <Text style={styles.paragraph}>Te notificaremos cambios mediante:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>📧 Email (cambios sustanciales)</Text>
          <Text style={styles.bulletItem}>📱 Notificación in-app</Text>
          <Text style={styles.bulletItem}>🌐 Aviso en landing page</Text>
        </View>

        {/* Sección 14 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>14.</Text>
          <Text style={styles.sectionTitle}>ACEPTACIÓN</Text>
        </View>
        <View style={styles.acceptanceBox}>
          <Text style={styles.acceptanceText}>
            Al registrarte en DriveSkore:
            {'\n'}✅ Confirmas haber leído esta política
            {'\n'}✅ Consientes el tratamiento descrito
            {'\n'}✅ Eres mayor de 18 años
          </Text>
        </View>

        {/* Sección 15 */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>15.</Text>
          <Text style={styles.sectionTitle}>CONTACTO Y RECLAMACIONES</Text>
        </View>
        <View style={styles.contactBox}>
          <Text style={styles.contactItem}><Text style={styles.bold}>Email:</Text> [gamaliel.moreno@alu.uhu.es]</Text>
          <Text style={styles.contactItem}><Text style={styles.bold}>Respuesta:</Text> 30 días máximo</Text>
          <Text style={styles.contactItem}><Text style={styles.bold}>Reclamaciones AEPD:</Text> www.aepd.es</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>DriveSkore</Text>
          <Text style={styles.footerSubtitle}>Universidad de Huelva</Text>
          <Text style={styles.footerText}>Proyecto académico TFM · Conducción responsable</Text>
        </View>

         {/* ✅ BOTÓN VOLVER AL FINAL */}
         <TouchableOpacity 
          style={styles.bottomBackButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomBackIcon}>←</Text>
          <Text style={styles.bottomBackText}>Volver</Text>
        </TouchableOpacity>

        {/* Espaciado final para que el botón no quede pegado al borde */}
        <View style={{ height: 20 }} />

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 24,
    marginRight: 8,
  },
  backText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  institution: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 12,
  },
  sectionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  email: {
    color: '#007AFF',
    fontWeight: '600',
  },
  bulletList: {
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  
  // Cajas especiales
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    flexDirection: 'row',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#0D47A1',
    lineHeight: 22,
  },
  important: {
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningText: {
    fontSize: 15,
    color: '#E65100',
    flex: 1,
    lineHeight: 22,
  },
  
  providerBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  providerItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 6,
  },
  
  rightsBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  rightItem: {
    fontSize: 15,
    color: '#1B5E20',
    lineHeight: 24,
    marginBottom: 8,
  },
  
  highlight: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8,
  },
  
  securityBox: {
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  securityItem: {
    fontSize: 14,
    color: '#F57F17',
    lineHeight: 22,
    marginBottom: 6,
  },
  
  ageBox: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    flexDirection: 'row',
  },
  ageIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  ageContent: {
    flex: 1,
  },
  ageText: {
    fontSize: 14,
    color: '#C62828',
    lineHeight: 22,
  },
  
  acceptanceBox: {
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
    padding: 20,
    marginVertical: 12,
  },
  acceptanceText: {
    fontSize: 15,
    color: '#01579B',
    lineHeight: 24,
    fontWeight: '600',
  },
  
  contactBox: {
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  contactItem: {
    fontSize: 15,
    color: '#4A148C',
    lineHeight: 24,
    marginBottom: 6,
  },
  
  // Footer
  footer: {
    marginTop: 40,
    paddingTop: 30,
    paddingBottom: 20,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  footerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // ✅ ESTILOS DEL BOTÓN INFERIOR
  bottomBackButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBackIcon: {
    color: '#FFF',
    fontSize: 20,
    marginRight: 8,
    fontWeight: 'bold',
  },
  bottomBackText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export default function AuthSuccess() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image 
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.emoji}>✅</Text>
        
        <Text style={styles.title}>¡Email Confirmado!</Text>
        
        <Text style={styles.description}>
          Tu cuenta ha sido verificada correctamente.{'\n'}
          Ya puedes empezar a usar DriveSkore.
        </Text>
        
        <Pressable 
          style={styles.button}
          onPress={() => Linking.openURL('driveskore://')}
        >
          <Text style={styles.buttonText}>Abrir DriveSkore</Text>
        </Pressable>
        
        <Text style={styles.footerText}>
          ¿No tienes la app instalada?
        </Text>
        <Pressable onPress={() => Linking.openURL('https://driveskore.vercel.app')}>
          <Text style={styles.link}>Descárgala aquí</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#667eea', // Fallback para mobile
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
    elevation: 10,
  },
  logo: {
    width: 280,
    height: 80,
    marginBottom: 20,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
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
    marginBottom: 25,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 5,
  },
  link: {
    fontSize: 13,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
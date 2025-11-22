# Manual de Instalación y Configuración - DriveSkore

## 1. Información General

### 1.1 Descripción del Sistema
DriveSkore es una aplicación móvil multiplataforma desarrollada con React Native y Expo que permite la evaluación colaborativa del comportamiento de conductores.

### 1.2 Requisitos del Sistema

#### Hardware Mínimo
- **CPU**: Intel Core i5 o equivalente (4 cores)
- **RAM**: 8 GB mínimo (16 GB recomendado)
- **Almacenamiento**: 20 GB de espacio libre
- **GPU**: Compatible con aceleración de emulador Android

#### Sistemas Operativos Soportados
- Windows 10/11 (64-bit)
- macOS 10.15 Catalina o superior
- Ubuntu 20.04 LTS o superior

#### Dispositivos de Prueba
- Android 7.0 (API 24) o superior
- iOS 13.0 o superior (requiere Mac para desarrollo)
- AB Shutter 3 (opcional, para pruebas de Bluetooth)

## 2. Software Requerido

### 2.1 Herramientas Base

#### Node.js y npm
```bash
# Versión requerida: Node.js 18.x o superior
# Descargar desde: https://nodejs.org/

# Verificar instalación
node --version  # Debe mostrar v18.x.x o superior
npm --version   # Debe mostrar 9.x.x o superior
```

#### Git
```bash
# Descargar desde: https://git-scm.com/

# Verificar instalación
git --version  # Debe mostrar 2.x.x o superior
```

#### Visual Studio Code o Cursor IDE
```bash
# VS Code: https://code.visualstudio.com/
# Cursor: https://cursor.sh/

# Extensiones recomendadas:
- React Native Tools
- ESLint
- Prettier
- GitLens
- Thunder Client (para pruebas API)
```

### 2.2 Android Development

#### Java Development Kit (JDK)
```bash
# Instalar JDK 17 (requerido para Android)
# Windows: Descargar desde https://adoptium.net/
# macOS: brew install --cask temurin17
# Linux: sudo apt install openjdk-17-jdk

# Verificar instalación
java -version  # Debe mostrar version "17.x.x"
javac -version # Debe mostrar javac 17.x.x
```

#### Android Studio
```bash
# Descargar desde: https://developer.android.com/studio

# Durante la instalación, asegurarse de instalar:
- Android SDK
- Android SDK Platform 33 (Android 13.0)
- Android Virtual Device (AVD)
- Intel x86 Emulator Accelerator (HAXM installer)
```

#### Configuración de Variables de Entorno

**Windows:**
```powershell
# Agregar a las variables de entorno del sistema:
ANDROID_HOME = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.x.x

# Agregar al PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

**macOS/Linux:**
```bash
# Agregar a ~/.bashrc o ~/.zshrc:
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Aplicar cambios
source ~/.bashrc  # o source ~/.zshrc
```

### 2.3 iOS Development (solo macOS)

#### Xcode
```bash
# Instalar desde Mac App Store
# Versión mínima: Xcode 14.0

# Instalar herramientas de línea de comandos
xcode-select --install

# Aceptar licencia
sudo xcodebuild -license accept
```

## 3. Instalación del Proyecto

### 3.1 Clonar el Repositorio

```bash
# Clonar el repositorio
git clone https://github.com/gamalielms92/driveskore.git
cd driveskore

# O si tienes acceso SSH configurado
git clone git@github.com:gamalielms92/driveskore.git
cd driveskore
```

### 3.2 Instalar Dependencias

```bash
# Instalar todas las dependencias del proyecto
npm install

# Si hay problemas con las dependencias, limpiar caché
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

### 3.3 Configuración de Expo

```bash
# Instalar Expo CLI globalmente (opcional)
npm install -g expo-cli

# Instalar EAS CLI para builds
npm install -g eas-cli

# Login en Expo (crear cuenta en https://expo.dev si no tienes)
expo login

# Para EAS Build
eas login
```

## 4. Configuración del Entorno

### 4.1 Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://bnkjgviuqaliyhqbxbnv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OCR API Configuration
EXPO_PUBLIC_OCR_API_KEY=your_ocr_space_api_key_here
EXPO_PUBLIC_OCR_API_URL=https://api.ocr.space/parse/image

# Firebase Configuration (opcional si usas tu propio proyecto)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# App Configuration
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=development
```

### 4.2 Configuración de Supabase

#### Obtener Credenciales
1. Ir a https://supabase.com y crear cuenta
2. Crear nuevo proyecto
3. Ir a Settings → API
4. Copiar `URL` y `anon public` key

#### Configurar Base de Datos
```sql
-- Ejecutar estos scripts en el SQL Editor de Supabase
-- Los scripts completos están en /database/migrations/

-- 1. Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Ejecutar scripts de creación de tablas
-- Ver archivo: /database/migrations/001_create_tables.sql

-- 3. Configurar Row Level Security (RLS)
-- Ver archivo: /database/migrations/002_rls_policies.sql

-- 4. Crear funciones y triggers
-- Ver archivo: /database/migrations/003_functions.sql
```

### 4.3 Configuración de Firebase

1. Ir a https://console.firebase.google.com/
2. Crear nuevo proyecto o usar existente
3. Agregar app Android:
   - Package name: `com.driveskore.app`
   - Descargar `google-services.json`
   - Colocar en la raíz del proyecto

4. Habilitar servicios:
   - Analytics
   - Crashlytics
   - Cloud Messaging (opcional)

### 4.4 Configuración de OCR.space

1. Registrarse en https://ocr.space/ocrapi
2. Obtener API Key gratuita
3. Agregar key al archivo `.env`

## 5. Configuración de Android

### 5.1 Crear Emulador Android

```bash
# Abrir Android Studio
# Tools → AVD Manager → Create Virtual Device

# Configuración recomendada:
- Device: Pixel 5
- System Image: Android 13.0 (API 33)
- RAM: 2048 MB
- VM Heap: 256 MB
- Internal Storage: 2048 MB
```

### 5.2 Módulos Nativos Android

Los módulos nativos ya están incluidos en el proyecto:

```
android/app/src/main/java/com/driveskore/
├── FloatingButtonModule.kt    # Botón flotante
├── LocationModule.kt          # GPS en background
└── BluetoothModule.kt         # AB Shutter 3
```

### 5.3 Permisos Android

Ya configurados en `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

## 6. Ejecución del Proyecto

### 6.1 Desarrollo Local

#### Iniciar Metro Bundler
```bash
# Limpiar caché y iniciar
npx expo start --clear

# O con npm scripts
npm run start
```

#### Ejecutar en Android
```bash
# Con emulador abierto
npm run android

# O presionar 'a' en el terminal de Expo
```

#### Ejecutar en iOS (solo Mac)
```bash
# Instalar pods primero
cd ios
pod install
cd ..

# Ejecutar
npm run ios

# O presionar 'i' en el terminal de Expo
```

#### Ejecutar en Dispositivo Físico
```bash
# 1. Instalar Expo Go en el dispositivo
# Android: https://play.google.com/store/apps/details?id=host.exp.exponent
# iOS: https://apps.apple.com/app/expo-go/id982107779

# 2. Escanear QR code mostrado en terminal
# 3. Asegurarse de estar en la misma red WiFi
```

### 6.2 Build de Desarrollo

#### Android APK
```bash
# Build local (requiere configuración completa de Android)
npx expo run:android --variant release

# Build con EAS (recomendado)
eas build --platform android --profile preview
```

#### iOS IPA
```bash
# Solo en Mac con Xcode
npx expo run:ios --configuration Release

# Build con EAS
eas build --platform ios --profile preview
```

## 7. Debugging y Herramientas

### 7.1 React Native Debugger

```bash
# Instalar React Native Debugger
# Windows/Linux: https://github.com/jhen0409/react-native-debugger/releases
# macOS: brew install --cask react-native-debugger

# Activar en la app
# Shake device o Cmd+D (iOS) / Cmd+M (Android)
# Seleccionar "Debug JS Remotely"
```

### 7.2 Android Studio Logcat

```bash
# Para ver logs nativos de Android
# Android Studio → Logcat

# Filtrar por tag
adb logcat -s DriveSkore:V

# Ver todos los logs
adb logcat
```

## 8. Solución de Problemas Comunes

### 8.1 Error: "Metro bundler not found"
```bash
# Solución
npx react-native start --reset-cache
```

### 8.2 Error: "Could not connect to development server"
```bash
# Verificar IP del servidor
# Shake device → Settings → Debug server host
# Ingresar: <TU_IP_LOCAL>:8081

# Ejemplo: 192.168.1.100:8081
```

### 8.3 Error: "Module AppRegistry is not registered"
```bash
# Limpiar todo y reconstruir
cd android
./gradlew clean
cd ..
npx expo start --clear
```

### 8.4 Problemas con Bluetooth (AB Shutter 3)
```bash
# Verificar permisos en dispositivo
# Settings → Apps → DriveSkore → Permissions

# Emparejar dispositivo primero
# Settings → Bluetooth → Pair new device
```

## 9. Scripts Útiles

### 9.1 package.json Scripts

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "clean": "rm -rf node_modules && npm install",
    "reset": "npx expo start --clear",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios"
  }
}
```

### 9.2 Scripts de Mantenimiento

```bash
# Limpiar caché completo
#!/bin/bash
echo "Limpiando caché..."
rm -rf node_modules
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
watchman watch-del-all
npm cache clean --force
npm install
cd ios && pod deintegrate && pod install && cd ..
cd android && ./gradlew clean && cd ..
echo "Limpieza completada!"
```

## 10. Configuración de Producción

### 10.1 Preparar para Release

#### Android
```bash
# Generar keystore (guardar en lugar seguro!)
keytool -genkeypair -v -keystore driveskore.keystore -alias driveskore -keyalg RSA -keysize 2048 -validity 10000

# Configurar en android/app/build.gradle
signingConfigs {
    release {
        storeFile file('driveskore.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'driveskore'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}
```

#### iOS
```bash
# Configurar en Xcode
# 1. Seleccionar proyecto
# 2. Signing & Capabilities
# 3. Team: Seleccionar cuenta de desarrollador
# 4. Bundle Identifier: com.driveskore.app
```

### 10.2 Variables de Entorno de Producción

```env
# .env.production
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_SUPABASE_URL=https://production-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=production_key
```

### 10.3 Build de Producción con EAS

```bash
# Configurar EAS
eas build:configure

# Build para producción
eas build --platform all --profile production

# Enviar a tiendas
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## 11. Testing

### 11.1 Configurar Jest

```bash
# Ya incluido en el proyecto
npm test

# Con coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 12. Monitorización

### 12.1 Firebase Crashlytics

```javascript
// Ya configurado en src/config/firebase.ts
import crashlytics from '@react-native-firebase/crashlytics';

// Registrar errores
crashlytics().recordError(error);

// Ver en Firebase Console
// https://console.firebase.google.com/project/YOUR_PROJECT/crashlytics
```

### 12.2 Supabase Dashboard

```bash
# Monitorizar:
- Uso de base de datos
- Autenticaciones
- Storage
- Edge Functions logs

# URL: https://app.supabase.com/project/YOUR_PROJECT_ID
```
---

**Documento preparado por**: Gamaliel M.  
**Fecha**: Noviembre 2025 

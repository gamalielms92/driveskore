const {
    withAppBuildGradle,
    withAndroidManifest,
    withDangerousMod,
  } = require('@expo/config-plugins');
  const fs = require('fs');
  const path = require('path');
  
  module.exports = function withNativeModules(config) {
    // ============================================================================
    // 1. GRADLE: Añadir dependencias
    // ============================================================================
    config = withAppBuildGradle(config, (config) => {
      if (!config.modResults.contents.includes('androidx.work:work-runtime-ktx')) {
        config.modResults.contents = config.modResults.contents.replace(
          /dependencies\s*{/,
          `dependencies {
      implementation 'androidx.work:work-runtime-ktx:2.8.1'
      implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'`
        );
      }
      return config;
    });
  
    // ============================================================================
    // 2. MANIFEST: Añadir permisos
    // ============================================================================
    config = withAndroidManifest(config, async (config) => {
      const androidManifest = config.modResults;
      const { manifest } = androidManifest;
  
      if (!manifest.$) manifest.$ = {};
      if (!manifest['uses-permission']) manifest['uses-permission'] = [];
  
      // Permisos para FloatingButton + WorkManager
      const permissions = [
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        'android.permission.WAKE_LOCK',
      ];
  
      permissions.forEach((permission) => {
        const exists = manifest['uses-permission'].some(
          (p) => p.$['android:name'] === permission
        );
        if (!exists) {
          manifest['uses-permission'].push({
            $: { 'android:name': permission },
          });
          console.log(`✅ Permiso añadido: ${permission}`);
        }
      });
  
      // Añadir servicio FloatingButton
      if (!manifest.application[0].service) {
        manifest.application[0].service = [];
      }
  
      const serviceExists = manifest.application[0].service.some(
        (s) => s.$['android:name'] === '.FloatingButtonService'
      );
  
      if (!serviceExists) {
        manifest.application[0].service.push({
          $: {
            'android:name': '.FloatingButtonService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'specialUse',
          },
        });
        console.log('✅ Servicio FloatingButtonService añadido');
      }
  
      return config;
    });
  
    // ============================================================================
    // 3. COPIAR ARCHIVOS KOTLIN Y MODIFICAR MAINAPPLICATION (TODO EN UNO)
    // ============================================================================
    config = withDangerousMod(config, [
      'android',
      async (config) => {
        const projectRoot = config.modRequest.projectRoot;
  
        console.log('\n🔍 Configurando módulos nativos...');
  
        const androidPath = path.join(
          projectRoot,
          'android',
          'app',
          'src',
          'main',
          'java',
          'com',
          'driveskore',
          'app'
        );
  
        if (!fs.existsSync(androidPath)) {
          fs.mkdirSync(androidPath, { recursive: true });
        }
  
        // Copiar TODOS los archivos Kotlin
        const nativeFilesPath = path.join(projectRoot, 'native', 'android');
        const files = [
          // FloatingButton
          'FloatingButtonModule.kt',
          'FloatingButtonPackage.kt',
          'FloatingButtonService.kt',
          // WorkManager
          'LocationSyncWorker.kt',
          'WorkManagerModule.kt',
        ];
  
        files.forEach((file) => {
          const source = path.join(nativeFilesPath, file);
          const dest = path.join(androidPath, file);
  
          if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
            console.log(`✅ Copiado: ${file}`);
          } else {
            console.warn(`⚠️ No encontrado: ${source}`);
          }
        });
  
        // Modificar MainApplication.kt UNA SOLA VEZ
        const mainAppPath = path.join(androidPath, 'MainApplication.kt');
  
        if (fs.existsSync(mainAppPath)) {
          let content = fs.readFileSync(mainAppPath, 'utf8');
          let modified = false;
  
          // ========== IMPORTS ==========
          const imports = [
            'import com.driveskore.app.FloatingButtonPackage',
            'import com.driveskore.app.WorkManagerModule',
          ];
  
          imports.forEach((importLine) => {
            if (!content.includes(importLine)) {
              content = content.replace(
                'import expo.modules.ReactNativeHostWrapper',
                `import expo.modules.ReactNativeHostWrapper\n${importLine}`
              );
              modified = true;
              console.log(`✅ Import añadido: ${importLine}`);
            }
          });
  
          // ========== PACKAGES ==========
          const packages = [
            'add(FloatingButtonPackage())',
            'add(WorkManagerModule())',
          ];
  
          packages.forEach((packageLine) => {
            if (!content.includes(packageLine)) {
              content = content.replace(
                /\/\/ add\(MyReactNativePackage\(\)\)/,
                `// add(MyReactNativePackage())
                ${packageLine}`
              );
              modified = true;
              console.log(`✅ Package añadido: ${packageLine}`);
            }
          });
  
          if (modified) {
            fs.writeFileSync(mainAppPath, content);
            console.log('✅ MainApplication.kt modificado\n');
          } else {
            console.log('ℹ️ MainApplication.kt ya está configurado\n');
          }
        } else {
          console.error(`❌ MainApplication.kt no encontrado\n`);
        }
  
        return config;
      },
    ]);
  
    return config;
  };
const {
    withAppBuildGradle,
    withAndroidManifest,
    withDangerousMod,
  } = require('@expo/config-plugins');
  const fs = require('fs');
  const path = require('path');
  
  const withWorkManager = (config) => {
    // 1. Añadir dependencias de WorkManager
    config = withAppBuildGradle(config, (config) => {
      if (config.modResults.contents.includes('androidx.work:work-runtime-ktx')) {
        return config;
      }
  
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {
      implementation 'androidx.work:work-runtime-ktx:2.8.1'
      implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'`
      );
  
      return config;
    });
  
    // 2. Configurar AndroidManifest
    config = withAndroidManifest(config, async (config) => {
      const androidManifest = config.modResults.manifest;
  
      if (!androidManifest['uses-permission']) {
        androidManifest['uses-permission'] = [];
      }
  
      const permissions = [
        'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        'android.permission.WAKE_LOCK',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
      ];
  
      permissions.forEach((permission) => {
        const exists = androidManifest['uses-permission'].some(
          (p) => p.$['android:name'] === permission
        );
  
        if (!exists) {
          androidManifest['uses-permission'].push({
            $: { 'android:name': permission },
          });
        }
      });
  
      return config;
    });
  
    // 3. 🔥 COPIAR ARCHIVOS KOTLIN DESDE native/android/
    config = withDangerousMod(config, [
      'android',
      async (config) => {
        const projectRoot = config.modRequest.projectRoot;
        const androidProjectRoot = config.modRequest.platformProjectRoot;
  
        // Package path
        const packagePath = 'com/driveskore/app';
        const targetDir = path.join(
          androidProjectRoot,
          'app',
          'src',
          'main',
          'java',
          packagePath
        );
  
        // Crear directorio si no existe
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
  
        // 🔥 CAMBIO: Ruta de origen es native/android/
        const nativeAndroidDir = path.join(projectRoot, 'native', 'android');
  
        // Copiar LocationSyncWorker.kt
        const workerTemplatePath = path.join(nativeAndroidDir, 'LocationSyncWorker.kt');
        const workerTargetPath = path.join(targetDir, 'LocationSyncWorker.kt');
  
        if (fs.existsSync(workerTemplatePath)) {
          fs.copyFileSync(workerTemplatePath, workerTargetPath);
          console.log('✅ LocationSyncWorker.kt copiado desde native/android/');
        } else {
          console.warn('⚠️ No se encontró native/android/LocationSyncWorker.kt');
        }
  
        // Copiar WorkManagerModule.kt
        const moduleTemplatePath = path.join(nativeAndroidDir, 'WorkManagerModule.kt');
        const moduleTargetPath = path.join(targetDir, 'WorkManagerModule.kt');
  
        if (fs.existsSync(moduleTemplatePath)) {
          fs.copyFileSync(moduleTemplatePath, moduleTargetPath);
          console.log('✅ WorkManagerModule.kt copiado desde native/android/');
        } else {
          console.warn('⚠️ No se encontró native/android/WorkManagerModule.kt');
        }
  
        return config;
      },
    ]);
  
    // 4. 🔥 REGISTRAR MÓDULO EN MainApplication.kt
    config = withDangerousMod(config, [
      'android',
      async (config) => {
        const androidProjectRoot = config.modRequest.platformProjectRoot;
  
        const mainApplicationPath = path.join(
          androidProjectRoot,
          'app',
          'src',
          'main',
          'java',
          'com',
          'driveskore',
          'app',
          'MainApplication.kt'
        );
  
        if (fs.existsSync(mainApplicationPath)) {
          let content = fs.readFileSync(mainApplicationPath, 'utf-8');
  
          // Añadir import si no existe
          if (!content.includes('import com.driveskore.app.WorkManagerModule')) {
            content = content.replace(
              /(package com\.driveskore\.app)/,
              `$1\n\nimport com.driveskore.app.WorkManagerModule`
            );
          }
  
          // Añadir módulo a la lista si no existe
          if (!content.includes('WorkManagerModule()')) {
            // Buscar el método getPackages y añadir el módulo
            content = content.replace(
              /(override fun getPackages[\s\S]*?return PackageList\(this\)\.packages\.apply {[^}]*)/,
              `$1\n          add(WorkManagerModule())`
            );
          }
  
          fs.writeFileSync(mainApplicationPath, content, 'utf-8');
          console.log('✅ WorkManagerModule registrado en MainApplication.kt');
        } else {
          console.warn('⚠️ No se encontró MainApplication.kt');
        }
  
        return config;
      },
    ]);
  
    return config;
  };
  
  module.exports = withWorkManager;
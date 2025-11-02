const { withAndroidManifest, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFloatingButton(config) {
  // 1. Modificar AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    // Añadir permisos
    if (!manifest.$ ) manifest.$ = {};
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    
    const permissions = [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE'
    ];

    permissions.forEach(permission => {
      const exists = manifest['uses-permission'].some(
        p => p.$['android:name'] === permission
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission }
        });
      }
    });

    // Añadir servicio
    if (!manifest.application[0].service) {
      manifest.application[0].service = [];
    }

    const serviceExists = manifest.application[0].service.some(
      s => s.$['android:name'] === '.FloatingButtonService'
    );

    if (!serviceExists) {
      manifest.application[0].service.push({
        $: {
          'android:name': '.FloatingButtonService',
          'android:enabled': 'true',
          'android:exported': 'false'
        }
      });
    }

    return config;
  });

  // 2. Copiar archivos Kotlin
  config = withMainApplication(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const androidPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'driveskore');

    // Crear directorio si no existe
    if (!fs.existsSync(androidPath)) {
      fs.mkdirSync(androidPath, { recursive: true });
    }

    // Copiar archivos Kotlin desde la carpeta native/
    const nativeFilesPath = path.join(projectRoot, 'native', 'android');
    const files = [
      'FloatingButtonModule.kt',
      'FloatingButtonPackage.kt', 
      'FloatingButtonService.kt'
    ];

    files.forEach(file => {
      const source = path.join(nativeFilesPath, file);
      const dest = path.join(androidPath, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        console.log(`✅ Copiado: ${file}`);
      }
    });

    // Modificar MainApplication para registrar el package
    const mainAppPath = path.join(androidPath, 'MainApplication.kt');
    
    if (fs.existsSync(mainAppPath)) {
      let content = fs.readFileSync(mainAppPath, 'utf8');
      
      // Añadir import si no existe
      if (!content.includes('import com.driveskore.FloatingButtonPackage')) {
        content = content.replace(
          'import expo.modules.ApplicationLifecycleDispatcher',
          'import expo.modules.ApplicationLifecycleDispatcher\nimport com.driveskore.FloatingButtonPackage'
        );
      }

      // Añadir package a la lista si no existe
      if (!content.includes('packages.add(FloatingButtonPackage())')) {
        content = content.replace(
          'return packages',
          'packages.add(FloatingButtonPackage())\n      return packages'
        );
      }

      fs.writeFileSync(mainAppPath, content);
      console.log('✅ MainApplication.kt modificado');
    }

    return config;
  });

  return config;
};
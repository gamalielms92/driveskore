const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFloatingButton(config) {
  // 1. Modificar AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    // Añadir permisos
    if (!manifest.$) manifest.$ = {};
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
        console.log(`✅ Permiso añadido: ${permission}`);
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
      console.log('✅ Servicio FloatingButtonService añadido al manifest');
    }

    return config;
  });

  // 2. Copiar archivos Kotlin y modificar MainApplication
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      console.log('\n🔍 Configurando botón flotante...');
      
      // Ruta donde copiar los archivos Kotlin
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

      // Crear directorio si no existe
      if (!fs.existsSync(androidPath)) {
        fs.mkdirSync(androidPath, { recursive: true });
      }

      // Copiar archivos Kotlin
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
        } else {
          console.warn(`⚠️ No encontrado: ${source}`);
        }
      });

      // Modificar MainApplication.kt
      const mainAppPath = path.join(androidPath, 'MainApplication.kt');
      
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, 'utf8');
        let modified = false;
        
        // Añadir import si no existe
        if (!content.includes('FloatingButtonPackage')) {
          // Añadir después de los imports de expo
          content = content.replace(
            'import expo.modules.ReactNativeHostWrapper',
            'import expo.modules.ReactNativeHostWrapper\nimport com.driveskore.app.FloatingButtonPackage'
          );
          modified = true;
          console.log('✅ Import añadido');
        }

        // Añadir package dentro del .apply { }
        if (!content.includes('add(FloatingButtonPackage())')) {
          // Buscar el bloque .apply y añadir antes del cierre
          content = content.replace(
            /PackageList\(this\)\.packages\.apply \{\s*\/\/ Packages that cannot be autolinked/,
            `PackageList(this).packages.apply {
              // Packages that cannot be autolinked`
          );
          
          content = content.replace(
            /\/\/ add\(MyReactNativePackage\(\)\)/,
            `// add(MyReactNativePackage())
              add(FloatingButtonPackage())`
          );
          
          modified = true;
          console.log('✅ Package añadido');
        }

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
// plugins/withReactNativeKeyEvent.js
// Config Plugin para react-native-keyevent (KOTLIN VERSION)

const { withMainActivity, AndroidConfig } = require('@expo/config-plugins');

/**
 * Config Plugin para añadir soporte de react-native-keyevent en Kotlin
 */
const withReactNativeKeyEvent = (config) => {
  return withMainActivity(config, (config) => {
    const { modResults } = config;
    let { contents } = modResults;

    // Verificar si es archivo Kotlin (.kt)
    const isKotlin = contents.includes('class MainActivity') && 
                     (contents.includes('import') || contents.includes('package'));

    if (!isKotlin) {
      console.warn('⚠️ MainActivity no parece ser Kotlin, saltando modificación');
      return config;
    }

    // Import de KeyEventModule
    const keyEventImport = 'import com.github.kevinejohn.keyevent.KeyEventModule';

    // Métodos a añadir en Kotlin
    const keyEventMethods = `
    override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent?): Boolean {
        // Enviar evento a react-native-keyevent
        KeyEventModule.getInstance().onKeyDownEvent(keyCode, event)
        
        // También llamar al método padre
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: android.view.KeyEvent?): Boolean {
        // Enviar evento a react-native-keyevent
        KeyEventModule.getInstance().onKeyUpEvent(keyCode, event)
        
        // También llamar al método padre
        return super.onKeyUp(keyCode, event)
    }

    override fun onKeyMultiple(keyCode: Int, repeatCount: Int, event: android.view.KeyEvent?): Boolean {
        // Enviar evento a react-native-keyevent
        KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event)
        
        // También llamar al método padre
        return super.onKeyMultiple(keyCode, repeatCount, event)
    }
`;

    // Añadir import si no existe
    if (!contents.includes('com.github.kevinejohn.keyevent.KeyEventModule')) {
      // Buscar la sección de imports y añadir el nuestro
      const importMatch = contents.match(/(import .*\n)+/);
      if (importMatch) {
        contents = contents.replace(
          importMatch[0],
          `${importMatch[0]}${keyEventImport}\n`
        );
      } else {
        // Si no hay imports, añadir después del package
        contents = contents.replace(
          /(package .*)/,
          `$1\n\n${keyEventImport}`
        );
      }
    }

    // Añadir métodos si no existen
    if (!contents.includes('onKeyDown(keyCode: Int')) {
      // Buscar el último } de la clase MainActivity
      const classEndIndex = contents.lastIndexOf('}');
      if (classEndIndex !== -1) {
        contents = 
          contents.substring(0, classEndIndex) + 
          keyEventMethods + 
          '\n' + 
          contents.substring(classEndIndex);
      }
    }

    modResults.contents = contents;
    return config;
  });
};

module.exports = withReactNativeKeyEvent;
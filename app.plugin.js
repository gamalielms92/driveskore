const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withVoicePlugin(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Añadir queries para speech recognition
    if (!androidManifest.queries) {
      androidManifest.queries = [{}];
    }

    if (!androidManifest.queries[0].intent) {
      androidManifest.queries[0].intent = [];
    }

    // Intent para reconocimiento de voz
    const speechIntent = {
      action: [
        { 
          $: { 
            'android:name': 'android.speech.RecognitionService' 
          } 
        }
      ],
    };

    androidManifest.queries[0].intent.push(speechIntent);

    return config;
  });
};
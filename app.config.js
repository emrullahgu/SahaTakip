// app.config.js — app.json'u baz alır, gizli/ortama özel değerleri env'den enjekte eder.
// Expo otomatik olarak app.config.* dosyasını app.json'a tercih eder.

const base = require('./app.json');

module.exports = ({ config: _ }) => {
  const expo = { ...base.expo };
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  if (mapsKey) {
    expo.android = {
      ...(expo.android || {}),
      config: {
        ...((expo.android && expo.android.config) || {}),
        googleMaps: { apiKey: mapsKey },
      },
    };
  } else if (expo.android && expo.android.config && expo.android.config.googleMaps) {
    // Env yoksa app.json'daki placeholder/boş değer kullanılır; yapı boş olmamalı.
    // Build zamanında uyarı verelim.
    if (!expo.android.config.googleMaps.apiKey) {
      console.warn('[app.config] GOOGLE_MAPS_API_KEY tanımlı değil; harita modülü çalışmayabilir.');
    }
  }
  return expo;
};

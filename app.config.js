// app.config.js — Expo, app.json değerlerini `config` parametresi olarak geçirir.
// Biz bunları baz alıp yalnızca gizli/ortama özel değerleri (Google Maps key) env'den
// enjekte ederiz. (Statik app.json korunur; burada üzerine yazılır.)

module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  if (mapsKey) {
    config.android = {
      ...(config.android || {}),
      config: {
        ...((config.android && config.android.config) || {}),
        googleMaps: { apiKey: mapsKey },
      },
    };
  } else if (config.android?.config?.googleMaps && !config.android.config.googleMaps.apiKey) {
    // Env yoksa app.json'daki değer kullanılır; eksikse build zamanında uyar.
    console.warn('[app.config] GOOGLE_MAPS_API_KEY tanımlı değil; harita modülü çalışmayabilir.');
  }
  return config;
};

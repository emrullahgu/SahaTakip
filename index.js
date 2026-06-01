// index.js — Expo root component register
//
// NOT: Warning silencer EN BAŞTA çalışmalı. ES `import` ifadeleri hoist edildiği
// için silencer'ı inline tutuyoruz; aksi halde expo-notifications gibi modüllerin
// side-effect uyarıları filtre kurulmadan önce yazılır.

(function installEarlySilencer() {
  if (typeof console === 'undefined') return;
  if (globalThis.__sahatakip_silencer_installed) return;
  globalThis.__sahatakip_silencer_installed = true;

  var PATTERNS = [
    /Listening to push token changes is not yet fully supported on web/i,
    /Adding a listener will have no effect/i,
    /Cannot record touch end without a touch start/i,
    /google\.maps\.Marker is deprecated/i,
    /Google Maps JavaScript API has been loaded directly without loading=async/i,
  ];
  var origWarn = console.warn.bind(console);
  var origError = console.error.bind(console);
  function matches(args) {
    try {
      var text = '';
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (typeof a === 'string') text += ' ' + a;
        else if (a && typeof a.message === 'string') text += ' ' + a.message;
      }
      for (var j = 0; j < PATTERNS.length; j++) {
        if (PATTERNS[j].test(text)) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }
  console.warn = function () {
    if (matches(arguments)) return;
    return origWarn.apply(null, arguments);
  };
  console.error = function () {
    if (matches(arguments)) return;
    return origError.apply(null, arguments);
  };
})();

import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';

// Tema bootstrap: App.tsx (ve dolayısıyla theme.ts) yüklenmeden ÖNCE
// AsyncStorage'tan kullanıcı tercihini okuyup globalThis.__SAHATAKIP_THEME__
// içine yaz. Böylece tüm StyleSheet.create çağrıları (module-scope) doğru
// renklerle bake edilir. Bu sayede release APK'da da Dark mode kalıcı olur.
const THEME_STORAGE_KEY = 'sahatakip.themeMode';

async function bootstrapTheme() {
  try {
    // Web'de localStorage senkron — önce ona bak
    if (Platform.OS === 'web') {
      try {
        const v = (typeof localStorage !== 'undefined') ? localStorage.getItem(THEME_STORAGE_KEY) : null;
        if (v === 'light' || v === 'dark') {
          globalThis.__SAHATAKIP_THEME__ = v;
          return;
        }
        if (v === 'system') {
          globalThis.__SAHATAKIP_THEME__ = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
          return;
        }
      } catch (_) { /* sessiz */ }
    }
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      globalThis.__SAHATAKIP_THEME__ = stored;
    } else if (stored === 'system') {
      globalThis.__SAHATAKIP_THEME__ = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    }
  } catch (_) {
    /* sessiz — varsayılan light kalır */
  }
}

async function start() {
  await bootstrapTheme();
  // App'i dinamik require ile bootstrap'tan SONRA yükle ki theme.ts global stamp'i okusun.
  // eslint-disable-next-line global-require
  const App = require('./App').default;
  registerRootComponent(App);
}

// AppRegistry'ye main'in zamanında bulunması için fallback: bootstrap çok hızlı
// (genelde <50ms) bittiği için native köprü hazır olduğunda bileşen mevcut olur.
start();

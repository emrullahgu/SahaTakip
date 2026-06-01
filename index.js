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

import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { View, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'sahatakip.themeMode';

// Tema modunu modül yüklenmeden ÖNCE hidrate eden köprü bileşen.
// Böylece ./App ve içindeki theme.ts, doğru renk paletiyle ilk kez import edilir.
function Root() {
  const [ready, setReady] = useState(false);
  const [AppComp, setAppComp] = useState(null);
  const [bg, setBg] = useState('#ffffff');

  useEffect(() => {
    let mounted = true;
    (async () => {
      let mode = 'light';
      try {
        const v = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (v === 'dark') mode = 'dark';
        else if (v === 'light') mode = 'light';
        else if (v === 'system') {
          const sys = Appearance?.getColorScheme?.();
          mode = sys === 'dark' ? 'dark' : 'light';
        }
      } catch (_) {
        /* sessiz */
      }
      try { globalThis.__SAHATAKIP_THEME__ = mode; } catch (_) {}
      if (!mounted) return;
      setBg(mode === 'dark' ? '#020617' : '#ffffff');
      // Tema flag set edildikten SONRA App'i require et (modül cache'i ilk burada doluyor).
      const App = require('./App').default;
      setAppComp(() => App);
      setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  if (!ready || !AppComp) {
    return React.createElement(View, { style: { flex: 1, backgroundColor: bg } });
  }
  return React.createElement(AppComp);
}

registerRootComponent(Root);

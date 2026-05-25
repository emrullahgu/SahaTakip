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
import App from './App';

registerRootComponent(App);

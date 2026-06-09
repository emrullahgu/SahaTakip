// metro.config.js — POZ-DEV-356 Web bundle için native-only modül shim'leri.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const WEB_SHIM_MAP = {
  'react-native-maps': path.resolve(__dirname, 'src/shims/react-native-maps.web.tsx'),
  'expo-notifications': path.resolve(__dirname, 'src/shims/expo-notifications.web.js'),
  'expo-print': path.resolve(__dirname, 'src/shims/expo-print.web.js'),
  'expo-sharing': path.resolve(__dirname, 'src/shims/expo-sharing.web.js'),
  // expo-image-manipulator@56 web'de bozuk paketleniyor (main: src/index.ts,
  // build/ yalnız .d.ts) → metro './validators'i cozemeyip TUM web bundle cokuyordu.
  'expo-image-manipulator': path.resolve(__dirname, 'src/shims/expo-image-manipulator.web.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_SHIM_MAP[moduleName]) {
    return {
      filePath: WEB_SHIM_MAP[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

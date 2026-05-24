// metro.config.js — POZ-DEV-356 Web bundle için native-only modül shim'leri.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const WEB_SHIM_MAP = {
  'react-native-maps': path.resolve(__dirname, 'src/shims/react-native-maps.web.tsx'),
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

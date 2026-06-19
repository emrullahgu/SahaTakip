// jest.render.config.js — SADECE ekran smoke-render testleri için ayrı config.
// Pure-logic config'ten (jest.config.js) farkı: jest-expo preset + gerçek react-native
// (string mock DEĞİL). Mevcut `npm test` (350 mantık testi) ETKİLENMEZ; bu config yalnız
// `*.render.test.tsx` dosyalarını çalıştırır (npm run test:render).
module.exports = {
  preset: 'jest-expo',
  testTimeout: 30000,                                  // jest-expo ilk-derleme + render ağır; cömert tut
  setupFiles: ['<rootDir>/jest.setup.js'],            // AsyncStorage in-memory mock'u tekrar kullan
  setupFilesAfterEnv: ['<rootDir>/jest.render.setup.js'],
  testMatch: ['**/__tests__/**/*.render.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|expo(nent)?|@expo|@unimodules|unimodules|react-native-svg|react-native-safe-area-context|react-native-maps))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

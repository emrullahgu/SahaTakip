// jest.config.js — Pure-logic test config (jest-expo SDK 56 winter runtime bug workaround)
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // *.render.test.tsx ekran smoke testleri AYRI config (jest.render.config.js, jest-expo)
  // ile çalışır; bu pure-logic (node + string-RN-mock) config'te çalıştırılMAMALI.
  testPathIgnorePatterns: ['/node_modules/', '\\.render\\.test\\.tsx$'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/jest.rn-mock.js',
    '^expo$': '<rootDir>/jest.expo-mock.js',
    '^expo-(.*)$': '<rootDir>/jest.expo-mock.js',
  },
};

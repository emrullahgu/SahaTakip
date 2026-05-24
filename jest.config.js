// jest.config.js — POZ-DEV-338 Jest yapılandırma iskeleti
// Çalıştırmak için: npm i -D jest @types/jest jest-expo @testing-library/react-native @testing-library/jest-native
// Sonra: npm test
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEach: [],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/utils/**/*.ts',
    'src/hooks/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: { lines: 50, functions: 40, branches: 35, statements: 50 },
  },
};

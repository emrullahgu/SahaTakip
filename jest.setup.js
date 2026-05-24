// jest.setup.js — Test ortamı setup'ı
/* global jest */
// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-location mock
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 38.42, longitude: 27.13, accuracy: 5 } }),
  ),
}));

// react-native-maps mock (test ortamı için tamamen no-op)
jest.mock('react-native-maps', () => {
  const React = require('react');
  const RN = require('react-native');
  const Stub = (props) => React.createElement(RN.View, props, props.children);
  return {
    __esModule: true,
    default: Stub,
    Marker: Stub,
    Polyline: Stub,
    Circle: Stub,
    Polygon: Stub,
    Callout: Stub,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: undefined,
  };
});

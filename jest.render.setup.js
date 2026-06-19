/* global jest */
// jest.render.setup.js — Ekran smoke-render ortamı için native-only modül mock'ları.
// Amaç: ekranların jsdom/test ortamında ÇÖKMEDEN mount olabilmesi (gerçek davranış değil).

// SafeAreaView/Provider'ı Fragment'a indir (gerçek insets hesaplaması gereksiz).
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => inset,
    SafeAreaInsetsContext: React.createContext(inset),
  };
});

// @expo/vector-icons → basit yer tutucu (gerçek font yükleme test ortamında gereksiz).
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return new Proxy(
    {},
    { get: () => (props) => React.createElement('Icon', props) },
  );
});

// react-native-maps native modül; test ortamında yok.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const Stub = (props) => React.createElement('Map', props);
  return { __esModule: true, default: Stub, Marker: Stub, Polyline: Stub, PROVIDER_GOOGLE: 'google' };
});

// Navigation hook'larını nötrle → ekranlar NavigationContainer olmadan da render olur.
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn(),
      dispatch: jest.fn(), addListener: jest.fn(() => jest.fn()), canGoBack: () => true,
    }),
    useRoute: () => ({ params: {}, key: 'test', name: 'Test' }),
    useIsFocused: () => true,
    useFocusEffect: (cb) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
    NavigationContainer: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

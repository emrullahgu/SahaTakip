// Pure-logic testleri için minimal react-native mock
module.exports = {
  Platform: { OS: 'ios', select: (o) => o.ios ?? o.default },
  StyleSheet: { create: (s) => s, flatten: (s) => s },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  Image: 'Image',
  Alert: { alert: jest.fn() },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  NativeModules: {},
};

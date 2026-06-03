// jest.setup.js — Test setup
/* global jest */
// AsyncStorage: gerçek davranışı taklit eden in-memory store.
// (Önceki stub getItem→null/setItem→no-op döndürdüğü için read-after-write
//  gerektiren servisler test edilemiyordu.)
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    getItem: jest.fn((key) =>
      Promise.resolve(Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)
    ),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys) =>
      Promise.resolve(keys.map((k) => [k, Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null]))
    ),
    multiSet: jest.fn((pairs) => {
      for (const [k, v] of pairs) store[k] = String(v);
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      for (const k of keys) delete store[k];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  };
});

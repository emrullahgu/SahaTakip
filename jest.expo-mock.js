// Pure-logic testleri için expo* mock — her zaman no-op döner
module.exports = new Proxy({}, {
  get: () => jest.fn(),
});

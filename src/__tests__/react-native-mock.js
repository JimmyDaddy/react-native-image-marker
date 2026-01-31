// React Native mock for Vitest
module.exports = {
  NativeModules: {
    ImageMarker: {
      markWithText: () => Promise.resolve('mocked-result'),
      markWithImage: () => Promise.resolve('mocked-result'),
    },
  },
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  Image: {
    resolveAssetSource: (source) => ({ uri: source }),
  },
  TurboModuleRegistry: {
    get: () => null,
    getEnforcing: () => ({
      markWithText: () => Promise.resolve('mocked-turbo-result'),
      markWithImage: () => Promise.resolve('mocked-turbo-result'),
    }),
  },
  UIManager: {
    hasViewManagerConfig: () => false,
  },
  // Default export
  default: {
    NativeModules: {
      ImageMarker: {
        markWithText: () => Promise.resolve('mocked-result'),
        markWithImage: () => Promise.resolve('mocked-result'),
      },
    },
    Platform: {
      OS: 'ios',
      select: (obj) => obj.ios || obj.default,
    },
    Image: {
      resolveAssetSource: (source) => ({ uri: source }),
    },
    TurboModuleRegistry: {
      get: () => null,
      getEnforcing: () => ({
        markWithText: () => Promise.resolve('mocked-turbo-result'),
        markWithImage: () => Promise.resolve('mocked-turbo-result'),
      }),
    },
    UIManager: {
      hasViewManagerConfig: () => false,
    },
  },
};

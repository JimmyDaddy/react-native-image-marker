// Vitest setup file

// Define global __DEV__ for test environment
(global as any).__DEV__ = true;

// Mock React Native modules
vi.mock('react-native', () => ({
  NativeModules: {
    ImageMarker: {
      markWithText: vi.fn(() => Promise.resolve('mocked-result')),
      markWithImage: vi.fn(() => Promise.resolve('mocked-result')),
    },
  },
  Platform: {
    OS: 'ios',
    select: vi.fn((obj) => obj.ios || obj.default),
  },
  Image: {
    resolveAssetSource: vi.fn((source) => ({ uri: source })),
  },
  TurboModuleRegistry: {
    get: vi.fn(),
    getEnforcing: vi.fn(),
  },
  UIManager: {
    hasViewManagerConfig: vi.fn(() => false),
  },
}));

// Mock the TurboModule spec
vi.mock('../../specs/NativeImageMarker', () => ({
  default: {
    markWithText: vi.fn(() => Promise.resolve('mocked-turbo-result')),
    markWithImage: vi.fn(() => Promise.resolve('mocked-turbo-result')),
  },
}));

// Global setup
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};

module.exports = {
  preset: 'react-native',
  rootDir: '../..',
  testMatch: ['<rootDir>/packages/editor/src/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^react-native-image-marker$': '<rootDir>/src/index.ts',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/packages/editor/lib',
    '<rootDir>/lib',
  ],
};

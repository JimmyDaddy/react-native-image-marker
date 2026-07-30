module.exports = {
  preset: 'react-native',
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/packages/node/src/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/packages/node/lib',
    '<rootDir>/lib',
  ],
};

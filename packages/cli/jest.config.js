module.exports = {
  preset: 'react-native',
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/packages/cli/src/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/packages/cli/lib',
    '<rootDir>/lib',
  ],
  moduleNameMapper: {
    '^@image-marker/node$': '<rootDir>/packages/node/src/index.ts',
    '^@image-marker/recipe$': '<rootDir>/packages/recipe/src/index.ts',
  },
};

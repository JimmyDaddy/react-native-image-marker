module.exports = {
  preset: 'react-native',
  rootDir: '../..',
  testMatch: ['<rootDir>/packages/recipe/src/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/packages/recipe/lib',
    '<rootDir>/lib',
  ],
};

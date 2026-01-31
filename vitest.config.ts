import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/lib/**',
      '**/example/**',
      '**/expo-example/**',
      '**/android/**',
      '**/ios/**',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      'react-native': path.resolve(
        __dirname,
        './src/__tests__/react-native-mock.js'
      ),
    },
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'], // Assuming a setup file for jest-dom matchers
    include: ['src/**/*.test.{ts,tsx}'], // Include test files in src directory
    exclude: ['node_modules/', 'dist/'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias for src folder
    },
  },
});

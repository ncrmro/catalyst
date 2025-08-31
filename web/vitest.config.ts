import { defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths'


export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/unit/**/*.test.{ts,tsx}',
      '**/__tests__/integration/**/*.test.{ts,tsx}',
      '**/__tests__/e2e/**/*.{test,spec}.{ts,tsx}'
    ],
    globals: true
  },
  plugins: [tsconfigPaths()]
});

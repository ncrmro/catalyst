import { defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths'


export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/unit/**/*.test.{ts,tsx}',
      '**/__tests__/components/**/*.test.{ts,tsx}',
      '**/__tests__/integration/**/*.test.{ts,tsx}'
    ],
    exclude: [
      '**/__tests__/e2e/**/*'
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '__tests__/**',
        'coverage/**',
        'dist/**',
        '.next/**',
        'next.config.ts',
        'tailwind.config.js',
        'postcss.config.mjs',
        'eslint.config.mjs',
        'jest.config.js',
        'jest.setup.js',
        'vitest.config.ts',
        'vitest.setup.ts',
        'playwright.config.ts',
        'drizzle.config.ts',
        'instrumentation.ts',
        'next-logger.config.js',
        'scripts/**',
        'types/**'
      ],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      all: true
    }
  },
  plugins: [tsconfigPaths()]
});

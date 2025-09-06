import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/tests/unit/**/*.test.{ts,tsx}',
      '**/tests/integration/**/*.test.{ts,tsx}',
    ],
    globals: true
  },
  plugins: [tsconfigPaths()]
});
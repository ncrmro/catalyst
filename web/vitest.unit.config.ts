import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./vitest.global-setup.ts",
    include: [
      "**/__tests__/unit/**/*.test.{ts,tsx}",
      "**/__tests__/components/**/*.test.{ts,tsx}",
      "**/__tests__/integration/**/*.test.{ts,tsx}",
      "**/__tests__/e2e/**/*.{test,spec}.{ts,tsx}"
    ],
    exclude: [
      '**/node_modules/**', 
      '**/dist/**', 
      '**/.direnv/**', 
      '**/.next/**'
    ],
  },
  plugins: [tsconfigPaths()]
});

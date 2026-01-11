// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "storybook-static/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
      ".kube/**",
      "spikes/**",
      "packages/**",
      "drizzle/**",
      // CommonJS config files
      "*.cjs",
      "jest.config.js",
      "jest.setup.js",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...storybook.configs["flat/recommended"],
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Allow require() in instrumentation.ts (Next.js requirement)
  {
    files: ["instrumentation.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Relax rules for test files
  {
    files: ["__tests__/**/*", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Disable react-hooks rules for e2e fixtures (Playwright's `use` is not a React hook)
  {
    files: ["__tests__/e2e/fixtures/**/*"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;

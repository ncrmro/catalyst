import type { StorybookConfig } from "@storybook/nextjs-vite";
import path from "path";
import { dirname } from "path";

import { fileURLToPath } from "url";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-onboarding"),
  ],
  framework: getAbsolutePath("@storybook/nextjs-vite"),
  staticDirs: ["../public"],
  viteFinal: async (config) => {
    // Add path aliases for Vite to match tsconfig.json
    const __dirname = dirname(fileURLToPath(import.meta.url));
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};

    // Use Object.assign to ADD aliases without replacing the object
    Object.assign(config.resolve.alias, {
      "@/__tests__": path.resolve(__dirname, "../__tests__"),
      "@fixtures": path.resolve(__dirname, "../fixtures"),
      // Mock Node.js-only modules that cannot run in the browser
      pg: path.resolve(__dirname, "./mocks/pg.js"),
      "next/server": path.resolve(__dirname, "./mocks/next-server.js"),
      "next-auth": path.resolve(__dirname, "./mocks/next-auth.js"),
      "@/auth": path.resolve(__dirname, "./mocks/next-auth.js"),
      // Mock server actions that import server-only code
      "@/actions/environments": path.resolve(
        __dirname,
        "./mocks/actions-environments.js",
      ),
    });

    // Configure Vite to handle drizzle-orm and pg as external for SSR
    // This prevents them from being bundled while allowing type imports
    config.ssr = config.ssr || {};
    config.ssr.noExternal = config.ssr.noExternal || [];
    // Ensure drizzle-orm is treated specially - types only, no runtime
    config.ssr.external = config.ssr.external || [];
    if (!Array.isArray(config.ssr.external)) {
      config.ssr.external = [];
    }
    config.ssr.external.push("drizzle-orm", "pg");

    // Force Vite to pre-bundle Next.js modules with proper CJS/ESM handling
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.include = config.optimizeDeps.include || [];
    config.optimizeDeps.include.push(
      "next/dist/client/components/redirect-status-code",
      "next/navigation",
    );

    // Exclude drizzle-orm and pg from optimization
    config.optimizeDeps.exclude = config.optimizeDeps.exclude || [];
    config.optimizeDeps.exclude.push("drizzle-orm", "pg");

    // Exclude drizzle-orm and pg from optimization
    config.optimizeDeps.exclude = config.optimizeDeps.exclude || [];
    config.optimizeDeps.exclude.push("drizzle-orm", "pg");

    // Enable named exports from CJS modules
    config.optimizeDeps.esbuildOptions =
      config.optimizeDeps.esbuildOptions || {};
    config.optimizeDeps.esbuildOptions.loader = {
      ...config.optimizeDeps.esbuildOptions.loader,
      ".js": "jsx",
    };

    // Ignore .next directory to avoid inotify watch limit issues
    config.server = config.server || {};
    config.server.watch = config.server.watch || {};
    config.server.watch.ignored = ["**/.next/**"];

    return config;
  },
};
export default config;

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  async viteFinal(config) {
    // Manually add @vitejs/plugin-react with explicit options
    // This is often needed when Storybook's default setup struggles with JSX in .ts files
    config.plugins = config.plugins || [];
    config.plugins.push(
      (await import('@vitejs/plugin-react')).default({
        // Ensure automatic runtime is used
        jsxRuntime: 'automatic',
      }),
    );
    return config;
  },
};

export default config;

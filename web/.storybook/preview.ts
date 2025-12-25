import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";

/**
 * Fixtures are available for use in stories:
 * import { reposFixtures, projectsFixtures, usersFixtures } from "@/lib/fixtures";
 * 
 * Example: src/components/fixture-usage-example.stories.tsx
 */

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectPageContent } from "./project-page-content";

const meta = {
  title: "Pages/Projects/ProjectPage",
  component: ProjectPageContent,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ProjectPageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - project with feature tasks
 */
export const Default: Story = {
  args: {
    project: {
      slug: "catalyst",
      name: "Catalyst",
      fullName: "ncrmro/catalyst",
    },
  },
};

/**
 * Meze project - shows different project's feature tasks
 */
export const MezeProject: Story = {
  args: {
    project: {
      slug: "meze",
      name: "Meze",
      fullName: "ncrmro/meze",
    },
  },
};

/**
 * New project with no tasks
 */
export const NewProject: Story = {
  args: {
    project: {
      slug: "new-project",
      name: "New Project",
      fullName: "org/new-project",
    },
  },
};

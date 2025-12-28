import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectStatusBadge } from "./project-status-badge";

const meta = {
  title: "Components/UI/ProjectStatusBadge",
  component: ProjectStatusBadge,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    status: {
      control: "select",
      options: ["active", "suspended", "archived"],
      description: "The status of the project",
    },
  },
} satisfies Meta<typeof ProjectStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Active status indicates a project that is currently being worked on.
 */
export const Active: Story = {
  args: {
    status: "active",
  },
};

/**
 * Suspended status indicates a project that is temporarily paused.
 */
export const Suspended: Story = {
  args: {
    status: "suspended",
  },
};

/**
 * Archived status indicates a project that is no longer active.
 */
export const Archived: Story = {
  args: {
    status: "archived",
  },
};

/**
 * All status variations displayed together.
 */
export const AllStatuses: Story = {
  render: () => (
    <div className="flex gap-4">
      <ProjectStatusBadge status="active" />
      <ProjectStatusBadge status="suspended" />
      <ProjectStatusBadge status="archived" />
    </div>
  ),
};

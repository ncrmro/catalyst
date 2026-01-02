import type { Meta, StoryObj } from "@storybook/react";
import { AgentContextViewer } from "./AgentContextViewer";

const meta: Meta<typeof AgentContextViewer> = {
  title: "Platform/AgentContextViewer",
  component: AgentContextViewer,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AgentContextViewer>;

const mockContent = `
# Project Context

## Tech Stack
- Next.js 14
- Drizzle ORM
- Tailwind CSS

## Conventions
- Use server actions for mutations
- Place UI components in 
- Use \`@/lib\` for utilities

## Architecture
The application uses a 3-tier architecture...
`;

export const Default: Story = {
  args: {
    content: mockContent,
    lastGeneratedAt: new Date(),
    needsRefresh: false,
    onRefresh: () => console.log("Refresh clicked"),
  },
};

export const Outdated: Story = {
  args: {
    content: mockContent,
    lastGeneratedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    needsRefresh: true,
  },
};


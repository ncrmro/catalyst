// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SpecTaskList, type SpecTask } from "./SpecTaskList";

const meta: Meta<typeof SpecTaskList> = {
  title: "Platform/SpecTaskList",
  component: SpecTaskList,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SpecTaskList>;

const mockTasks: SpecTask[] = [
  {
    id: "1",
    taskId: "T001",
    userStoryRef: "US-1",
    description: "Initialize Next.js project structure",
    isParallelizable: false,
    status: "complete",
    linkedPrNumber: 42,
    linkedPrUrl: "https://github.com/org/repo/pull/42",
  },
  {
    id: "2",
    taskId: "T002",
    userStoryRef: "US-1",
    description: "Configure Tailwind CSS and Shadcn UI",
    isParallelizable: true,
    status: "in_progress",
    linkedPrNumber: 45,
    linkedPrUrl: "https://github.com/org/repo/pull/45",
  },
  {
    id: "3",
    taskId: "T003",
    userStoryRef: "US-2",
    description: "Implement user authentication with NextAuth",
    isParallelizable: true,
    status: "pending",
  },
  {
    id: "4",
    taskId: "T004",
    description: "Set up database schema",
    isParallelizable: false,
    status: "pending",
  },
];

export const Default: Story = {
  args: {
    tasks: mockTasks,
    onTaskClick: (id) => console.log(`Task clicked: ${id}`),
  },
};

export const AllComplete: Story = {
  args: {
    tasks: mockTasks.map((t) => ({ ...t, status: "complete" })),
  },
};

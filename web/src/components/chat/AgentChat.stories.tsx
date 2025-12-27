import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentChat } from "./AgentChat";
import { ASSIGNEES, type Task } from "@/components/tasks/types";

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Implement user authentication flow",
    status: "in_progress",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-15",
    spec: {
      id: "spec-001",
      name: "SPEC-001: Auth System",
      href: "/projects/catalyst/spec/001-auth-system",
    },
    description:
      "Implement complete auth flow including login, logout, session management.",
  },
  {
    id: "task-2",
    title: "Add project creation wizard",
    status: "todo",
    priority: "medium",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.bill,
    dueDate: "2024-01-25",
    spec: {
      id: "spec-009",
      name: "SPEC-009: Projects",
      href: "/projects/catalyst/spec/009-projects",
    },
    description: "Build step-by-step wizard for creating new projects.",
  },
  {
    id: "task-3",
    title: "Build environment deployment UI",
    status: "completed",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-10",
  },
];

const meta = {
  title: "Components/Chat/AgentChat",
  component: AgentChat,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof AgentChat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    projectSlug: "catalyst",
    tasks: mockTasks,
  },
};

export const NoCompletedTasks: Story = {
  args: {
    projectSlug: "catalyst",
    tasks: mockTasks.filter((t) => t.status !== "completed"),
  },
};

export const AllTasksCompleted: Story = {
  args: {
    projectSlug: "catalyst",
    tasks: mockTasks.map((t) => ({ ...t, status: "completed" as const })),
  },
};

export const EmptyProject: Story = {
  args: {
    projectSlug: "new-project",
    tasks: [],
  },
};

export const MezeProject: Story = {
  args: {
    projectSlug: "meze",
    tasks: [
      {
        id: "task-4",
        title: "Recipe import from URLs",
        status: "in_progress",
        priority: "high",
        type: "feature",
        project: "meze",
        projectSlug: "meze",
        assignee: ASSIGNEES.claude,
        dueDate: "2024-01-18",
        spec: {
          id: "spec-002",
          name: "SPEC-002: Recipe Import",
          href: "/projects/meze/spec/002-recipe-import",
        },
        description: "Parse and import recipes from popular cooking websites.",
      },
      {
        id: "task-5",
        title: "Meal planning calendar",
        status: "todo",
        priority: "medium",
        type: "feature",
        project: "meze",
        projectSlug: "meze",
        assignee: ASSIGNEES.copilot,
        dueDate: "2024-01-22",
        spec: {
          id: "spec-003",
          name: "SPEC-003: Meal Planning",
          href: "/projects/meze/spec/003-meal-planning",
        },
        description: "Weekly meal planner with drag-and-drop interface.",
      },
      {
        id: "task-6",
        title: "Shopping list generation",
        status: "completed",
        priority: "high",
        type: "feature",
        project: "meze",
        projectSlug: "meze",
        assignee: ASSIGNEES.bill,
        dueDate: "2024-01-08",
        description: "Generate shopping lists from selected recipes.",
      },
    ],
  },
};

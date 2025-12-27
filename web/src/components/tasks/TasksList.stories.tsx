import type { Meta, StoryObj } from "@storybook/nextjs";
import { TasksList, Task } from "./TasksList";

const meta: Meta<typeof TasksList> = {
  title: "Components/Tasks/TasksList",
  component: TasksList,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TasksList>;

const sampleTasks: Task[] = [
  {
    id: "task-1",
    title: "Implement user authentication flow",
    status: "in_progress",
    priority: "high",
    project: "catalyst-web",
    projectSlug: "catalyst-web",
    assignee: "Claude",
    dueDate: "2024-01-15",
    type: "feature",
    spec: {
      id: "spec-001",
      name: "SPEC-001: Auth System",
      href: "/projects/catalyst-web/spec/001-auth-system",
    },
  },
  {
    id: "task-2",
    title: "Add project creation wizard",
    status: "todo",
    priority: "medium",
    project: "catalyst-web",
    projectSlug: "catalyst-web",
    assignee: "Bill",
    dueDate: "2024-01-18",
    type: "feature",
    spec: {
      id: "spec-009",
      name: "SPEC-009: Projects",
      href: "/projects/catalyst-web/spec/009-projects",
    },
  },
  {
    id: "task-3",
    title: "Build environment deployment UI",
    status: "completed",
    priority: "high",
    project: "catalyst-web",
    projectSlug: "catalyst-web",
    assignee: "Copilot",
    dueDate: "2024-01-10",
    type: "feature",
  },
  {
    id: "task-4",
    title: "Update Kubernetes manifests",
    status: "in_progress",
    priority: "medium",
    project: "catalyst-infra",
    projectSlug: "catalyst-infra",
    assignee: "Copilot",
    dueDate: "2024-01-20",
    type: "platform",
  },
  {
    id: "task-5",
    title: "Configure CI/CD pipeline",
    status: "todo",
    priority: "high",
    project: "catalyst-infra",
    projectSlug: "catalyst-infra",
    assignee: "Claude",
    dueDate: "2024-01-22",
    type: "platform",
  },
  {
    id: "task-6",
    title: "Add monitoring dashboards",
    status: "todo",
    priority: "low",
    project: "catalyst-infra",
    projectSlug: "catalyst-infra",
    assignee: "Bill",
    dueDate: "2024-01-25",
    type: "platform",
  },
];

export const Default: Story = {
  args: {
    tasks: sampleTasks,
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
  },
};

export const FeatureTasksOnly: Story = {
  args: {
    tasks: sampleTasks.filter((task) => task.type === "feature"),
  },
};

export const PlatformTasksOnly: Story = {
  args: {
    tasks: sampleTasks.filter((task) => task.type === "platform"),
  },
};

export const AllWithSpecs: Story = {
  args: {
    tasks: sampleTasks.map((task) =>
      task.type === "feature"
        ? {
            ...task,
            spec: task.spec || {
              id: `spec-${task.id}`,
              name: `SPEC-${task.id}: ${task.title.slice(0, 20)}`,
              href: `/specs/${task.id}`,
            },
          }
        : task,
    ),
  },
};

export const AllCompleted: Story = {
  args: {
    tasks: sampleTasks.map((task) => ({
      ...task,
      status: "completed" as const,
    })),
  },
};

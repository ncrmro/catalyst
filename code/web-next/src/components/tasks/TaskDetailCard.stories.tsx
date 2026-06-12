import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TaskDetailCard } from "./TaskDetailCard";
import { ASSIGNEES, Task } from "./types";

const meta = {
  title: "Components/Tasks/TaskDetailCard",
  component: TaskDetailCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof TaskDetailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseTask: Task = {
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
    "Implement complete auth flow including login, logout, session management. Should integrate with GitHub OAuth and support team-based access control.",
};

/**
 * Default feature task with spec and description
 */
export const Default: Story = {
  args: {
    task: baseTask,
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

/**
 * Platform task with platform context explaining why the work was needed
 */
export const PlatformTask: Story = {
  args: {
    task: {
      ...baseTask,
      id: "task-2",
      title: "Update Kubernetes manifests",
      type: "platform",
      priority: "medium",
      assignee: ASSIGNEES.copilot,
      spec: undefined,
      description:
        "Migrate K8s manifests to v2 API version for cluster upgrade.",
      platformContext:
        "Cluster upgrade to K8s 1.29 deprecated several v1beta1 APIs. This work ensures continued compatibility and prevents service disruption during the upgrade window.",
    },
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

/**
 * Task without a linked specification
 */
export const NoSpec: Story = {
  args: {
    task: {
      ...baseTask,
      id: "task-3",
      title: "Build environment deployment UI",
      spec: undefined,
      description:
        "Create the UI for deploying new environments from the dashboard.",
    },
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

/**
 * Completed task state
 */
export const Completed: Story = {
  args: {
    task: {
      ...baseTask,
      id: "task-4",
      title: "Set up project structure",
      status: "completed",
      priority: "high",
      description:
        "Initialize the project with Next.js, TypeScript, and Tailwind CSS.",
    },
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

/**
 * High priority critical task
 */
export const HighPriority: Story = {
  args: {
    task: {
      ...baseTask,
      id: "task-5",
      title: "Fix production authentication bug",
      status: "in_progress",
      priority: "critical",
      description:
        "Users are being logged out unexpectedly. Investigate session handling and fix the root cause.",
    },
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

/**
 * Task with a long goal description to test text wrapping
 */
export const LongGoal: Story = {
  args: {
    task: {
      ...baseTask,
      id: "task-6",
      title: "Implement comprehensive monitoring and alerting system",
      description:
        "Design and implement a comprehensive monitoring and alerting system that tracks application health, performance metrics, error rates, and user experience indicators. The system should integrate with existing infrastructure, support custom dashboards, provide real-time alerts through multiple channels (Slack, email, PagerDuty), and include historical data analysis capabilities. Consider scalability requirements for handling high-volume metrics ingestion and storage. The implementation should follow best practices for observability including structured logging, distributed tracing, and metrics aggregation.",
    },
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

/**
 * Todo task state
 */
export const Todo: Story = {
  args: {
    task: {
      ...baseTask,
      id: "task-7",
      title: "Add project creation wizard",
      status: "todo",
      priority: "medium",
      assignee: ASSIGNEES.bill,
      description:
        "Build step-by-step wizard for creating new projects with repo selection, environment config, and deployment settings.",
    },
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

/**
 * Blocked task state
 */
export const Blocked: Story = {
  args: {
    task: {
      ...baseTask,
      id: "task-8",
      title: "Deploy to production cluster",
      status: "blocked",
      priority: "high",
      description:
        "Waiting for infrastructure team to provision the new production cluster.",
    },
    projectSlug: "catalyst",
    projectName: "catalyst",
  },
};

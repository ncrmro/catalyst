// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/nextjs";
import { PlatformTaskQueue, type PlatformTask } from "./PlatformTaskQueue";

const meta: Meta<typeof PlatformTaskQueue> = {
  title: "Platform/PlatformTaskQueue",
  component: PlatformTaskQueue,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PlatformTaskQueue>;

const mockTasks: PlatformTask[] = [
  {
    id: "1",
    type: "dependency_update",
    title: "Update Next.js to v15.1.0",
    description: "Security patch available. Includes performance improvements for App Router.",
    status: "pending",
    priority: "high",
    createdAt: new Date("2024-01-10"),
    retryCount: 0,
  },
  {
    id: "2",
    type: "convention_fix",
    title: "Fix ESLint Configuration Drift",
    description: "Project config differs from organization standard. 3 rules disabled.",
    status: "running",
    priority: "medium",
    createdAt: new Date("2024-01-12"),
    retryCount: 0,
  },
  {
    id: "3",
    type: "flaky_test",
    title: "Quarantine Flaky E2E Test",
    description: "auth-flow.spec.ts failed 3/10 times in last 24h.",
    status: "failed",
    priority: "high",
    createdAt: new Date("2024-01-11"),
    retryCount: 2,
  },
];

export const Default: Story = {
  args: {
    tasks: mockTasks,
    onRetry: (id) => console.log(`Retry ${id}`),
    onApprove: (id) => console.log(`Approve ${id}`),
    onDismiss: (id) => console.log(`Dismiss ${id}`),
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
  },
};

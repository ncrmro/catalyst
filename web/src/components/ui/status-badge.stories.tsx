import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusBadge } from "./status-badge";

const meta = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    status: {
      control: { type: "select" },
      options: [
        "ready",
        "running",
        "completed",
        "deploying",
        "provisioning",
        "pending",
        "failed",
      ],
      description: "The status to display",
    },
    size: {
      control: { type: "select" },
      options: ["xs", "sm", "md"],
      description: "Size of the badge",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default status badge with small size
 */
export const Default: Story = {
  args: {
    status: "running",
  },
};

/**
 * Ready status - green background
 */
export const Ready: Story = {
  args: {
    status: "ready",
  },
};

/**
 * Running status - green background (same as ready)
 */
export const Running: Story = {
  args: {
    status: "running",
  },
};

/**
 * Completed status - primary color background
 */
export const Completed: Story = {
  args: {
    status: "completed",
  },
};

/**
 * Deploying status - secondary color background
 */
export const Deploying: Story = {
  args: {
    status: "deploying",
  },
};

/**
 * Provisioning status - secondary color background (same as deploying)
 */
export const Provisioning: Story = {
  args: {
    status: "provisioning",
  },
};

/**
 * Pending status - gray background
 */
export const Pending: Story = {
  args: {
    status: "pending",
  },
};

/**
 * Failed status - red background
 */
export const Failed: Story = {
  args: {
    status: "failed",
  },
};

/**
 * Extra small size variant
 */
export const ExtraSmall: Story = {
  args: {
    status: "running",
    size: "xs",
  },
};

/**
 * Small size variant (default)
 */
export const Small: Story = {
  args: {
    status: "running",
    size: "sm",
  },
};

/**
 * Medium size variant
 */
export const Medium: Story = {
  args: {
    status: "running",
    size: "md",
  },
};

/**
 * All statuses in a row for comparison
 */
export const AllStatuses: Story = {

  args: { status: "running" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status="ready" />
      <StatusBadge status="running" />
      <StatusBadge status="completed" />
      <StatusBadge status="deploying" />
      <StatusBadge status="provisioning" />
      <StatusBadge status="pending" />
      <StatusBadge status="failed" />
    </div>
  ),
};

/**
 * All sizes comparison
 */
export const AllSizes: Story = {

  args: { status: "running" },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <StatusBadge status="running" size="xs" />
        <span className="text-xs text-on-surface-variant">xs</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <StatusBadge status="running" size="sm" />
        <span className="text-xs text-on-surface-variant">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <StatusBadge status="running" size="md" />
        <span className="text-xs text-on-surface-variant">md</span>
      </div>
    </div>
  ),
};

/**
 * With custom className
 */
export const WithCustomClassName: Story = {
  args: {
    status: "running",
    className: "font-bold uppercase tracking-wider",
  },
};

/**
 * Unknown status - falls back to gray
 */
export const UnknownStatus: Story = {
  args: {
    status: "initializing",
  },
};

/**
 * In context example - environment list
 */
export const InContextEnvironmentList: Story = {

  args: { status: "running" },
  render: () => (
    <div className="w-96 space-y-3 rounded-lg bg-surface p-4">
      <h3 className="text-sm font-medium text-on-surface">
        Preview Environments
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded p-3 hover:bg-surface-variant">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-on-surface">
              feat/preview-environments
            </span>
            <span className="text-xs text-on-surface-variant">PR #42</span>
          </div>
          <StatusBadge status="ready" />
        </div>
        <div className="flex items-center justify-between rounded p-3 hover:bg-surface-variant">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-on-surface">
              feat/new-dashboard
            </span>
            <span className="text-xs text-on-surface-variant">PR #44</span>
          </div>
          <StatusBadge status="deploying" />
        </div>
        <div className="flex items-center justify-between rounded p-3 hover:bg-surface-variant">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-on-surface">
              fix/broken-tests
            </span>
            <span className="text-xs text-on-surface-variant">PR #43</span>
          </div>
          <StatusBadge status="failed" />
        </div>
        <div className="flex items-center justify-between rounded p-3 hover:bg-surface-variant">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-on-surface">
              feat/authentication
            </span>
            <span className="text-xs text-on-surface-variant">PR #45</span>
          </div>
          <StatusBadge status="pending" />
        </div>
      </div>
    </div>
  ),
};

/**
 * In context example - agent runs header
 */
export const InContextAgentHeader: Story = {

  args: { status: "running" },
  render: () => (
    <div className="w-full max-w-2xl space-y-3 rounded-lg bg-surface p-4">
      <h3 className="text-sm font-medium text-on-surface">Recent Agents</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded border border-outline/50 p-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-on-surface">
                implementation-agent
              </span>
              <StatusBadge status="completed" size="xs" />
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Implement feature changes based on PR requirements
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">8m 20s</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded border border-outline/50 p-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-on-surface">
                review-agent
              </span>
              <StatusBadge status="running" size="xs" />
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Review code quality and security
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">2m 15s</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded border border-outline/50 p-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-on-surface">
                test-agent
              </span>
              <StatusBadge status="pending" size="xs" />
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Run test suite and validate changes
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">-</div>
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * In context example - deployment pipeline
 */
export const InContextDeploymentPipeline: Story = {

  args: { status: "running" },
  render: () => (
    <div className="w-full max-w-md space-y-3 rounded-lg bg-surface p-4">
      <h3 className="text-sm font-medium text-on-surface">
        Deployment Pipeline
      </h3>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-container">
            <svg
              className="h-4 w-4 text-on-success-container"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface">Build</span>
              <StatusBadge status="completed" size="xs" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-on-secondary-container border-t-transparent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface">Deploy</span>
              <StatusBadge status="deploying" size="xs" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-variant">
            <div className="h-2 w-2 rounded-full bg-on-surface-variant" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Test</span>
              <StatusBadge status="pending" size="xs" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-variant">
            <div className="h-2 w-2 rounded-full bg-on-surface-variant" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Verify</span>
              <StatusBadge status="pending" size="xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

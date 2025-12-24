import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "./card";
import { StatusBadge } from "./status-badge";
import { StatusIndicator } from "./status-indicator";
import { IconButton } from "./icon-button";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    children: {
      control: "text",
      description: "Card content",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const TerminalIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

/**
 * Default card with simple content
 */
export const Default: Story = {
  args: {
    children: (
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Card Title</h2>
        <p className="text-sm text-on-surface-variant mt-2">
          This is a simple card with some content inside.
        </p>
      </div>
    ),
  },
};

/**
 * Card with header and actions
 */
export const WithHeaderAndActions: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">
          Environment Details
        </h2>
        <StatusBadge status="running" />
      </div>
      <p className="text-sm text-on-surface-variant mt-2">
        Preview environment for PR #42
      </p>
    </Card>
  ),
};

/**
 * Card with list content
 */
export const WithListContent: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <h2 className="text-lg font-semibold text-on-surface mb-4">Agents</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <StatusIndicator status="completed" />
          <span className="text-sm text-on-surface">implementation-agent</span>
          <span className="ml-auto text-xs text-on-surface-variant">
            8m 20s
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator status="running" />
          <span className="text-sm text-on-surface">review-agent</span>
          <span className="ml-auto text-xs text-on-surface-variant">
            2m 15s
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator status="pending" />
          <span className="text-sm text-on-surface">test-agent</span>
          <span className="ml-auto text-xs text-on-surface-variant">-</span>
        </div>
      </div>
    </Card>
  ),
};

/**
 * Card with interactive elements
 */
export const WithInteractiveElements: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">Container</h2>
        <StatusBadge status="running" size="sm" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-on-surface">workspace</div>
            <div className="text-xs text-on-surface-variant">0 restarts</div>
          </div>
          <IconButton
            icon={TerminalIcon}
            label="Shell"
            size="sm"
            onClick={() => alert("Opening terminal...")}
          />
        </div>
      </div>
    </Card>
  ),
};

/**
 * Narrow card layout
 */
export const NarrowLayout: Story = {
  args: { children: null },
  render: () => (
    <div className="w-64">
      <Card>
        <h3 className="text-sm font-medium text-on-surface mb-2">
          Quick Stats
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Environments</span>
            <span className="font-medium text-on-surface">12</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Active Agents</span>
            <span className="font-medium text-on-surface">3</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Containers</span>
            <span className="font-medium text-on-surface">8</span>
          </div>
        </div>
      </Card>
    </div>
  ),
};

/**
 * Wide card layout
 */
export const WideLayout: Story = {
  args: { children: null },
  render: () => (
    <div className="w-[800px]">
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">
              Preview Environment
            </h2>
            <h1 className="text-xl font-bold text-on-surface mt-1">
              feat/preview-environments
            </h1>
            <a
              href="https://pr-42.preview.example.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-on-surface-variant hover:text-primary mt-1 block"
            >
              https://pr-42.preview.example.com
            </a>
            <div className="text-xs text-on-surface-variant mt-2 font-mono">
              Namespace: env-catalyst-web-feat-preview-environments
              <br />
              Pod: workspace-catalyst-web-abc1234
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status="ready" />
            <a
              href="https://pr-42.preview.example.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
            >
              Open Preview
            </a>
          </div>
        </div>
      </Card>
    </div>
  ),
};

/**
 * Empty card state
 */
export const EmptyState: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <div className="text-center py-8">
        <div className="text-sm text-on-surface-variant">
          No environments found
        </div>
        <div className="text-xs text-on-surface-variant mt-1">
          Create a pull request to generate a preview environment
        </div>
      </div>
    </Card>
  ),
};

/**
 * Card with error state
 */
export const ErrorState: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error-container">
          <svg
            className="h-4 w-4 text-on-error-container"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-on-surface">Build Failed</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            The deployment failed due to build errors. Check the logs for more
            details.
          </p>
          <div className="mt-3">
            <IconButton
              icon={
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              }
              label="Retry"
              variant="secondary"
              size="sm"
            />
          </div>
        </div>
      </div>
    </Card>
  ),
};

/**
 * Multiple cards in a grid
 */
export const MultipleCardsGrid: Story = {
  args: { children: null },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-on-surface">
            PR #42: feat/preview-environments
          </h3>
          <StatusBadge status="ready" size="xs" />
        </div>
        <p className="text-xs text-on-surface-variant">
          Created 2 hours ago • Updated 5 minutes ago
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-on-surface">
            PR #44: feat/new-dashboard
          </h3>
          <StatusBadge status="deploying" size="xs" />
        </div>
        <p className="text-xs text-on-surface-variant">
          Created 1 hour ago • Updated 2 minutes ago
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-on-surface">
            PR #43: fix/broken-tests
          </h3>
          <StatusBadge status="failed" size="xs" />
        </div>
        <p className="text-xs text-on-surface-variant">
          Created 3 hours ago • Updated 30 minutes ago
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-on-surface">
            PR #45: feat/authentication
          </h3>
          <StatusBadge status="pending" size="xs" />
        </div>
        <p className="text-xs text-on-surface-variant">
          Created 4 hours ago • Updated 1 hour ago
        </p>
      </Card>
    </div>
  ),
};

/**
 * Nested cards (not recommended, but shown for reference)
 */
export const NestedCards: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <h2 className="text-lg font-semibold text-on-surface mb-4">
        Environment Overview
      </h2>
      <div className="space-y-3">
        <Card>
          <div className="flex items-center gap-2">
            <StatusIndicator status="running" size="sm" />
            <span className="text-sm text-on-surface">workspace</span>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <StatusIndicator status="running" size="sm" />
            <span className="text-sm text-on-surface">proxy</span>
          </div>
        </Card>
      </div>
    </Card>
  ),
};

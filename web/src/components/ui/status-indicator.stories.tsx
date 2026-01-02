import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusIndicator } from "./status-indicator";

const meta = {
	title: "UI/StatusIndicator",
	component: StatusIndicator,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		status: {
			control: { type: "select" },
			options: ["running", "pending", "failed", "completed"],
			description: "The status to display",
		},
		size: {
			control: { type: "select" },
			options: ["sm", "md", "lg"],
			description: "Size of the indicator",
		},
		className: {
			control: "text",
			description: "Additional CSS classes",
		},
		"aria-label": {
			control: "text",
			description: "Accessible label for screen readers",
		},
	},
} satisfies Meta<typeof StatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default status indicator with medium size
 */
export const Default: Story = {
	args: {
		status: "running",
	},
};

/**
 * Running status - yellow dot
 */
export const Running: Story = {
	args: {
		status: "running",
	},
};

/**
 * Completed status - green dot
 */
export const Completed: Story = {
	args: {
		status: "completed",
	},
};

/**
 * Pending status - gray dot
 */
export const Pending: Story = {
	args: {
		status: "pending",
	},
};

/**
 * Failed status - red dot
 */
export const Failed: Story = {
	args: {
		status: "failed",
	},
};

/**
 * Small size variant
 */
export const Small: Story = {
	args: {
		status: "running",
		size: "sm",
	},
};

/**
 * Medium size variant (default)
 */
export const Medium: Story = {
	args: {
		status: "running",
		size: "md",
	},
};

/**
 * Large size variant
 */
export const Large: Story = {
	args: {
		status: "running",
		size: "lg",
	},
};

/**
 * All statuses in a row
 */
export const AllStatuses: Story = {
	args: { status: "running" },
	render: () => (
		<div className="flex items-center gap-4">
			<div className="flex items-center gap-2">
				<StatusIndicator status="running" />
				<span className="text-sm">Running</span>
			</div>
			<div className="flex items-center gap-2">
				<StatusIndicator status="completed" />
				<span className="text-sm">Completed</span>
			</div>
			<div className="flex items-center gap-2">
				<StatusIndicator status="pending" />
				<span className="text-sm">Pending</span>
			</div>
			<div className="flex items-center gap-2">
				<StatusIndicator status="failed" />
				<span className="text-sm">Failed</span>
			</div>
		</div>
	),
};

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
	args: { status: "running" },
	render: () => (
		<div className="flex items-center gap-6">
			<div className="flex items-center gap-2">
				<StatusIndicator status="running" size="sm" />
				<span className="text-sm">Small</span>
			</div>
			<div className="flex items-center gap-2">
				<StatusIndicator status="running" size="md" />
				<span className="text-sm">Medium</span>
			</div>
			<div className="flex items-center gap-2">
				<StatusIndicator status="running" size="lg" />
				<span className="text-sm">Large</span>
			</div>
		</div>
	),
};

/**
 * With custom accessible label
 */
export const WithAccessibleLabel: Story = {
	args: {
		status: "failed",
		"aria-label": "Deployment failed - build error",
	},
};

/**
 * With custom className
 */
export const WithCustomClassName: Story = {
	args: {
		status: "running",
		className: "ring-2 ring-yellow-500/50 ring-offset-2",
	},
};

/**
 * In context example - agent status list
 */
export const InContextAgentList: Story = {
	args: { status: "running" },
	render: () => (
		<div className="w-80 space-y-3 rounded-lg bg-surface p-4">
			<h3 className="text-sm font-medium text-on-surface">Agent Runs</h3>
			<div className="space-y-2">
				<div className="flex items-center justify-between rounded p-2 hover:bg-surface-variant">
					<div className="flex items-center gap-3">
						<StatusIndicator status="completed" />
						<span className="text-sm text-on-surface">
							implementation-agent
						</span>
					</div>
					<span className="text-xs text-on-surface-variant">8m 20s</span>
				</div>
				<div className="flex items-center justify-between rounded p-2 hover:bg-surface-variant">
					<div className="flex items-center gap-3">
						<StatusIndicator status="running" />
						<span className="text-sm text-on-surface">review-agent</span>
					</div>
					<span className="text-xs text-on-surface-variant">2m 15s</span>
				</div>
				<div className="flex items-center justify-between rounded p-2 hover:bg-surface-variant">
					<div className="flex items-center gap-3">
						<StatusIndicator status="pending" />
						<span className="text-sm text-on-surface">test-agent</span>
					</div>
					<span className="text-xs text-on-surface-variant">-</span>
				</div>
			</div>
		</div>
	),
};

/**
 * In context example - container status list
 */
export const InContextContainerList: Story = {
	args: { status: "running" },
	render: () => (
		<div className="w-80 space-y-3 rounded-lg bg-surface p-4">
			<h3 className="text-sm font-medium text-on-surface">Containers</h3>
			<div className="space-y-2">
				<div className="flex items-center justify-between rounded p-2 hover:bg-surface-variant">
					<div className="flex items-center gap-3">
						<StatusIndicator status="completed" size="sm" />
						<span className="text-sm text-on-surface">workspace</span>
					</div>
					<span className="text-xs text-on-surface-variant">0 restarts</span>
				</div>
				<div className="flex items-center justify-between rounded p-2 hover:bg-surface-variant">
					<div className="flex items-center gap-3">
						<StatusIndicator status="completed" size="sm" />
						<span className="text-sm text-on-surface">proxy</span>
					</div>
					<span className="text-xs text-on-surface-variant">0 restarts</span>
				</div>
				<div className="flex items-center justify-between rounded p-2 hover:bg-surface-variant">
					<div className="flex items-center gap-3">
						<StatusIndicator status="failed" size="sm" />
						<span className="text-sm text-on-surface">logger</span>
					</div>
					<span className="text-xs text-on-surface-variant">3 restarts</span>
				</div>
			</div>
		</div>
	),
};

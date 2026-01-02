import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ContainerRow } from "./container-row";

const meta = {
	title: "Components/ContainerRow",
	component: ContainerRow,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
	args: {
		onClick: fn(),
		onOpenShell: fn(),
	},
	argTypes: {
		name: {
			control: "text",
			description: "Container name",
		},
		status: {
			control: { type: "select" },
			options: ["running", "pending", "failed", "completed"],
			description: "Container status",
		},
		restarts: {
			control: { type: "number", min: 0 },
			description: "Number of restarts",
		},
		isSelected: {
			control: "boolean",
			description: "Whether the container is selected",
		},
		className: {
			control: "text",
			description: "Additional CSS classes",
		},
	},
} satisfies Meta<typeof ContainerRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default running container
 */
export const Default: Story = {
	args: {
		name: "workspace",
		status: "running",
		restarts: 0,
	},
};

/**
 * Running container
 */
export const Running: Story = {
	args: {
		name: "workspace",
		status: "running",
		restarts: 0,
	},
};

/**
 * Pending container - shell button disabled
 */
export const Pending: Story = {
	args: {
		name: "sidecar",
		status: "pending",
		restarts: 0,
	},
};

/**
 * Failed container with multiple restarts
 */
export const Failed: Story = {
	args: {
		name: "logger",
		status: "failed",
		restarts: 8,
	},
};

/**
 * Completed container
 */
export const Completed: Story = {
	args: {
		name: "init-container",
		status: "completed",
		restarts: 0,
	},
};

/**
 * Selected container
 */
export const Selected: Story = {
	args: {
		name: "workspace",
		status: "running",
		restarts: 0,
		isSelected: true,
	},
};

/**
 * Container with single restart
 */
export const SingleRestart: Story = {
	args: {
		name: "proxy",
		status: "running",
		restarts: 1,
	},
};

/**
 * Unstable container with many restarts
 */
export const Unstable: Story = {
	args: {
		name: "flaky-service",
		status: "running",
		restarts: 15,
	},
};

/**
 * Using factory - workspace container
 */
export const FactoryWorkspace: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => {
		const container = {
			name: "workspace",
			status: "running" as const,
			restarts: 0,
		};
		return (
			<ContainerRow
				name={container.name}
				status={container.status}
				restarts={container.restarts}
				onClick={() => alert(`Selected: ${container.name}`)}
				onOpenShell={() => alert(`Opening shell for: ${container.name}`)}
			/>
		);
	},
};

/**
 * Using factory - failed sidecar
 */
export const FactorySidecarFailed: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => {
		const container = {
			name: "logger",
			status: "failed" as const,
			restarts: 8,
		};
		return (
			<ContainerRow
				name={container.name}
				status={container.status}
				restarts={container.restarts}
				onClick={() => alert(`Selected: ${container.name}`)}
				onOpenShell={() => alert(`Opening shell for: ${container.name}`)}
			/>
		);
	},
};

/**
 * All statuses comparison
 */
export const AllStatuses: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => (
		<div className="space-y-px bg-outline/50">
			<ContainerRow
				name="workspace"
				status="running"
				restarts={0}
				onClick={() => alert("Selected: workspace")}
				onOpenShell={() => alert("Opening shell")}
			/>
			<ContainerRow
				name="sidecar"
				status="pending"
				restarts={0}
				onClick={() => alert("Selected: sidecar")}
				onOpenShell={() => alert("Opening shell")}
			/>
			<ContainerRow
				name="logger"
				status="failed"
				restarts={3}
				onClick={() => alert("Selected: logger")}
				onOpenShell={() => alert("Opening shell")}
			/>
			<ContainerRow
				name="init-db"
				status="completed"
				restarts={0}
				onClick={() => alert("Selected: init-db")}
				onOpenShell={() => alert("Opening shell")}
			/>
		</div>
	),
};

/**
 * Selection states
 */
export const SelectionStates: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => (
		<div className="space-y-px bg-outline/50">
			<ContainerRow
				name="workspace"
				status="running"
				restarts={0}
				isSelected
				onClick={() => alert("Selected: workspace")}
				onOpenShell={() => alert("Opening shell")}
			/>
			<ContainerRow
				name="proxy"
				status="running"
				restarts={0}
				onClick={() => alert("Selected: proxy")}
				onOpenShell={() => alert("Opening shell")}
			/>
			<ContainerRow
				name="logger"
				status="running"
				restarts={1}
				onClick={() => alert("Selected: logger")}
				onOpenShell={() => alert("Opening shell")}
			/>
		</div>
	),
};

/**
 * In context - container list
 */
export const InContextList: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => {
		const containers = [
			{ name: "workspace", status: "running" as const, restarts: 0 },
			{ name: "proxy", status: "running" as const, restarts: 0 },
			{ name: "logger", status: "failed" as const, restarts: 8 },
		];

		return (
			<div className="w-full max-w-3xl">
				<div className="rounded-lg bg-surface p-4">
					<h2 className="text-lg font-semibold text-on-surface mb-4">
						Containers
					</h2>
					<div className="divide-y divide-outline/50 -mx-4">
						{containers.map((container, index) => (
							<ContainerRow
								key={container.name}
								name={container.name}
								status={container.status}
								restarts={container.restarts}
								isSelected={index === 0}
								onClick={() => alert(`Selected: ${container.name}`)}
								onOpenShell={() =>
									alert(`Opening shell for: ${container.name}`)
								}
							/>
						))}
					</div>
				</div>
			</div>
		);
	},
};

/**
 * Interactive example with state
 */
export const Interactive: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: function InteractiveExample() {
		const [selectedContainer, setSelectedContainer] = React.useState<
			string | null
		>("workspace");

		const containers = [
			{ name: "workspace", status: "running" as const, restarts: 0 },
			{ name: "proxy", status: "running" as const, restarts: 0 },
			{ name: "logger", status: "failed" as const, restarts: 3 },
			{ name: "sidecar", status: "pending" as const, restarts: 0 },
		];

		return (
			<div className="w-full max-w-3xl space-y-4">
				<div className="text-sm text-on-surface">
					Selected container: <strong>{selectedContainer || "none"}</strong>
				</div>
				<div className="divide-y divide-outline/50 bg-surface rounded-lg overflow-hidden">
					{containers.map((container) => (
						<ContainerRow
							key={container.name}
							name={container.name}
							status={container.status}
							restarts={container.restarts}
							isSelected={selectedContainer === container.name}
							onClick={() => setSelectedContainer(container.name)}
							onOpenShell={() =>
								alert(`Opening shell for ${container.name}...`)
							}
						/>
					))}
				</div>
			</div>
		);
	},
};

// React import for the Interactive story
import React from "react";

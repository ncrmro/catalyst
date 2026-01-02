import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";
import { fn } from "storybook/test";
import { AgentRunCard } from "./agent-run-card";

const meta = {
	title: "Components/AgentRunCard",
	component: AgentRunCard,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
	args: {
		onToggle: fn(),
	},
	argTypes: {
		id: {
			control: "text",
			description: "Unique identifier",
		},
		agent: {
			control: "text",
			description: "Agent type/name",
		},
		goal: {
			control: "text",
			description: "Agent goal description",
		},
		status: {
			control: { type: "select" },
			options: ["running", "pending", "failed", "completed"],
			description: "Agent status",
		},
		startTime: {
			control: "text",
			description: "Start time",
		},
		duration: {
			control: "text",
			description: "Duration",
		},
		logs: {
			control: "text",
			description: "Agent logs",
		},
		isExpanded: {
			control: "boolean",
			description: "Whether logs are expanded",
		},
		className: {
			control: "text",
			description: "Additional CSS classes",
		},
	},
} satisfies Meta<typeof AgentRunCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleLogs = `[10:15:00] Implementation agent initialized
[10:15:02] Fetched PR #42: "feat: add preview environments"
[10:15:05] Analyzing requirements from PR description...
[10:15:10] Identified 3 implementation tasks
[10:15:30] Starting task 1: EnvironmentsSection component
[10:17:00] ✓ Created environments-section.tsx
[10:17:05] Starting task 2: Environment detail page
[10:19:30] ✓ Created env/[envSlug]/page.tsx
[10:19:35] Starting task 3: Mock data
[10:21:00] ✓ Added mock preview environments
[10:21:15] Running type check...
[10:22:00] ✓ No type errors
[10:22:30] Running lint...
[10:23:00] ✓ No lint errors
[10:23:20] Implementation complete`;

/**
 * Default collapsed agent run card
 */
export const Default: Story = {
	args: {
		id: "agent-1",
		agent: "implementation-agent",
		goal: "Implement preview environments feature",
		status: "completed",
		startTime: "2024-12-18 10:15:00",
		duration: "8m 20s",
		logs: sampleLogs,
		isExpanded: false,
	},
};

/**
 * Expanded card showing logs
 */
export const Expanded: Story = {
	args: {
		id: "agent-1",
		agent: "implementation-agent",
		goal: "Implement preview environments feature",
		status: "completed",
		startTime: "2024-12-18 10:15:00",
		duration: "8m 20s",
		logs: sampleLogs,
		isExpanded: true,
	},
};

/**
 * Running agent
 */
export const Running: Story = {
	args: {
		id: "agent-2",
		agent: "review-agent",
		goal: "Review code quality and security",
		status: "running",
		startTime: "2024-12-18 10:25:00",
		duration: "2m 15s",
		logs: `[10:25:00] Review agent initialized
[10:25:05] Analyzing code changes...
[10:26:00] Running security scan...
[10:27:00] Checking code quality...`,
		isExpanded: true,
	},
};

/**
 * Pending agent
 */
export const Pending: Story = {
	args: {
		id: "agent-3",
		agent: "test-agent",
		goal: "Run test suite and validate changes",
		status: "pending",
		startTime: "-",
		duration: "-",
		logs: "",
		isExpanded: false,
	},
};

/**
 * Failed agent
 */
export const Failed: Story = {
	args: {
		id: "agent-4",
		agent: "deployment-agent",
		goal: "Deploy to preview environment",
		status: "failed",
		startTime: "2024-12-18 10:30:00",
		duration: "1m 30s",
		logs: `[10:30:00] Deployment agent initialized
[10:30:05] Building container image...
[10:31:00] ERROR: Build failed - missing dependency
[10:31:05] ERROR: react-dom not found
[10:31:30] ✗ Deployment failed`,
		isExpanded: true,
	},
};

/**
 * Using factory - implementation agent completed
 */
export const FactoryImplementationCompleted: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => {
		const agent = {
			id: "1",
			agent: "implementation-agent",
			goal: "Implement user authentication feature",
			status: "completed" as const,
			startTime: "2024-01-15 10:30:00",
			duration: "8m 20s",
			logs: sampleLogs,
		};
		return (
			<AgentRunCard
				id={agent.id}
				agent={agent.agent}
				goal={agent.goal}
				status={agent.status}
				startTime={agent.startTime}
				duration={agent.duration}
				logs={agent.logs}
				isExpanded
				onToggle={() => alert("Toggle")}
			/>
		);
	},
};

/**
 * Using factory - test agent failed
 */
export const FactoryTestFailed: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => {
		const agent = {
			id: "2",
			agent: "test-agent",
			goal: "Run test suite and validate changes",
			status: "failed" as const,
			startTime: "2024-01-15 10:35:00",
			duration: "3m 45s",
			logs: `[10:35:00] Test agent initialized
[10:35:05] Running unit tests...
[10:37:30] ERROR: 5 tests failed
[10:38:45] ✗ Test run failed`,
		};
		return (
			<AgentRunCard
				id={agent.id}
				agent={agent.agent}
				goal={agent.goal}
				status={agent.status}
				startTime={agent.startTime}
				duration={agent.duration}
				logs={agent.logs}
				isExpanded
				onToggle={() => alert("Toggle")}
			/>
		);
	},
};

/**
 * Using factory - review agent running
 */
export const FactoryReviewRunning: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => {
		const agent = {
			id: "3",
			agent: "review-agent",
			goal: "Review code quality and security",
			status: "running" as const,
			startTime: "2024-01-15 10:40:00",
			duration: "2m 15s",
			logs: `[10:40:00] Review agent initialized
[10:40:05] Analyzing code changes...
[10:41:00] Running security scan...
[10:42:00] Checking code quality...`,
		};
		return (
			<AgentRunCard
				id={agent.id}
				agent={agent.agent}
				goal={agent.goal}
				status={agent.status}
				startTime={agent.startTime}
				duration={agent.duration}
				logs={agent.logs}
				isExpanded
				onToggle={() => alert("Toggle")}
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
	render: () => {
		const agents = [
			{
				id: "1",
				agent: "implementation-agent",
				goal: "Implement feature changes",
				status: "completed" as const,
				startTime: "2024-01-15 10:30:00",
				duration: "8m 20s",
				logs: sampleLogs,
			},
			{
				id: "2",
				agent: "review-agent",
				goal: "Review code quality",
				status: "running" as const,
				startTime: "2024-01-15 10:40:00",
				duration: "2m 15s",
				logs: "Reviewing code...",
			},
			{
				id: "3",
				agent: "test-agent",
				goal: "Run tests",
				status: "pending" as const,
				startTime: "-",
				duration: "-",
				logs: "",
			},
			{
				id: "4",
				agent: "refactor-agent",
				goal: "Refactor code",
				status: "failed" as const,
				startTime: "2024-01-15 10:50:00",
				duration: "1m 30s",
				logs: "ERROR: Refactoring failed",
			},
		];

		return (
			<div className="space-y-3 max-w-3xl">
				{agents.map((agent) => (
					<AgentRunCard
						key={agent.id}
						id={agent.id}
						agent={agent.agent}
						goal={agent.goal}
						status={agent.status}
						startTime={agent.startTime}
						duration={agent.duration}
						logs={agent.logs}
						onToggle={() => alert(`Toggle: ${agent.id}`)}
					/>
				))}
			</div>
		);
	},
};

/**
 * Interactive example with toggle state
 */
export const Interactive: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: function InteractiveExample() {
		const [expandedId, setExpandedId] = React.useState<string | null>(
			"agent-1",
		);

		const agents = [
			{
				id: "agent-1",
				agent: "implementation-agent",
				goal: "Implement feature changes",
				status: "completed" as const,
				startTime: "2024-01-15 10:30:00",
				duration: "8m 20s",
				logs: sampleLogs,
			},
			{
				id: "agent-2",
				agent: "review-agent",
				goal: "Review code quality",
				status: "running" as const,
				startTime: "2024-01-15 10:40:00",
				duration: "2m 15s",
				logs: "Reviewing code...",
			},
			{
				id: "agent-3",
				agent: "test-agent",
				goal: "Run tests",
				status: "pending" as const,
				startTime: "-",
				duration: "-",
				logs: "",
			},
		];

		return (
			<div className="space-y-3 max-w-3xl">
				<div className="text-sm text-on-surface mb-4">
					Expanded agent: <strong>{expandedId || "none"}</strong>
				</div>
				{agents.map((agent) => (
					<AgentRunCard
						key={agent.id}
						id={agent.id}
						agent={agent.agent}
						goal={agent.goal}
						status={agent.status}
						startTime={agent.startTime}
						duration={agent.duration}
						logs={agent.logs}
						isExpanded={expandedId === agent.id}
						onToggle={() =>
							setExpandedId(expandedId === agent.id ? null : agent.id)
						}
					/>
				))}
			</div>
		);
	},
};

/**
 * In context - agents list
 */
export const InContextAgentsList: Story = {
	// @ts-expect-error - Custom render provides data directly
	args: {},
	render: () => {
		const [expandedId, setExpandedId] = React.useState<string | null>(null);

		const agents = [
			{
				id: "agent-1",
				agent: "implementation-agent",
				goal: "Implement feature changes based on PR requirements",
				status: "completed" as const,
				startTime: "2024-01-15 10:30:00",
				duration: "8m 20s",
				logs: sampleLogs,
			},
			{
				id: "agent-2",
				agent: "test-agent",
				goal: "Run test suite and validate changes",
				status: "completed" as const,
				startTime: "2024-01-15 10:40:00",
				duration: "5m 30s",
				logs: "All tests passed",
			},
			{
				id: "agent-3",
				agent: "review-agent",
				goal: "Review code quality and security",
				status: "running" as const,
				startTime: "2024-01-15 10:50:00",
				duration: "2m 15s",
				logs: "Reviewing code...",
			},
		];

		return (
			<div className="w-full max-w-3xl">
				<div className="rounded-lg bg-surface p-4">
					<h2 className="text-lg font-semibold text-on-surface mb-4">Agents</h2>
					<div className="space-y-3">
						{agents.map((agent) => (
							<AgentRunCard
								key={agent.id}
								id={agent.id}
								agent={agent.agent}
								goal={agent.goal}
								status={agent.status}
								startTime={agent.startTime}
								duration={agent.duration}
								logs={agent.logs}
								isExpanded={expandedId === agent.id}
								onToggle={() =>
									setExpandedId(expandedId === agent.id ? null : agent.id)
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
 * Long goal text - text truncation
 */
export const LongGoalText: Story = {
	args: {
		id: "agent-long",
		agent: "implementation-agent",
		goal: "Implement a very long and detailed goal description that should be truncated with an ellipsis when it exceeds the available width of the container to prevent layout issues and maintain a clean appearance",
		status: "completed",
		startTime: "2024-12-18 10:15:00",
		duration: "8m 20s",
		logs: sampleLogs,
		isExpanded: false,
	},
};

/**
 * Empty logs
 */
export const EmptyLogs: Story = {
	args: {
		id: "agent-empty",
		agent: "test-agent",
		goal: "Waiting to start",
		status: "pending",
		startTime: "-",
		duration: "-",
		logs: "",
		isExpanded: true,
	},
};

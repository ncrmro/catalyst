import { workItems } from "@fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PriorityScoreDisplay } from "./priority-score-display";

const meta = {
	title: "Components/UI/PriorityScoreDisplay",
	component: PriorityScoreDisplay,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		showFactors: {
			control: "boolean",
			description: "Show factor breakdown",
		},
		showAppliedRules: {
			control: "boolean",
			description: "Show applied prioritization rules",
		},
	},
} satisfies Meta<typeof PriorityScoreDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * High priority (score >= 70) displays in red.
 */
export const HighPriority: Story = {
	args: {
		priority: workItems.highPriority[0].priority,
	},
};

/**
 * Medium priority (40 <= score < 70) displays in yellow.
 */
export const MediumPriority: Story = {
	args: {
		priority: workItems.mediumPriority[0].priority,
	},
};

/**
 * Low priority (score < 40) displays in green.
 */
export const LowPriority: Story = {
	args: {
		priority: workItems.lowPriority[0].priority,
	},
};

/**
 * Display with factor breakdown showing impact, effort, urgency, alignment, and risk.
 */
export const WithFactors: Story = {
	args: {
		priority: workItems.highPriority[0].priority,
		showFactors: true,
	},
};

/**
 * Display with applied prioritization rules shown as tags.
 */
export const WithAppliedRules: Story = {
	args: {
		priority: workItems.highPriority[0].priority,
		showAppliedRules: true,
	},
};

/**
 * Full display with both factors and applied rules visible.
 */
export const FullDisplay: Story = {
	args: {
		priority: workItems.highPriority[0].priority,
		showFactors: true,
		showAppliedRules: true,
	},
};

/**
 * All priority levels displayed together for comparison.
 */
export const AllPriorityLevels: Story = {
	args: {
		priority: workItems.highPriority[0].priority,
	},
	render: () => (
		<div className="flex gap-8">
			<div className="w-48">
				<p className="mb-2 text-sm font-medium">High Priority</p>
				<PriorityScoreDisplay priority={workItems.highPriority[0].priority} />
			</div>
			<div className="w-48">
				<p className="mb-2 text-sm font-medium">Medium Priority</p>
				<PriorityScoreDisplay priority={workItems.mediumPriority[0].priority} />
			</div>
			<div className="w-48">
				<p className="mb-2 text-sm font-medium">Low Priority</p>
				<PriorityScoreDisplay priority={workItems.lowPriority[0].priority} />
			</div>
		</div>
	),
};

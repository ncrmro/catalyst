// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/nextjs";
import { SpecBrowser, type SpecFolder } from "./SpecBrowser";

const meta: Meta<typeof SpecBrowser> = {
	title: "Platform/SpecBrowser",
	component: SpecBrowser,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SpecBrowser>;

const mockSpecs: SpecFolder[] = [
	{
		id: "1",
		slug: "001-user-auth",
		number: 1,
		title: "User Authentication & Authorization",
		status: "complete",
		completionPercentage: 100,
		taskCount: 12,
		completedTaskCount: 12,
		lastSyncedAt: new Date(),
	},
	{
		id: "2",
		slug: "002-project-management",
		number: 2,
		title: "Project Management Core",
		status: "active",
		completionPercentage: 65,
		taskCount: 20,
		completedTaskCount: 13,
		lastSyncedAt: new Date(),
	},
	{
		id: "3",
		slug: "003-billing",
		number: 3,
		title: "Subscription Billing System",
		status: "draft",
		completionPercentage: 10,
		taskCount: 8,
		completedTaskCount: 1,
		lastSyncedAt: new Date(),
	},
];

export const Default: Story = {
	args: {
		specs: mockSpecs,
		projectId: "proj-123",
		projectSlug: "catalyst",
	},
};

export const Empty: Story = {
	args: {
		specs: [],
		projectId: "proj-123",
		projectSlug: "catalyst",
	},
};

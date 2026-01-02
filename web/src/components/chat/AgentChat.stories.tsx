import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentChat } from "./AgentChat";

const meta = {
	title: "Components/Chat/AgentChat",
	component: AgentChat,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
} satisfies Meta<typeof AgentChat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		projectSlug: "catalyst",
	},
};

export const MezeProject: Story = {
	args: {
		projectSlug: "meze",
	},
};

export const NewProject: Story = {
	args: {
		projectSlug: "new-project",
	},
};

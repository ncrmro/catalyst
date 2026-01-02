// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";
import { MarkdownRenderer } from "./index";
import "./styles.css";

const meta: Meta<typeof MarkdownRenderer> = {
	title: "Packages/ReactMarkdown/MarkdownRenderer",
	component: MarkdownRenderer,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
};

export default meta;
type Story = StoryObj<typeof MarkdownRenderer>;

export const Default: Story = {
	args: {
		content: `
# Hello World

This is a **markdown** example with some *features*.

- List item 1
- List item 2

\`\`\`typescript
const x = 1;
function hello() {
  console.log("Hello");
}
\`\`\`

> A blockquote
    `,
	},
};

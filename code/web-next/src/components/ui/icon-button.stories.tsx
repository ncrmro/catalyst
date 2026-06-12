import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconButton } from "./icon-button";

const meta = {
  title: "UI/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "ghost", "error"],
      description: "Visual variant of the button",
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
      description: "Size of the button",
    },
    label: {
      control: "text",
      description: "Optional text label next to icon",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Common icons used in examples
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

const TrashIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const EditIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const PlayIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const PlusIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

/**
 * Default icon button with terminal icon
 */
export const Default: Story = {
  args: {
    icon: TerminalIcon,
    "aria-label": "Open terminal",
  },
};

/**
 * Icon button with text label
 */
export const WithLabel: Story = {
  args: {
    icon: TerminalIcon,
    label: "Shell",
  },
};

/**
 * Primary variant (default)
 */
export const Primary: Story = {
  args: {
    icon: PlayIcon,
    label: "Run",
    variant: "primary",
  },
};

/**
 * Secondary variant
 */
export const Secondary: Story = {
  args: {
    icon: RefreshIcon,
    label: "Refresh",
    variant: "secondary",
  },
};

/**
 * Ghost variant - transparent with border
 */
export const Ghost: Story = {
  args: {
    icon: EditIcon,
    label: "Edit",
    variant: "ghost",
  },
};

/**
 * Error variant - red destructive action
 */
export const Error: Story = {
  args: {
    icon: TrashIcon,
    label: "Delete",
    variant: "error",
  },
};

/**
 * Small size variant
 */
export const Small: Story = {
  args: {
    icon: TerminalIcon,
    label: "Shell",
    size: "sm",
  },
};

/**
 * Medium size variant (default)
 */
export const Medium: Story = {
  args: {
    icon: TerminalIcon,
    label: "Shell",
    size: "md",
  },
};

/**
 * Large size variant
 */
export const Large: Story = {
  args: {
    icon: TerminalIcon,
    label: "Shell",
    size: "lg",
  },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
  args: {
    icon: TerminalIcon,
    label: "Shell",
    disabled: true,
    title: "Container must be running to open shell",
  },
};

/**
 * Icon only (no label)
 */
export const IconOnly: Story = {
  args: {
    icon: EditIcon,
    "aria-label": "Edit",
  },
};

/**
 * All variants comparison
 */
export const AllVariants: Story = {
  args: { icon: null },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={PlayIcon} label="Primary" variant="primary" />
        <span className="text-xs text-on-surface-variant">Primary</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={RefreshIcon} label="Secondary" variant="secondary" />
        <span className="text-xs text-on-surface-variant">Secondary</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={EditIcon} label="Ghost" variant="ghost" />
        <span className="text-xs text-on-surface-variant">Ghost</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={TrashIcon} label="Error" variant="error" />
        <span className="text-xs text-on-surface-variant">Error</span>
      </div>
    </div>
  ),
};

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
  args: { icon: null },
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={TerminalIcon} label="Shell" size="sm" />
        <span className="text-xs text-on-surface-variant">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={TerminalIcon} label="Shell" size="md" />
        <span className="text-xs text-on-surface-variant">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={TerminalIcon} label="Shell" size="lg" />
        <span className="text-xs text-on-surface-variant">Large</span>
      </div>
    </div>
  ),
};

/**
 * Icon only - all sizes
 */
export const IconOnlySizes: Story = {
  args: { icon: null },
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={EditIcon} size="sm" aria-label="Edit" />
        <span className="text-xs text-on-surface-variant">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={EditIcon} size="md" aria-label="Edit" />
        <span className="text-xs text-on-surface-variant">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton icon={EditIcon} size="lg" aria-label="Edit" />
        <span className="text-xs text-on-surface-variant">Large</span>
      </div>
    </div>
  ),
};

/**
 * In context example - container actions
 */
export const InContextContainerActions: Story = {
  args: { icon: null },
  render: () => (
    <div className="w-80 rounded-lg bg-surface p-4">
      <h3 className="text-sm font-medium text-on-surface mb-3">
        Container: workspace
      </h3>
      <div className="flex items-center gap-2">
        <IconButton
          icon={TerminalIcon}
          label="Shell"
          size="sm"
          onClick={() => alert("Opening terminal...")}
        />
        <IconButton
          icon={RefreshIcon}
          label="Restart"
          variant="secondary"
          size="sm"
          onClick={() => alert("Restarting container...")}
        />
        <IconButton
          icon={TrashIcon}
          label="Delete"
          variant="error"
          size="sm"
          onClick={() => alert("Deleting container...")}
        />
      </div>
    </div>
  ),
};

/**
 * In context example - toolbar
 */
export const InContextToolbar: Story = {
  args: { icon: null },
  render: () => (
    <div className="flex items-center gap-2 rounded-lg bg-surface p-3 border border-outline/50">
      <IconButton icon={PlusIcon} variant="ghost" aria-label="Add" />
      <IconButton icon={EditIcon} variant="ghost" aria-label="Edit" />
      <IconButton
        icon={TrashIcon}
        variant="ghost"
        aria-label="Delete"
        disabled
      />
      <div className="h-6 w-px bg-outline/50 mx-1" />
      <IconButton icon={RefreshIcon} variant="ghost" aria-label="Refresh" />
    </div>
  ),
};

/**
 * In context example - agent actions
 */
export const InContextAgentActions: Story = {
  args: { icon: null },
  render: () => (
    <div className="w-full max-w-md rounded-lg bg-surface p-4 border border-outline/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-on-surface">
            implementation-agent
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Status: Completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            icon={PlayIcon}
            label="Retry"
            variant="secondary"
            size="sm"
          />
          <IconButton
            icon={TrashIcon}
            variant="ghost"
            size="sm"
            aria-label="Delete"
          />
        </div>
      </div>
      <div className="text-xs text-on-surface-variant">Completed in 8m 20s</div>
    </div>
  ),
};

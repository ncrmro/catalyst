import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LogViewer } from "./log-viewer";

const meta = {
  title: "Components/LogViewer",
  component: LogViewer,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    logs: {
      control: "text",
      description: "Log content to display",
    },
    maxHeight: {
      control: "text",
      description: "Maximum height CSS class",
    },
    showLineNumbers: {
      control: "boolean",
      description: "Whether to show line numbers",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof LogViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const simpleLogs = `[10:15:00] Build started
[10:15:30] Installing dependencies...
[10:16:00] Dependencies installed
[10:16:15] Running build...
[10:17:00] Build complete
[10:17:05] ✓ Success`;

const errorLogs = `[10:15:00] Build started
[10:15:30] Installing dependencies...
[10:16:00] Dependencies installed
[10:16:15] Running build...
[10:16:45] ERROR: Module not found: 'react-dom'
[10:16:45] ERROR: Build failed with 1 error
[10:16:45] ✗ Failed`;

const longLogs = `[10:15:00] Implementation agent initialized
[10:15:02] Fetched PR #42: "feat: add preview environments"
[10:15:05] Analyzing requirements from PR description...
[10:15:10] Identified 3 implementation tasks:
  - Add EnvironmentsSection component
  - Create environment detail page
  - Add mock data for preview environments
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
[10:23:20] Implementation complete
[10:23:25] Committing changes...
[10:23:30] ✓ Committed with message: "feat: add preview environments"
[10:23:35] Pushing to remote...
[10:23:40] ✓ Pushed to origin/feat/preview-environments`;

/**
 * Default log viewer with simple logs
 */
export const Default: Story = {
  args: {
    logs: simpleLogs,
  },
};

/**
 * Log viewer with line numbers
 */
export const WithLineNumbers: Story = {
  args: {
    logs: simpleLogs,
    showLineNumbers: true,
  },
};

/**
 * Error logs with red error messages
 */
export const ErrorLogs: Story = {
  args: {
    logs: errorLogs,
  },
};

/**
 * Long logs requiring scrolling
 */
export const LongLogs: Story = {
  args: {
    logs: longLogs,
  },
};

/**
 * Long logs with line numbers
 */
export const LongLogsWithLineNumbers: Story = {
  args: {
    logs: longLogs,
    showLineNumbers: true,
  },
};

/**
 * Custom max height
 */
export const CustomMaxHeight: Story = {
  args: {
    logs: longLogs,
    maxHeight: "max-h-96",
  },
};

/**
 * Empty logs
 */
export const EmptyLogs: Story = {
  args: {
    logs: "",
  },
};

/**
 * Single line log
 */
export const SingleLine: Story = {
  args: {
    logs: "[10:15:00] Process started",
  },
};

/**
 * Using factory-generated logs - completed agent
 */
export const FactoryGeneratedCompleted: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => {
    const logs = `[10:30:00] Implementation agent initialized
[10:30:05] Analyzing requirements...
[10:31:00] Creating components...
[10:35:00] Running tests...
[10:37:00] ✓ All tests passed
[10:37:30] ✓ Implementation complete`;
    return <LogViewer logs={logs} showLineNumbers />;
  },
};

/**
 * Using factory-generated logs - failed agent
 */
export const FactoryGeneratedFailed: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => {
    const logs = `[10:40:00] Test agent initialized
[10:40:05] Running unit tests...
[10:42:00] ERROR: 5 tests failed
[10:42:05] ERROR: AssertionError in auth.test.ts
[10:42:30] ✗ Test run failed`;
    return <LogViewer logs={logs} showLineNumbers />;
  },
};

/**
 * Using factory-generated logs - running agent (truncated)
 */
export const FactoryGeneratedRunning: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => {
    const logs = `[10:50:00] Review agent initialized
[10:50:05] Analyzing code changes...
[10:51:00] Running security scan...
[10:52:00] Checking code quality...`;
    return <LogViewer logs={logs} />;
  },
};

/**
 * Comparison - with and without line numbers
 */
export const LineNumbersComparison: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-on-surface mb-2">
          Without line numbers
        </h3>
        <LogViewer logs={simpleLogs} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-on-surface mb-2">
          With line numbers
        </h3>
        <LogViewer logs={simpleLogs} showLineNumbers />
      </div>
    </div>
  ),
};

/**
 * In context - agent run card
 */
export const InContextAgentCard: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => {
    const agent = {
      agent: "implementation-agent",
      status: "completed",
      goal: "Implement user authentication feature",
      startTime: "2024-01-15 10:30:00",
      duration: "8m 20s",
      logs: longLogs,
    };
    return (
      <div className="w-full max-w-3xl space-y-3">
        <div className="rounded-lg border border-outline/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-3 bg-surface">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-on-surface">
                  {agent.agent}
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-success-container text-on-success-container">
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant truncate">
                {agent.goal}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-on-surface-variant">
                {agent.startTime}
              </div>
              <div className="text-xs text-on-surface-variant">
                {agent.duration}
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="border-t border-outline/50">
            <LogViewer logs={agent.logs} maxHeight="max-h-80" />
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Multiple log viewers - different agents
 */
export const MultipleLogViewers: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => {
    return (
      <div className="space-y-4 max-w-3xl">
        <div>
          <h3 className="text-sm font-medium text-on-surface mb-2">
            Implementation Agent - Completed
          </h3>
          <LogViewer logs={longLogs} maxHeight="max-h-40" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-on-surface mb-2">
            Test Agent - Failed
          </h3>
          <LogViewer logs={errorLogs} maxHeight="max-h-40" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-on-surface mb-2">
            Review Agent - Running
          </h3>
          <LogViewer logs={simpleLogs} maxHeight="max-h-40" />
        </div>
      </div>
    );
  },
};

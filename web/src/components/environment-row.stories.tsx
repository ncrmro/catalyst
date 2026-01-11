import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { EnvironmentCR } from "@/types/crd";
import { EnvironmentRow } from "./environment-row";

// Mock EnvironmentCR factory helper
function createMockEnvironment(
  overrides: Partial<{
    name: string;
    type: "deployment" | "development";
    phase: string;
    url: string;
    branch: string;
    commitSha: string;
    prNumber: number;
  }> = {},
): EnvironmentCR {
  return {
    metadata: {
      name: overrides.name ?? "my-environment",
      namespace: "default",
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      projectRef: { name: "my-project" },
      type: overrides.type ?? "deployment",
      sources: [{
        name: "main",
        commitSha: overrides.commitSha ?? "abc123def456",
        branch: overrides.branch ?? "main",
        prNumber: overrides.prNumber,
      }],
    },
    status: {
      phase: overrides.phase ?? "Ready",
      url: overrides.url,
    },
  };
}

const meta = {
  title: "Components/EnvironmentRow",
  component: EnvironmentRow,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    projectSlug: {
      control: "text",
      description: "Project slug for link generation",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof EnvironmentRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default deployment environment - Ready status
 */
export const Default: Story = {
  args: {
    environment: createMockEnvironment({
      name: "production",
      type: "deployment",
      phase: "Ready",
    }),
    projectSlug: "my-project",
  },
};

/**
 * Deployment environment - Ready
 */
export const DeploymentReady: Story = {
  args: {
    environment: createMockEnvironment({
      name: "staging-v2",
      type: "deployment",
      phase: "Ready",
      url: "https://staging.example.com",
    }),
    projectSlug: "my-project",
  },
};

/**
 * Development environment - Ready
 */
export const DevelopmentReady: Story = {
  args: {
    environment: createMockEnvironment({
      name: "pr-123",
      type: "development",
      phase: "Ready",
      url: "https://pr-123.preview.example.com",
      branch: "feature/new-ui",
      prNumber: 123,
    }),
    projectSlug: "my-project",
  },
};

/**
 * Pending status
 */
export const Pending: Story = {
  args: {
    environment: createMockEnvironment({
      name: "new-env",
      type: "development",
      phase: "Pending",
    }),
    projectSlug: "my-project",
  },
};

/**
 * Deploying status
 */
export const Deploying: Story = {
  args: {
    environment: createMockEnvironment({
      name: "main-deploy",
      type: "deployment",
      phase: "Deploying",
    }),
    projectSlug: "my-project",
  },
};

/**
 * Failed status
 */
export const Failed: Story = {
  args: {
    environment: createMockEnvironment({
      name: "broken-env",
      type: "development",
      phase: "Failed",
    }),
    projectSlug: "my-project",
  },
};

/**
 * With URL displayed
 */
export const WithUrl: Story = {
  args: {
    environment: createMockEnvironment({
      name: "production",
      type: "deployment",
      phase: "Ready",
      url: "https://app.example.com",
    }),
    projectSlug: "my-project",
  },
};

/**
 * Without URL
 */
export const WithoutUrl: Story = {
  args: {
    environment: createMockEnvironment({
      name: "internal-staging",
      type: "deployment",
      phase: "Ready",
    }),
    projectSlug: "my-project",
  },
};

/**
 * Long environment name
 */
export const LongName: Story = {
  args: {
    environment: createMockEnvironment({
      name: "feature-very-long-branch-name-that-might-overflow-the-container",
      type: "development",
      phase: "Ready",
      url: "https://very-long-url.preview.example.com/with/path",
    }),
    projectSlug: "my-project",
  },
};

/**
 * All phases comparison
 */
export const AllPhases: Story = {
  args: {
    environment: createMockEnvironment(),
    projectSlug: "my-project",
  },
  render: () => (
    <div className="space-y-px bg-outline/50">
      <EnvironmentRow
        environment={createMockEnvironment({
          name: "production",
          type: "deployment",
          phase: "Ready",
          url: "https://app.example.com",
        })}
        projectSlug="my-project"
      />
      <EnvironmentRow
        environment={createMockEnvironment({
          name: "staging",
          type: "deployment",
          phase: "Deploying",
        })}
        projectSlug="my-project"
      />
      <EnvironmentRow
        environment={createMockEnvironment({
          name: "pr-456",
          type: "development",
          phase: "Pending",
        })}
        projectSlug="my-project"
      />
      <EnvironmentRow
        environment={createMockEnvironment({
          name: "broken-pr",
          type: "development",
          phase: "Failed",
        })}
        projectSlug="my-project"
      />
    </div>
  ),
};

/**
 * Environment types comparison
 */
export const TypesComparison: Story = {
  args: {
    environment: createMockEnvironment(),
    projectSlug: "my-project",
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-on-surface-variant mb-2">
          Deployment Environments
        </h3>
        <div className="space-y-px bg-surface rounded-lg overflow-hidden">
          <EnvironmentRow
            environment={createMockEnvironment({
              name: "production",
              type: "deployment",
              phase: "Ready",
              url: "https://app.example.com",
            })}
            projectSlug="my-project"
          />
          <EnvironmentRow
            environment={createMockEnvironment({
              name: "staging",
              type: "deployment",
              phase: "Ready",
              url: "https://staging.example.com",
            })}
            projectSlug="my-project"
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-on-surface-variant mb-2">
          Development Environments
        </h3>
        <div className="space-y-px bg-surface rounded-lg overflow-hidden">
          <EnvironmentRow
            environment={createMockEnvironment({
              name: "pr-123",
              type: "development",
              phase: "Ready",
              prNumber: 123,
            })}
            projectSlug="my-project"
          />
          <EnvironmentRow
            environment={createMockEnvironment({
              name: "agent-run-5",
              type: "development",
              phase: "Pending",
            })}
            projectSlug="my-project"
          />
        </div>
      </div>
    </div>
  ),
};

/**
 * In context - within a card
 */
export const InContextCard: Story = {
  args: {
    environment: createMockEnvironment(),
    projectSlug: "my-project",
  },
  render: () => (
    <div className="w-full max-w-3xl">
      <div className="rounded-lg bg-surface p-4">
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          Environments
        </h2>
        <div className="divide-y divide-outline/50 -mx-4">
          <EnvironmentRow
            environment={createMockEnvironment({
              name: "production",
              type: "deployment",
              phase: "Ready",
              url: "https://app.example.com",
            })}
            projectSlug="my-project"
          />
          <EnvironmentRow
            environment={createMockEnvironment({
              name: "staging",
              type: "deployment",
              phase: "Deploying",
            })}
            projectSlug="my-project"
          />
          <EnvironmentRow
            environment={createMockEnvironment({
              name: "pr-123",
              type: "development",
              phase: "Ready",
            })}
            projectSlug="my-project"
          />
        </div>
      </div>
    </div>
  ),
};

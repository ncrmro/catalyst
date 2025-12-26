import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectPageContent } from "./project-page-content";
import type { EnvironmentCR } from "@/types/crd";

const meta = {
  title: "Pages/Projects/ProjectPage",
  component: ProjectPageContent,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ProjectPageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock factory for environments
function createMockEnvironment(
  overrides: Partial<EnvironmentCR> = {},
): EnvironmentCR {
  return {
    metadata: {
      name: "env-" + Math.random().toString(36).substring(7),
      namespace: "default",
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      projectRef: { name: "catalyst-web" },
      type: "deployment",
      source: {
        commitSha: "abc123",
        branch: "main",
      },
    },
    status: {
      phase: "Ready",
      url: "https://example.catalyst.dev",
    },
    ...overrides,
  };
}

/**
 * Default state - empty project with no environments or specs
 */
export const Default: Story = {
  args: {
    project: {
      slug: "catalyst-web",
      name: "Catalyst Web",
      fullName: "catalyst/web",
    },
    deploymentEnvironments: [],
    developmentEnvironments: [],
    specs: [],
    hasRepo: true,
  },
};

/**
 * Project with environments
 */
export const WithEnvironments: Story = {
  args: {
    project: {
      slug: "catalyst-web",
      name: "Catalyst Web",
      fullName: "catalyst/web",
    },
    deploymentEnvironments: [
      createMockEnvironment({
        metadata: { name: "production", namespace: "default" },
        spec: {
          projectRef: { name: "catalyst-web" },
          type: "deployment",
          source: { commitSha: "abc123", branch: "main" },
        },
        status: { phase: "Ready", url: "https://prod.catalyst.dev" },
      }),
      createMockEnvironment({
        metadata: { name: "staging", namespace: "default" },
        spec: {
          projectRef: { name: "catalyst-web" },
          type: "deployment",
          source: { commitSha: "def456", branch: "develop" },
        },
        status: { phase: "Ready", url: "https://staging.catalyst.dev" },
      }),
    ],
    developmentEnvironments: [
      createMockEnvironment({
        metadata: { name: "dev-john-feature-123", namespace: "default" },
        spec: {
          projectRef: { name: "catalyst-web" },
          type: "development",
          source: { commitSha: "ghi789", branch: "feature/new-ui" },
        },
        status: { phase: "Ready", url: "https://dev-john.catalyst.dev" },
      }),
    ],
    specs: [],
    hasRepo: true,
  },
};

/**
 * Project with specs
 */
export const WithSpecs: Story = {
  args: {
    project: {
      slug: "catalyst-web",
      name: "Catalyst Web",
      fullName: "catalyst/web",
    },
    deploymentEnvironments: [],
    developmentEnvironments: [],
    specs: [
      {
        name: "user-authentication",
        path: "specs/user-authentication",
        files: [
          { name: "spec.md", type: "file" },
          { name: "api.md", type: "file" },
        ],
      },
      {
        name: "dashboard-redesign",
        path: "specs/dashboard-redesign",
        files: [{ name: "overview.md", type: "file" }],
      },
    ],
    hasRepo: true,
  },
};

/**
 * Project without a linked repository
 */
export const NoRepository: Story = {
  args: {
    project: {
      slug: "new-project",
      name: "New Project",
      fullName: "org/new-project",
    },
    deploymentEnvironments: [],
    developmentEnvironments: [],
    specs: [],
    hasRepo: false,
  },
};

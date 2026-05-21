import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EnvironmentHeader } from "./environment-header";

const meta = {
  title: "Components/EnvironmentHeader",
  component: EnvironmentHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    branchName: {
      control: "text",
      description: "Branch or environment name",
    },
    status: {
      control: "text",
      description: "Environment status",
    },
    previewUrl: {
      control: "text",
      description: "Preview URL",
    },
    targetNamespace: {
      control: "text",
      description: "Kubernetes namespace",
    },
    podName: {
      control: "text",
      description: "Pod name",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof EnvironmentHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default ready environment with preview URL
 */
export const Default: Story = {
  args: {
    branchName: "feat/preview-environments",
    status: "Ready",
    previewUrl: "https://pr-42.preview.catalyst.dev",
    targetNamespace: "env-catalyst-web-feat-preview-environments",
    podName: "workspace-catalyst-web-abc1234",
  },
};

/**
 * Ready environment with preview URL
 */
export const Ready: Story = {
  args: {
    branchName: "feat/preview-environments",
    status: "Ready",
    previewUrl: "https://pr-42.preview.catalyst.dev",
    targetNamespace: "env-catalyst-web-feat-preview-environments",
    podName: "workspace-catalyst-web-abc1234",
  },
};

/**
 * Deploying environment without preview URL yet
 */
export const Deploying: Story = {
  args: {
    branchName: "feat/new-dashboard",
    status: "Deploying",
    targetNamespace: "env-catalyst-web-feat-new-dashboard",
    podName: "workspace-catalyst-web-def4567",
  },
};

/**
 * Provisioning environment
 */
export const Provisioning: Story = {
  args: {
    branchName: "feat/authentication",
    status: "Provisioning",
    targetNamespace: "env-catalyst-web-feat-authentication",
    podName: "workspace-catalyst-web-ghi8901",
  },
};

/**
 * Failed environment
 */
export const Failed: Story = {
  args: {
    branchName: "feat/broken-build",
    status: "Failed",
    targetNamespace: "env-catalyst-web-feat-broken-build",
    podName: "workspace-catalyst-web-bad1234",
  },
};

/**
 * Pending environment
 */
export const Pending: Story = {
  args: {
    branchName: "feat/waiting-resources",
    status: "Pending",
    targetNamespace: "env-catalyst-web-feat-waiting-resources",
    podName: "workspace-catalyst-web-pen1234",
  },
};

/**
 * Production environment
 */
export const Production: Story = {
  args: {
    branchName: "main",
    status: "Ready",
    previewUrl: "https://catalyst.dev",
    targetNamespace: "env-catalyst-web-production",
    podName: "workspace-catalyst-web-main1234",
  },
};

/**
 * Long branch name - text wrapping
 */
export const LongBranchName: Story = {
  args: {
    branchName:
      "feat/very-long-branch-name-that-might-cause-display-issues-in-the-ui",
    status: "Ready",
    previewUrl: "https://pr-99.preview.catalyst.dev",
    targetNamespace:
      "env-catalyst-web-feat-very-long-branch-name-that-might-cause-display-issues",
    podName: "workspace-catalyst-web-edge123",
  },
};

/**
 * Using factory - preview environment
 */
export const FactoryPreview: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <EnvironmentHeader
      branchName="feat/preview-environments"
      status="Ready"
      previewUrl="https://pr-42.preview.catalyst.dev"
      targetNamespace="env-catalyst-web-feat-preview-environments"
      podName="workspace-catalyst-web-abc1234"
    />
  ),
};

/**
 * Using factory - production environment
 */
export const FactoryProduction: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <EnvironmentHeader
      branchName="main"
      status="Ready"
      previewUrl="https://catalyst.dev"
      targetNamespace="env-catalyst-web-production"
      podName="workspace-catalyst-web-main1234"
    />
  ),
};

/**
 * Using fixture - successful deployment
 */
export const FixtureSuccessfulDeployment: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <EnvironmentHeader
      branchName="feat/preview-environments"
      status="Ready"
      previewUrl="https://pr-42.preview.catalyst.dev"
      targetNamespace="env-catalyst-web-feat-preview-environments"
      podName="workspace-catalyst-web-abc1234"
    />
  ),
};

/**
 * Using fixture - failed deployment
 */
export const FixtureFailedDeployment: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <EnvironmentHeader
      branchName="feat/broken-build"
      status="Failed"
      targetNamespace="env-catalyst-web-feat-broken-build"
      podName="workspace-catalyst-web-bad1234"
    />
  ),
};

/**
 * Using fixture - provisioning deployment
 */
export const FixtureProvisioningDeployment: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <EnvironmentHeader
      branchName="feat/authentication"
      status="Provisioning"
      targetNamespace="env-catalyst-web-feat-authentication"
      podName="workspace-catalyst-web-ghi8901"
    />
  ),
};

/**
 * Using fixture - production environment
 */
export const FixtureProductionEnvironment: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <EnvironmentHeader
      branchName="main"
      status="Ready"
      previewUrl="https://catalyst.dev"
      targetNamespace="env-catalyst-web-production"
      podName="workspace-catalyst-web-main1234"
    />
  ),
};

/**
 * Using fixture - long branch name environment
 */
export const FixtureLongBranchName: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <EnvironmentHeader
      branchName="feat/very-long-branch-name-that-might-cause-display-issues-in-the-ui"
      status="Ready"
      previewUrl="https://pr-99.preview.catalyst.dev"
      targetNamespace="env-catalyst-web-feat-very-long-branch-name-that-might-cause-display-issues"
      podName="workspace-catalyst-web-edge123"
    />
  ),
};

/**
 * All statuses comparison
 */
export const AllStatuses: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <div className="space-y-6">
      <div className="border border-outline/50 rounded-lg p-4">
        <EnvironmentHeader
          branchName="feat/ready-environment"
          status="Ready"
          previewUrl="https://pr-42.preview.catalyst.dev"
          targetNamespace="env-catalyst-web-feat-ready"
          podName="workspace-catalyst-web-abc1234"
        />
      </div>
      <div className="border border-outline/50 rounded-lg p-4">
        <EnvironmentHeader
          branchName="feat/deploying-environment"
          status="Deploying"
          targetNamespace="env-catalyst-web-feat-deploying"
          podName="workspace-catalyst-web-def4567"
        />
      </div>
      <div className="border border-outline/50 rounded-lg p-4">
        <EnvironmentHeader
          branchName="feat/provisioning-environment"
          status="Provisioning"
          targetNamespace="env-catalyst-web-feat-provisioning"
          podName="workspace-catalyst-web-ghi8901"
        />
      </div>
      <div className="border border-outline/50 rounded-lg p-4">
        <EnvironmentHeader
          branchName="feat/pending-environment"
          status="Pending"
          targetNamespace="env-catalyst-web-feat-pending"
          podName="workspace-catalyst-web-jkl2345"
        />
      </div>
      <div className="border border-outline/50 rounded-lg p-4">
        <EnvironmentHeader
          branchName="feat/failed-environment"
          status="Failed"
          targetNamespace="env-catalyst-web-feat-failed"
          podName="workspace-catalyst-web-mno6789"
        />
      </div>
    </div>
  ),
};

/**
 * In context - within a card
 */
export const InContextCard: Story = {
  // @ts-expect-error - Custom render provides data directly
  args: {},
  render: () => (
    <div className="w-full max-w-4xl">
      <div className="rounded-lg bg-surface p-6 border border-outline/50">
        <EnvironmentHeader
          branchName="feat/preview-environments"
          status="Ready"
          previewUrl="https://pr-42.preview.catalyst.dev"
          targetNamespace="env-catalyst-web-feat-preview-environments"
          podName="workspace-catalyst-web-abc1234"
        />
      </div>
    </div>
  ),
};

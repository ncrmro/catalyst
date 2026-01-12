import type { Meta, StoryObj } from "@storybook/react";
import { ZeroConfigBadge } from "./zero-config-badge";
import type { EnvironmentConfig } from "@/types/environment-config";

const meta = {
  title: "Projects/ZeroConfigBadge",
  component: ZeroConfigBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ZeroConfigBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock config for zero-config project (successful detection)
const zeroConfigProject: EnvironmentConfig = {
  method: "docker",
  dockerfilePath: "Dockerfile",
  projectType: "nodejs",
  devCommand: "npm run dev",
  packageManager: "npm",
  autoDetect: true,
  confidence: "high",
  detectedAt: new Date().toISOString(),
};

// Mock config for non-zero-config project (unknown type)
const nonZeroConfigProject: EnvironmentConfig = {
  method: "docker",
  dockerfilePath: "Dockerfile",
  projectType: "unknown",
  devCommand: null,
  autoDetect: true,
  confidence: "low",
  detectedAt: new Date().toISOString(),
};

// Mock config for pending detection
const pendingDetectionProject: EnvironmentConfig = {
  method: "docker",
  dockerfilePath: "Dockerfile",
  // No detection fields
};

// Mock config for disabled auto-detection
const manualConfigProject: EnvironmentConfig = {
  method: "docker",
  dockerfilePath: "Dockerfile",
  projectType: "nodejs",
  devCommand: "npm run dev",
  autoDetect: false,
  confidence: "high",
  detectedAt: new Date().toISOString(),
};

/**
 * Zero-config project with successful auto-detection.
 * Shows a green success badge.
 */
export const ZeroConfig: Story = {
  args: {
    config: zeroConfigProject,
    variant: "inline",
  },
};

/**
 * Non-zero-config project where detection failed.
 * Shows a yellow warning badge.
 */
export const NonZeroConfig: Story = {
  args: {
    config: nonZeroConfigProject,
    variant: "inline",
  },
};

/**
 * Project with pending detection.
 * Shows a yellow warning badge.
 */
export const PendingDetection: Story = {
  args: {
    config: pendingDetectionProject,
    variant: "inline",
  },
};

/**
 * Project with manual configuration (auto-detect disabled).
 * Shows a yellow warning badge.
 */
export const ManualConfig: Story = {
  args: {
    config: manualConfigProject,
    variant: "inline",
  },
};

/**
 * No repository connected.
 * Shows a yellow warning badge.
 */
export const NoConfig: Story = {
  args: {
    config: null,
    variant: "inline",
  },
};

/**
 * Card variant for zero-config project.
 * Shows more detailed information with icon.
 */
export const ZeroConfigCard: Story = {
  args: {
    config: zeroConfigProject,
    variant: "card",
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

/**
 * Card variant for non-zero-config project.
 * Shows more detailed information with warning icon.
 */
export const NonZeroConfigCard: Story = {
  args: {
    config: nonZeroConfigProject,
    variant: "card",
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

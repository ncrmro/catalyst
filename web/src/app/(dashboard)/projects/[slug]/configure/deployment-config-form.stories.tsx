import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DeploymentConfigForm } from "./deployment-config-form";

const meta = {
  title: "Pages/Projects/Configure/DeploymentConfigForm",
  component: DeploymentConfigForm,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof DeploymentConfigForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - Helm chart method selected (recommended)
 */
export const Default: Story = {
  args: {},
};

/**
 * Helm chart deployment configuration
 */
export const HelmSelected: Story = {
  args: {
    initialConfig: {
      method: "helm",
      chartPath: "./charts/my-app",
      valuesPath: "./values/production.yaml",
    },
  },
};

/**
 * Docker deployment configuration
 */
export const DockerSelected: Story = {
  args: {
    initialConfig: {
      method: "docker",
      dockerfilePath: "./Dockerfile",
      context: ".",
    },
  },
};

/**
 * Kubernetes manifests deployment configuration
 */
export const ManifestsSelected: Story = {
  args: {
    initialConfig: {
      method: "manifests",
      directory: "./k8s/manifests",
    },
  },
};

/**
 * Configuration with managed services enabled
 */
export const WithManagedServices: Story = {
  args: {
    initialConfig: {
      method: "helm",
      chartPath: "./charts/app",
      valuesPath: "./values.yaml",
      managedServices: {
        postgres: { enabled: true },
        redis: { enabled: true },
        opensearch: { enabled: false },
      },
    },
  },
};

/**
 * Full configuration with all services
 */
export const FullConfiguration: Story = {
  args: {
    initialConfig: {
      method: "docker",
      dockerfilePath: "./docker/Dockerfile.prod",
      context: "./",
      managedServices: {
        postgres: { enabled: true },
        redis: { enabled: true },
        opensearch: { enabled: true },
      },
    },
  },
};

/**
 * Auto-detected Node.js project with high confidence
 * Shows the auto-detection indicator with project type, package manager, and dev command
 */
export const AutoDetectedNodejs: Story = {
  args: {
    initialConfig: {
      method: "helm",
      chartPath: "./charts/app",
      projectType: "nodejs",
      packageManager: "pnpm",
      devCommand: "pnpm dev",
      confidence: "high",
      autoDetect: true,
      detectedAt: new Date().toISOString(),
    },
  },
};

/**
 * Auto-detected Docker Compose project with medium confidence
 */
export const AutoDetectedDockerCompose: Story = {
  args: {
    initialConfig: {
      method: "docker",
      dockerfilePath: "./Dockerfile",
      projectType: "docker-compose",
      devCommand: "docker compose up",
      confidence: "medium",
      autoDetect: true,
      detectedAt: new Date().toISOString(),
    },
  },
};

/**
 * Auto-detected Makefile project with low confidence
 */
export const AutoDetectedMakefile: Story = {
  args: {
    initialConfig: {
      method: "manifests",
      directory: "./k8s",
      projectType: "makefile",
      devCommand: "make dev",
      confidence: "low",
      autoDetect: true,
      detectedAt: new Date().toISOString(),
    },
  },
};

/**
 * Manual override - auto-detection disabled by user
 * Shows the manual configuration notice with option to re-enable
 */
export const ManualOverride: Story = {
  args: {
    initialConfig: {
      method: "helm",
      chartPath: "./charts/custom-app",
      valuesPath: "./values/custom.yaml",
      projectType: "nodejs",
      packageManager: "npm",
      devCommand: "npm run start:dev",
      confidence: "high",
      autoDetect: false,
      detectedAt: "2024-01-15T10:30:00.000Z",
      overriddenAt: "2024-01-16T14:22:00.000Z",
    },
  },
};

/**
 * Auto-detected with all package managers - npm
 */
export const AutoDetectedNpm: Story = {
  args: {
    initialConfig: {
      method: "docker",
      dockerfilePath: "./Dockerfile",
      projectType: "nodejs",
      packageManager: "npm",
      devCommand: "npm run dev",
      confidence: "high",
      autoDetect: true,
      detectedAt: new Date().toISOString(),
    },
  },
};

/**
 * Auto-detected with yarn package manager
 */
export const AutoDetectedYarn: Story = {
  args: {
    initialConfig: {
      method: "docker",
      dockerfilePath: "./Dockerfile",
      projectType: "nodejs",
      packageManager: "yarn",
      devCommand: "yarn dev",
      confidence: "high",
      autoDetect: true,
      detectedAt: new Date().toISOString(),
    },
  },
};

/**
 * Auto-detected with bun package manager
 */
export const AutoDetectedBun: Story = {
  args: {
    initialConfig: {
      method: "docker",
      dockerfilePath: "./Dockerfile",
      projectType: "nodejs",
      packageManager: "bun",
      devCommand: "bun dev",
      confidence: "high",
      autoDetect: true,
      detectedAt: new Date().toISOString(),
    },
  },
};

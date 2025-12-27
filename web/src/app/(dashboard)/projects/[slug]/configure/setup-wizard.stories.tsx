import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SetupWizard } from "./setup-wizard";

const meta = {
  title: "Pages/Projects/Configure/SetupWizard",
  component: SetupWizard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SetupWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockProject = {
  slug: "catalyst-web",
  name: "Catalyst Web",
  fullName: "catalyst/web",
};

/**
 * Step 1: Git Repository Configuration
 * Initial wizard state where user connects their repository
 */
export const Step1_GitRepo: Story = {
  args: {
    project: mockProject,
    initialStep: 0,
  },
};

/**
 * Step 1 with pre-filled data
 * Shows repository already connected
 */
export const Step1_WithRepo: Story = {
  args: {
    project: mockProject,
    initialStep: 0,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/catalyst/web",
        branch: "main",
        isConnected: true,
      },
    },
  },
};

/**
 * Step 2: Deployment Configuration
 * User configures how the application deploys
 */
export const Step2_DeploymentConfig: Story = {
  args: {
    project: mockProject,
    initialStep: 1,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/catalyst/web",
        branch: "main",
        isConnected: true,
      },
    },
  },
};

/**
 * Step 2 with deployment already configured
 * Shows Helm deployment configuration
 */
export const Step2_WithHelmConfig: Story = {
  args: {
    project: mockProject,
    initialStep: 1,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/catalyst/web",
        branch: "main",
        isConnected: true,
      },
      deployment: {
        method: "helm",
        helm: {
          chartPath: "./charts/app",
          valuesPath: "./values.yaml",
        },
        managedServices: {
          postgres: true,
          redis: false,
          opensearch: false,
        },
      },
    },
  },
};

/**
 * Step 3: Create Environment
 * Final step - user creates their first environment
 */
export const Step3_CreateEnvironment: Story = {
  args: {
    project: mockProject,
    initialStep: 2,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/catalyst/web",
        branch: "main",
        isConnected: true,
      },
      deployment: {
        method: "helm",
        helm: {
          chartPath: "./charts/app",
        },
        managedServices: {
          postgres: true,
          redis: true,
          opensearch: false,
        },
      },
    },
  },
};

/**
 * Step 3 with environment pre-configured
 * Shows development environment selected
 */
export const Step3_WithDevelopmentEnv: Story = {
  args: {
    project: mockProject,
    initialStep: 2,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/catalyst/web",
        branch: "main",
        isConnected: true,
      },
      deployment: {
        method: "docker",
        docker: {
          dockerfilePath: "./Dockerfile",
          context: ".",
        },
        managedServices: {
          postgres: true,
          redis: false,
          opensearch: false,
        },
      },
      environment: {
        name: "catalyst-web-dev",
        type: "development",
        branch: "main",
      },
    },
  },
};

/**
 * Complete wizard flow with all data
 * Shows full configuration ready for submission
 */
export const Complete: Story = {
  args: {
    project: mockProject,
    initialStep: 2,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/catalyst/web",
        branch: "main",
        isConnected: true,
      },
      deployment: {
        method: "helm",
        helm: {
          chartPath: "./charts/nextjs",
          valuesPath: "./values/production.yaml",
        },
        managedServices: {
          postgres: true,
          redis: true,
          opensearch: true,
        },
      },
      environment: {
        name: "catalyst-web-production",
        type: "deployment",
        branch: "main",
      },
    },
  },
};

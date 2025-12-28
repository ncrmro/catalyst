import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SetupWizard } from "@/app/(dashboard)/projects/[slug]/configure/setup-wizard";

const meta = {
  title: "Workflows/ProjectOnboarding",
  component: SetupWizard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SetupWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockProject = {
  slug: "my-project",
  name: "My Project",
  fullName: "myorg/my-project",
};

/**
 * Step 1: Connect Repository
 * The first step where users connect their Git repository to the project.
 */
export const Step1_ConnectRepository: Story = {
  args: {
    project: mockProject,
    initialStep: 0,
  },
};

/**
 * Step 2: Configure Deployment
 * Users choose how their application will be deployed (Helm, Docker, or Kubernetes manifests).
 */
export const Step2_ConfigureDeployment: Story = {
  args: {
    project: mockProject,
    initialStep: 1,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/myorg/my-project",
        branch: "main",
        isConnected: true,
      },
    },
  },
};

/**
 * Step 3: Create Environment
 * Final step where users create their first environment (development or deployment).
 */
export const Step3_CreateEnvironment: Story = {
  args: {
    project: mockProject,
    initialStep: 2,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/myorg/my-project",
        branch: "main",
        isConnected: true,
      },
      deployment: {
        method: "helm",
        helm: {
          chartPath: "./charts/app",
        },
        managedServices: {
          postgres: false,
          redis: false,
          opensearch: false,
        },
      },
    },
  },
};

/**
 * Complete Flow
 * Shows the wizard with all configuration completed, ready to submit.
 */
export const CompleteFlow: Story = {
  args: {
    project: mockProject,
    initialStep: 2,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/myorg/my-project",
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
          redis: true,
          opensearch: false,
        },
      },
      environment: {
        name: "my-project-dev",
        type: "development",
        branch: "main",
      },
    },
  },
};

/**
 * Helm Workflow
 * Complete onboarding flow using Helm chart deployment.
 */
export const HelmWorkflow: Story = {
  args: {
    project: {
      slug: "nextjs-app",
      name: "Next.js App",
      fullName: "myorg/nextjs-app",
    },
    initialStep: 2,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/myorg/nextjs-app",
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
          opensearch: false,
        },
      },
      environment: {
        name: "nextjs-app-production",
        type: "deployment",
        branch: "main",
      },
    },
  },
};

/**
 * Docker Workflow
 * Complete onboarding flow using Docker deployment.
 */
export const DockerWorkflow: Story = {
  args: {
    project: {
      slug: "api-service",
      name: "API Service",
      fullName: "myorg/api-service",
    },
    initialStep: 2,
    initialData: {
      gitRepo: {
        repoUrl: "https://github.com/myorg/api-service",
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
        name: "api-service-staging",
        type: "deployment",
        branch: "develop",
      },
    },
  },
};

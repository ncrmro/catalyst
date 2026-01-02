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
			helm: {
				chartPath: "./charts/my-app",
				valuesPath: "./values/production.yaml",
			},
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
			docker: {
				dockerfilePath: "./Dockerfile",
				context: ".",
			},
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
			manifests: {
				directory: "./k8s/manifests",
			},
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
	},
};

/**
 * Full configuration with all services
 */
export const FullConfiguration: Story = {
	args: {
		initialConfig: {
			method: "docker",
			docker: {
				dockerfilePath: "./docker/Dockerfile.prod",
				context: "./",
			},
			managedServices: {
				postgres: true,
				redis: true,
				opensearch: true,
			},
		},
	},
};

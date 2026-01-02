import { z } from "zod";

// Deployment method schemas
export const HelmConfigSchema = z.object({
	chartPath: z.string().min(1),
	valuesPath: z.string().optional(),
});

export const DockerConfigSchema = z.object({
	dockerfilePath: z.string().min(1),
	context: z.string().optional(),
});

export const ManifestsConfigSchema = z.object({
	directory: z.string().min(1),
});

// Managed services schema
export const ManagedServicesSchema = z.object({
	postgres: z.boolean(),
	redis: z.boolean(),
	opensearch: z.boolean(),
});

// Environment variable schema
export const EnvVarSchema = z.object({
	name: z.string().min(1),
	value: z.string(),
	isSecret: z.boolean().optional(),
});

// Full deployment configuration schema
export const DeploymentConfigSchema = z.object({
	method: z.enum(["helm", "docker", "manifests"]),
	helm: HelmConfigSchema.optional(),
	docker: DockerConfigSchema.optional(),
	manifests: ManifestsConfigSchema.optional(),
	managedServices: ManagedServicesSchema,
	envVars: z.array(EnvVarSchema).optional(),
});

// Deployment mode for the operator
export const DeploymentModeSchema = z.enum([
	"production",
	"development",
	"workspace",
]);

// TypeScript types derived from schemas
export type HelmConfig = z.infer<typeof HelmConfigSchema>;
export type DockerConfig = z.infer<typeof DockerConfigSchema>;
export type ManifestsConfig = z.infer<typeof ManifestsConfigSchema>;
export type ManagedServices = z.infer<typeof ManagedServicesSchema>;
export type EnvVar = z.infer<typeof EnvVarSchema>;
export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;
export type DeploymentMode = z.infer<typeof DeploymentModeSchema>;

// Default managed services (all disabled)
export const DEFAULT_MANAGED_SERVICES: ManagedServices = {
	postgres: false,
	redis: false,
	opensearch: false,
};

// Helper to determine deployment mode from config
export function determineDeploymentMode(
	_config: DeploymentConfig,
	environmentType: "deployment" | "development",
): DeploymentMode {
	if (environmentType === "development") {
		return "development";
	}
	return "production";
}

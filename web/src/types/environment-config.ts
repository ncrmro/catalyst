import { z } from "zod";

// =============================================================================
// Shared Schemas
// =============================================================================

/**
 * Configuration for a single managed service.
 */
export const ManagedServiceConfigSchema = z.object({
  enabled: z.boolean().default(false),
});

/**
 * Managed services that can be automatically provisioned with the environment.
 * Each service is an object with at minimum an `enabled` boolean.
 */
export const ManagedServicesSchema = z.object({
  postgres: ManagedServiceConfigSchema.optional(),
  redis: ManagedServiceConfigSchema.optional(),
  opensearch: ManagedServiceConfigSchema.optional(),
});

/**
 * Environment variable definition.
 */
export const EnvVarSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  isSecret: z.boolean().optional(),
});

// =============================================================================
// Detection Fields (merged into each method type)
// =============================================================================

/**
 * Project types that can be auto-detected from repository structure.
 * See FR-ENV-006 in specs/001-environments/spec.md
 */
export const ProjectTypeSchema = z.enum([
  "docker-compose",
  "dockerfile",
  "nodejs",
  "makefile",
  "unknown",
]);

/**
 * Package managers for Node.js projects.
 */
export const PackageManagerSchema = z.enum(["npm", "pnpm", "yarn", "bun"]);

/**
 * Confidence level of auto-detection.
 */
export const DetectionConfidenceSchema = z.enum(["high", "medium", "low"]);

/**
 * Detection fields that are auto-populated when a PR is opened.
 * These fields are merged into each method type so any environment
 * can have auto-detected dev settings regardless of deployment method.
 *
 * See research.project-detection.md for detection logic.
 */
export const DetectionFieldsSchema = z.object({
  /** Command to run for development mode (e.g., "npm run dev", "make dev") */
  devCommand: z.string().nullable().optional(),

  /** Working directory relative to repo root (for monorepos) */
  workdir: z.string().nullable().optional(),

  /** Detected package manager for Node.js projects */
  packageManager: PackageManagerSchema.nullable().optional(),

  /** Auto-detected project type */
  projectType: ProjectTypeSchema.nullable().optional(),

  /** Whether to use auto-detection (false = user has overridden) */
  autoDetect: z.boolean().default(true).optional(),

  /** Confidence level of the detection */
  confidence: DetectionConfidenceSchema.nullable().optional(),

  /** ISO timestamp of last detection */
  detectedAt: z.string().nullable().optional(),

  /** ISO timestamp when user overrode the detected values */
  overriddenAt: z.string().nullable().optional(),
});

// =============================================================================
// Base Config (shared by all methods)
// =============================================================================

/**
 * Base configuration fields shared by all deployment methods.
 * Includes managed services, environment variables, and detection fields.
 */
export const BaseConfigSchema = z
  .object({
    /** Managed services to provision with this environment */
    managedServices: ManagedServicesSchema.optional(),

    /** Environment variables to inject into the container */
    envVars: z.array(EnvVarSchema).optional(),
  })
  .merge(DetectionFieldsSchema);

// =============================================================================
// Method-Specific Configs (discriminated union on "method")
// =============================================================================

/**
 * Helm chart deployment configuration.
 */
export const HelmConfigSchema = BaseConfigSchema.extend({
  method: z.literal("helm"),

  /** Path to the Helm chart (relative to repo root) */
  chartPath: z.string().min(1),

  /** Path to values.yaml file (optional) */
  valuesPath: z.string().optional(),
});

/**
 * Docker/Dockerfile deployment configuration.
 */
export const DockerConfigSchema = BaseConfigSchema.extend({
  method: z.literal("docker"),

  /** Path to Dockerfile (relative to repo root) */
  dockerfilePath: z.string().min(1),

  /** Build context directory (defaults to Dockerfile directory) */
  context: z.string().optional(),
});

/**
 * Raw Kubernetes manifests deployment configuration.
 */
export const ManifestsConfigSchema = BaseConfigSchema.extend({
  method: z.literal("manifests"),

  /** Directory containing Kubernetes manifest files */
  directory: z.string().min(1),
});

// =============================================================================
// Discriminated Union
// =============================================================================

/**
 * Environment configuration discriminated by deployment method.
 *
 * Each method type includes:
 * - Method-specific fields (chartPath, dockerfilePath, directory)
 * - Shared fields (managedServices, envVars)
 * - Detection fields (devCommand, workdir, packageManager, etc.)
 *
 * The development environment's config serves as a template for PR preview
 * environments. When a PR is opened, the system reads the development config
 * and uses auto-detection to populate or update the detection fields.
 */
export const EnvironmentConfigSchema = z.discriminatedUnion("method", [
  HelmConfigSchema,
  DockerConfigSchema,
  ManifestsConfigSchema,
]);

// =============================================================================
// TypeScript Types
// =============================================================================

export type ManagedServiceConfig = z.infer<typeof ManagedServiceConfigSchema>;
export type ManagedServices = z.infer<typeof ManagedServicesSchema>;
export type EnvVar = z.infer<typeof EnvVarSchema>;
export type ProjectType = z.infer<typeof ProjectTypeSchema>;
export type PackageManager = z.infer<typeof PackageManagerSchema>;
export type DetectionConfidence = z.infer<typeof DetectionConfidenceSchema>;
export type DetectionFields = z.infer<typeof DetectionFieldsSchema>;
export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type HelmConfig = z.infer<typeof HelmConfigSchema>;
export type DockerConfig = z.infer<typeof DockerConfigSchema>;
export type ManifestsConfig = z.infer<typeof ManifestsConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if config uses Helm deployment method.
 */
export function isHelmConfig(config: EnvironmentConfig): config is HelmConfig {
  return config.method === "helm";
}

/**
 * Check if config uses Docker deployment method.
 */
export function isDockerConfig(
  config: EnvironmentConfig,
): config is DockerConfig {
  return config.method === "docker";
}

/**
 * Check if config uses raw manifests deployment method.
 */
export function isManifestsConfig(
  config: EnvironmentConfig,
): config is ManifestsConfig {
  return config.method === "manifests";
}

// =============================================================================
// Defaults
// =============================================================================

/**
 * Default managed services (all disabled).
 */
export const DEFAULT_MANAGED_SERVICES: ManagedServices = {
  postgres: { enabled: false },
  redis: { enabled: false },
  opensearch: { enabled: false },
};

// =============================================================================
// Backwards Compatibility (Deployment Mode)
// =============================================================================

/**
 * Deployment mode for the Kubernetes operator.
 * This is separate from the config structure and determines how the
 * operator reconciles the Environment CR.
 */
export const DeploymentModeSchema = z.enum([
  "production",
  "development",
  "workspace",
]);

export type DeploymentMode = z.infer<typeof DeploymentModeSchema>;

/**
 * Helper to determine deployment mode.
 * This maps the environment type to the operator's deployment mode.
 */
export function determineDeploymentMode(
  environmentType: "deployment" | "development",
): DeploymentMode {
  if (environmentType === "development") {
    return "development";
  }
  return "production";
}

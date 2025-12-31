/**
 * Project Configuration Schemas
 *
 * Zod schemas are the source of truth. TypeScript types are inferred
 * using z.infer<>. The JSON Schema file is kept for documentation/OpenAPI.
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Default development image used when no project configuration exists */
export const DEFAULT_DEV_IMAGE = "nixos/nix";

// ============================================================================
// Zod Schemas (source of truth)
// ============================================================================

/** Build method enum */
export const BuildMethodSchema = z.enum([
  "dockerfile",
  "buildpack",
  "prebuilt",
]);

/** Registry configuration */
export const RegistryConfigSchema = z.object({
  url: z
    .string()
    .describe("Registry URL (e.g., ghcr.io/ncrmro, docker.io/myorg)"),
  authSecretName: z.string().optional().describe("Auth secret name in cluster"),
});

/** Build configuration */
export const BuildConfigSchema = z.object({
  method: BuildMethodSchema.describe("Build method"),
  dockerfilePath: z
    .string()
    .default("Dockerfile")
    .describe("Dockerfile path (relative to repo root)"),
  context: z.string().default(".").describe("Build context directory"),
  buildArgs: z
    .record(z.string(), z.string())
    .optional()
    .describe("Build arguments"),
  target: z.string().optional().describe("Target stage for multi-stage builds"),
});

/** Tag configuration */
export const TagConfigSchema = z.object({
  pattern: z
    .string()
    .default("{project}:{sha}")
    .describe(
      "Pattern with variables: {project}, {branch}, {sha}, {env}, {timestamp}",
    ),
  envOverrides: z
    .record(z.string(), z.string())
    .optional()
    .describe("Override tag for specific environments"),
});

/** Image configuration */
export const ImageConfigSchema = z
  .object({
    registry: RegistryConfigSchema,
    build: BuildConfigSchema.optional(),
    tag: TagConfigSchema,
  })
  .describe("Default image configuration for all environments");

/** Resource requests/limits */
export const ResourceSpecSchema = z.object({
  cpu: z.string().default("100m"),
  memory: z.string().default("128Mi"),
});

/** Resource configuration */
export const ResourceConfigSchema = z
  .object({
    requests: ResourceSpecSchema.optional(),
    limits: ResourceSpecSchema.optional(),
    replicas: z.number().int().min(1).default(1),
  })
  .describe("Default resource configuration");

/** PostgreSQL managed service config */
export const PostgresConfigSchema = z.object({
  enabled: z.boolean().default(false),
  version: z.string().default("16"),
  storageSize: z.string().default("1Gi"),
  database: z.string().default("app").describe("Database name"),
});

/** Redis managed service config */
export const RedisConfigSchema = z.object({
  enabled: z.boolean().default(false),
  version: z.string().default("7"),
  storageSize: z.string().default("256Mi"),
});

/** Managed services configuration */
export const ManagedServicesConfigSchema = z
  .object({
    postgres: PostgresConfigSchema.optional(),
    redis: RedisConfigSchema.optional(),
  })
  .describe("Default managed services");

/** Environment variable source type */
export const EnvVarSourceTypeSchema = z.enum(["value", "secret", "configMap"]);

/** Environment variable source */
export const EnvVarSourceSchema = z.object({
  type: EnvVarSourceTypeSchema,
  value: z.string().optional(),
  secretName: z.string().optional(),
  configMapName: z.string().optional(),
  key: z.string().optional(),
});

/** Environment variable definition */
export const EnvVarSchema = z.object({
  name: z.string().min(1),
  source: EnvVarSourceSchema,
});

/** Environment type configuration (deployment/development/overrides) */
export const EnvironmentTypeConfigSchema = z.object({
  image: ImageConfigSchema.partial().optional(),
  resources: ResourceConfigSchema.optional(),
  managedServices: ManagedServicesConfigSchema.optional(),
  envVars: z.array(EnvVarSchema).optional(),
  startCommand: z
    .string()
    .optional()
    .describe("Command to start the application (e.g., 'npm run dev')"),
});

/** Main project configuration */
export const ProjectConfigSchema = z.object({
  version: z.literal("v1").describe("Schema version for migrations"),
  defaultImage: ImageConfigSchema,
  defaultResources: ResourceConfigSchema.optional(),
  defaultManagedServices: ManagedServicesConfigSchema.optional(),
  deployment: EnvironmentTypeConfigSchema.optional().describe(
    "Deployment environment type config (production, staging)",
  ),
  development: EnvironmentTypeConfigSchema.optional().describe(
    "Development environment type config",
  ),
  environmentOverrides: z
    .record(z.string(), EnvironmentTypeConfigSchema)
    .optional()
    .describe(
      "Per-environment overrides by name (e.g., staging, prod-us-east)",
    ),
});

// ============================================================================
// TypeScript Types (inferred from Zod schemas)
// ============================================================================

export type BuildMethod = z.infer<typeof BuildMethodSchema>;
export type RegistryConfig = z.infer<typeof RegistryConfigSchema>;
export type BuildConfig = z.infer<typeof BuildConfigSchema>;
export type TagConfig = z.infer<typeof TagConfigSchema>;
export type ImageConfig = z.infer<typeof ImageConfigSchema>;
export type ResourceSpec = z.infer<typeof ResourceSpecSchema>;
export type ResourceConfig = z.infer<typeof ResourceConfigSchema>;
export type PostgresConfig = z.infer<typeof PostgresConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type ManagedServicesConfig = z.infer<typeof ManagedServicesConfigSchema>;
export type EnvVarSourceType = z.infer<typeof EnvVarSourceTypeSchema>;
export type EnvVarSource = z.infer<typeof EnvVarSourceSchema>;
export type EnvVar = z.infer<typeof EnvVarSchema>;
export type EnvironmentTypeConfig = z.infer<typeof EnvironmentTypeConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// Re-export the JSON Schema for documentation/OpenAPI use (kept for reference)
import projectConfigJsonSchema from "./project-config.schema.json";
export { projectConfigJsonSchema };

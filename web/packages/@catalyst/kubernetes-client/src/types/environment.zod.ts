/**
 * Zod schemas for Environment CRD types
 *
 * API Group: catalyst.catalyst.dev/v1alpha1
 * Based on: operator/api/v1alpha1/environment_types.go
 *
 * These schemas provide runtime validation for Environment custom resources.
 * They match the TypeScript interfaces defined in environment.ts
 */

import { z } from "zod";
import { ConditionSchema, ObjectMetaSchema, ListMetaSchema } from "./common.zod";

/**
 * Reference to a parent Project
 */
export const ProjectReferenceSchema = z.object({
  name: z.string(),
});

/**
 * Source configuration for the environment
 */
export const EnvironmentSourceSchema = z.object({
  /** Name identifies the component */
  name: z.string(),
  /** Git commit SHA to deploy */
  commitSha: z.string(),
  /** Branch name */
  branch: z.string(),
  /** Pull request number (optional) */
  prNumber: z.number().optional(),
});

/**
 * Environment variable configuration
 */
export const EnvVarSchema = z.object({
  name: z.string(),
  value: z.string(),
});

/**
 * Environment-specific configuration overrides
 */
export const EnvironmentConfigSchema = z.object({
  /** Environment variables to inject */
  envVars: z.array(EnvVarSchema).optional(),
  /** Container image to deploy (e.g., "ghcr.io/ncrmro/catalyst:latest") */
  image: z.string().optional(),
});

/**
 * Environment type
 */
export const EnvironmentTypeSchema = z.enum(["development", "deployment"]);

/**
 * Deployment mode specifies how the operator deploys the environment
 */
export const DeploymentModeSchema = z.enum([
  "production",
  "development",
  "workspace",
]);

/**
 * Environment lifecycle phase
 */
export const EnvironmentPhaseSchema = z.enum([
  "Pending",
  "Building",
  "Deploying",
  "Ready",
  "Failed",
]);

/**
 * EnvironmentSpec defines the desired state of Environment
 */
export const EnvironmentSpecSchema = z.object({
  /** Reference to the parent Project */
  projectRef: ProjectReferenceSchema,
  /** Type of environment */
  type: EnvironmentTypeSchema,
  /** Deployment mode: "production", "development", or "workspace" (default) */
  deploymentMode: DeploymentModeSchema.optional(),
  /** Source configuration */
  sources: z.array(EnvironmentSourceSchema).optional(),
  /** Configuration overrides */
  config: EnvironmentConfigSchema.optional(),
});

/**
 * EnvironmentStatus defines the observed state of Environment
 */
export const EnvironmentStatusSchema = z.object({
  /** Current lifecycle phase */
  phase: EnvironmentPhaseSchema.optional(),
  /** Public URL if available */
  url: z.string().optional(),
  /** Detailed conditions */
  conditions: z.array(ConditionSchema).optional(),
});

/**
 * Environment is the Schema for the environments API
 */
export const EnvironmentSchema = z.object({
  apiVersion: z.literal("catalyst.catalyst.dev/v1alpha1"),
  kind: z.literal("Environment"),
  metadata: ObjectMetaSchema,
  spec: EnvironmentSpecSchema,
  status: EnvironmentStatusSchema.optional(),
});

/**
 * EnvironmentList contains a list of Environment
 */
export const EnvironmentListSchema = z.object({
  apiVersion: z.literal("catalyst.catalyst.dev/v1alpha1"),
  kind: z.literal("EnvironmentList"),
  metadata: ListMetaSchema,
  items: z.array(EnvironmentSchema),
});

/**
 * Input for creating an Environment (without status)
 */
export const EnvironmentInputSchema = EnvironmentSchema.omit({ status: true });

/**
 * Helper function to validate an Environment object
 * @param data - The data to validate
 * @returns Parsed and validated Environment object
 * @throws ZodError if validation fails
 */
export function validateEnvironment(data: unknown) {
  return EnvironmentSchema.parse(data);
}

/**
 * Helper function to safely validate an Environment object
 * @param data - The data to validate
 * @returns Success or error result
 */
export function safeValidateEnvironment(data: unknown) {
  return EnvironmentSchema.safeParse(data);
}

/**
 * Helper function to validate an EnvironmentList object
 * @param data - The data to validate
 * @returns Parsed and validated EnvironmentList object
 * @throws ZodError if validation fails
 */
export function validateEnvironmentList(data: unknown) {
  return EnvironmentListSchema.parse(data);
}

/**
 * Helper function to safely validate an EnvironmentList object
 * @param data - The data to validate
 * @returns Success or error result
 */
export function safeValidateEnvironmentList(data: unknown) {
  return EnvironmentListSchema.safeParse(data);
}

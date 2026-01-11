/**
 * Zod schemas for Kubernetes types
 *
 * This module exports all Zod schemas for runtime validation of Kubernetes resources.
 * Use these schemas to validate API responses, configuration files, or untrusted data.
 *
 * @example
 * ```typescript
 * import { EnvironmentSchema } from "@catalyst/kubernetes-client/zod";
 * import { createEnvironmentClient } from "@catalyst/kubernetes-client";
 *
 * const client = await createEnvironmentClient();
 * const env = await client.get("my-env", "default");
 *
 * // Validate the response
 * const validated = EnvironmentSchema.parse(env);
 * ```
 */

// Common schemas
export {
  OwnerReferenceSchema,
  ObjectMetaSchema,
  ConditionSchema,
  ListMetaSchema,
  WatchEventTypeSchema,
  createWatchEventSchema,
  WatchOptionsSchema,
  ListOptionsSchema,
} from "./common.zod";

// Environment schemas
export {
  ProjectReferenceSchema,
  EnvironmentSourceSchema,
  EnvVarSchema,
  EnvironmentConfigSchema,
  EnvironmentTypeSchema,
  DeploymentModeSchema,
  EnvironmentPhaseSchema,
  EnvironmentSpecSchema,
  EnvironmentStatusSchema,
  EnvironmentSchema,
  EnvironmentListSchema,
  EnvironmentInputSchema,
  validateEnvironment,
  safeValidateEnvironment,
  validateEnvironmentList,
  safeValidateEnvironmentList,
} from "./environment.zod";

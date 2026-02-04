/**
 * Secret Management Validation Schemas
 *
 * Zod schemas for validating secret operations.
 */

import { z } from "zod";

/**
 * Secret name validation regex
 * Must follow Kubernetes environment variable naming conventions:
 * - Alphanumeric characters and underscores only
 * - Must start with a letter or underscore
 * - Case-sensitive
 * - Max length: 253 characters
 */
export const SECRET_NAME_REGEX = /^[A-Z_][A-Z0-9_]*$/;

/**
 * Secret name schema
 */
export const secretNameSchema = z
  .string()
  .min(1, "Secret name is required")
  .max(253, "Secret name must be 253 characters or less")
  .regex(
    SECRET_NAME_REGEX,
    "Secret name must start with a letter or underscore and contain only uppercase letters, numbers, and underscores",
  );

/**
 * Secret value schema
 */
export const secretValueSchema = z
  .string()
  .min(1, "Secret value is required")
  .max(10000, "Secret value must be 10000 characters or less");

/**
 * Secret description schema
 */
export const secretDescriptionSchema = z
  .string()
  .max(500, "Description must be 500 characters or less")
  .optional();

/**
 * Secret scope schema
 */
export const secretScopeSchema = z.discriminatedUnion("level", [
  z.object({
    level: z.literal("team"),
    teamId: z.string().uuid(),
  }),
  z.object({
    level: z.literal("project"),
    teamId: z.string().uuid(),
    projectId: z.string().uuid(),
  }),
  z.object({
    level: z.literal("environment"),
    teamId: z.string().uuid(),
    projectId: z.string().uuid(),
    environmentId: z.string().uuid(),
  }),
]);

/**
 * Create secret input schema
 */
export const createSecretInputSchema = z.object({
  name: secretNameSchema,
  value: secretValueSchema,
  description: secretDescriptionSchema,
});

/**
 * Update secret input schema
 */
export const updateSecretInputSchema = z.object({
  value: secretValueSchema.optional(),
  description: secretDescriptionSchema,
});

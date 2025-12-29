/**
 * Zod Utilities
 *
 * Helper functions for working with Zod schemas, particularly when using
 * JSON Schema as the source of truth.
 */

import { z } from "zod";

/**
 * Helper to cast imported JSON schema to the type expected by z.fromJSONSchema.
 *
 * TypeScript widens JSON imports' string literals (e.g., `type: "object"`) to `string`,
 * which is incompatible with z.fromJSONSchema's expected literal types.
 * This helper provides a type-safe way to assert the schema structure.
 *
 * @see https://github.com/microsoft/TypeScript/issues/26552
 *
 * @example
 * ```typescript
 * import projectConfigJsonSchema from "./project-config.schema.json";
 *
 * export const ProjectConfigSchema = z.fromJSONSchema(
 *   asJsonSchema(projectConfigJsonSchema),
 * );
 * ```
 */
export function asJsonSchema<T>(
  json: T,
): Parameters<typeof z.fromJSONSchema>[0] {
  return json as Parameters<typeof z.fromJSONSchema>[0];
}

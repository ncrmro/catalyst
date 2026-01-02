/**
 * Zod Utilities
 *
 * Helper functions for working with Zod schemas.
 *
 * ## Schema Patterns
 *
 * ### Native Zod Schemas (Recommended)
 *
 * Define schemas directly in Zod and infer TypeScript types:
 *
 * ```typescript
 * import { z } from "zod";
 *
 * export const UserSchema = z.object({
 *   id: z.string().uuid(),
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * export type User = z.infer<typeof UserSchema>;
 * ```
 *
 * **Pros:**
 * - Full type inference via `z.infer<typeof Schema>`
 * - IDE autocomplete and compile-time type checking
 * - Best DX for runtime validation + TypeScript types
 *
 * **Use when:**
 * - Building internal application schemas
 * - Need type-safe schema composition with .extend(), .pick(), .partial()
 * - Want tight integration between validation and types
 *
 * ### JSON Schema (For Interop/AI)
 *
 * JSON Schema files (.json) are useful when you need the schema for:
 * - OpenAPI documentation
 * - Passing to AI models for structured output
 * - Cross-language/cross-platform interoperability
 *
 * ```typescript
 * import projectConfigJsonSchema from "./schema.json";
 *
 * // For runtime validation (types are 'unknown'):
 * const Schema = z.fromJSONSchema(asJsonSchema(projectConfigJsonSchema));
 *
 * // For AI structured output:
 * const response = await ai.generate({
 *   schema: projectConfigJsonSchema,
 *   prompt: "Generate a project config",
 * });
 * ```
 *
 * **Limitations:**
 * - `z.infer<typeof Schema>` returns `unknown` (conversion is runtime)
 * - Must define TypeScript types manually or use companion Zod schemas
 * - No Zod-specific features (refinements, transforms, custom error maps)
 *
 * **Use when:**
 * - Need schema for OpenAPI/Swagger documentation
 * - Passing to AI models (Claude, GPT) for structured output
 * - Sharing schema across languages/platforms
 *
 * ### Hybrid Approach
 *
 * Keep JSON Schema for documentation/AI and define Zod schemas for validation:
 *
 * ```typescript
 * // Zod schema is source of truth for types + validation
 * export const ProjectConfigSchema = z.object({ ... });
 * export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
 *
 * // JSON Schema kept for documentation/AI (manually synced or auto-generated)
 * import projectConfigJsonSchema from "./schema.json";
 * export { projectConfigJsonSchema };
 * ```
 */

import type { z } from "zod";

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
 * // Runtime validation only - z.infer<> returns 'unknown'
 * export const ProjectConfigSchema = z.fromJSONSchema(
 *   asJsonSchema(projectConfigJsonSchema),
 * );
 *
 * // For AI/documentation use, the JSON schema works directly
 * const response = await ai.generate({ schema: projectConfigJsonSchema });
 * ```
 */
export function asJsonSchema<T>(
	json: T,
): Parameters<typeof z.fromJSONSchema>[0] {
	return json as Parameters<typeof z.fromJSONSchema>[0];
}

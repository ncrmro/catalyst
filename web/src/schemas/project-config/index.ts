/**
 * Project Configuration Schemas
 *
 * JSON Schema is the source of truth. Zod schemas are generated at runtime
 * using Zod 4's native z.fromJSONSchema() for validation.
 */

import * as z from "zod";
import { asJsonSchema } from "@tetrastack/backend";
import projectConfigJsonSchema from "./project-config.schema.json";

// ============================================================================
// Convert JSON Schema to Zod Schema at Runtime
// ============================================================================

export const ProjectConfigSchema = z.fromJSONSchema(
  asJsonSchema(projectConfigJsonSchema),
);

// ============================================================================
// Type Exports (inferred from Zod schema)
// ============================================================================

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// Re-export the JSON Schema for documentation/OpenAPI use
export { projectConfigJsonSchema };

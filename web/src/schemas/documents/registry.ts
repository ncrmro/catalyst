import { z } from "zod";
import { ExternalAgentTaskSchema, EXTERNAL_AGENT_TASK_TYPE_ID } from "./external-agent-task";

/**
 * Document Type Registry
 * Central registry for all document types in the system.
 */

export interface DocumentType<TSchema extends z.ZodType = z.ZodType> {
  typeId: string;
  schema: TSchema;
  description: string;
}

export const documentRegistry = {
  [EXTERNAL_AGENT_TASK_TYPE_ID]: {
    typeId: EXTERNAL_AGENT_TASK_TYPE_ID,
    schema: ExternalAgentTaskSchema,
    description: "Tracks work delegated to external AI agents",
  } as DocumentType<typeof ExternalAgentTaskSchema>,
} as const;

export type DocumentRegistry = typeof documentRegistry;
export type DocumentTypeId = keyof DocumentRegistry;

/**
 * Validate document content against its registered schema
 */
export function validateDocument<TTypeId extends DocumentTypeId>(
  typeId: TTypeId,
  content: unknown,
): any {
  const docType = documentRegistry[typeId];
  if (!docType) {
    throw new Error(`Unknown document type: ${typeId}`);
  }
  return docType.schema.parse(content);
}

/**
 * Get schema for a document type
 */
export function getDocumentSchema<TTypeId extends DocumentTypeId>(
  typeId: TTypeId,
): any {
  const docType = documentRegistry[typeId];
  if (!docType) {
    throw new Error(`Unknown document type: ${typeId}`);
  }
  return docType.schema;
}

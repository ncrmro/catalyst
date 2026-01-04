import { z } from "zod";
import type { DocumentRegistry } from "./registry";

/**
 * Query helpers for type-safe document retrieval
 *
 * This module provides factory functions to create type-safe query helpers
 * that validate document content against registered schemas.
 *
 * Note: This implementation uses Drizzle ORM's flexible API to work with
 * any table structure. The database parameter is generic to support any
 * Drizzle instance type.
 */

/**
 * Options for creating a typed document query helper
 */
export interface CreateTypedDocumentQueriesOptions<TDb> {
  /** A function that retrieves a document by ID from the database */
  getDocumentById: (db: TDb, id: string) => Promise<unknown>;
  /** A function that retrieves a document type by ID from the database */
  getDocumentTypeById: (db: TDb, id: string) => Promise<unknown>;
  /** The document registry with all registered types */
  registry: DocumentRegistry;
}

/**
 * Document with type information and validated content
 */
export interface TypedDocument<
  TSlug extends string = string,
  TContent = unknown,
> {
  id: string;
  typeId: string;
  typeSlug: TSlug;
  typeName: string;
  content: TContent;
  [key: string]: unknown; // Allow other columns from table
}

/**
 * Result of getting a typed document
 */
export type GetTypedDocumentResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create type-safe query helpers for documents
 *
 * This factory function returns helper functions that can safely retrieve
 * and validate document content against the registered schemas.
 *
 * The approach uses callback functions instead of table references to avoid
 * TypeScript table column type constraints.
 *
 * @example
 * ```typescript
 * const { getDocumentTyped } = createTypedDocumentQueries({
 *   getDocumentById: async (db, id) => {
 *     const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
 *     return result[0];
 *   },
 *   getDocumentTypeById: async (db, id) => {
 *     const result = await db.select().from(documentTypes).where(eq(documentTypes.id, id)).limit(1);
 *     return result[0];
 *   },
 *   registry,
 * });
 *
 * // Type-safe retrieval
 * const result = await getDocumentTyped(db, 'doc-123', 'lean-canvas');
 * if (result.success) {
 *   // result.data.content is typed as LeanCanvasContent
 * }
 * ```
 */
export function createTypedDocumentQueries<TDb>(
  options: CreateTypedDocumentQueriesOptions<TDb>,
) {
  const { getDocumentById, getDocumentTypeById, registry } = options;

  /**
   * Get a document by ID with type validation
   *
   * If expectedSlug is provided, validates that the document matches that type.
   * Content is validated against the registered schema.
   *
   * @param db - Drizzle database instance
   * @param id - Document ID
   * @param expectedSlug - Optional expected document type slug for validation
   * @returns Result with typed document or error
   */
  async function getDocumentTyped<TSlug extends string>(
    db: TDb,
    id: string,
    expectedSlug?: TSlug,
  ): Promise<GetTypedDocumentResult<TypedDocument<TSlug>>> {
    try {
      // Retrieve document from database
      const doc = await getDocumentById(db, id);

      if (!doc) {
        return {
          success: false,
          error: `Document with ID '${id}' not found`,
        };
      }

      const docRecord = doc as Record<string, unknown>;

      // Get the document type
      const typeId = docRecord.typeId as string | undefined;
      if (!typeId) {
        return {
          success: false,
          error: `Document '${id}' has no typeId`,
        };
      }

      const docType = await getDocumentTypeById(db, typeId);
      if (!docType) {
        return {
          success: false,
          error: `Document type with ID '${typeId}' not found`,
        };
      }

      const typeRecord = docType as Record<string, unknown>;
      const typeSlug = (typeRecord.slug as TSlug) || "unknown";

      // Validate expected type if provided
      if (expectedSlug && typeSlug !== expectedSlug) {
        return {
          success: false,
          error: `Expected document type '${expectedSlug}', but got '${typeSlug}'`,
        };
      }

      // Validate content against schema
      if (!registry.has(typeSlug)) {
        return {
          success: false,
          error: `Document type '${typeSlug}' is not registered`,
        };
      }

      let validatedContent: unknown;
      try {
        validatedContent = registry.validate(typeSlug, docRecord.content);
      } catch (error) {
        let message: string;
        if (error instanceof z.ZodError) {
          message = error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; ");
        } else {
          message = String(error);
        }
        return {
          success: false,
          error: `Content validation failed: ${message}`,
        };
      }

      return {
        success: true,
        data: {
          ...docRecord,
          typeSlug,
          typeName: typeRecord.name as string,
          content: validatedContent,
        } as TypedDocument<TSlug>,
      };
    } catch (error) {
      return {
        success: false,
        error: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get multiple documents with type validation
   *
   * Filters out documents that don't match the expected type slug.
   * Content is validated for each document.
   *
   * @param db - Drizzle database instance
   * @param ids - Array of document IDs
   * @param expectedSlug - Optional expected document type slug
   * @returns Array of typed documents or error details
   */
  async function getDocumentsTyped<TSlug extends string>(
    db: TDb,
    ids: string[],
    expectedSlug?: TSlug,
  ): Promise<{
    success: boolean;
    data: TypedDocument<TSlug>[];
    errors: Array<{ id: string; error: string }>;
  }> {
    const results: TypedDocument<TSlug>[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const result = await getDocumentTyped(db, id, expectedSlug);
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({ id, error: result.error });
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      errors,
    };
  }

  /**
   * Assert document type matches expected slug and return typed content
   *
   * Throws if type doesn't match or validation fails.
   *
   * @param db - Drizzle database instance
   * @param id - Document ID
   * @param expectedSlug - Expected document type slug
   * @returns Typed document (throws on error)
   */
  async function getDocumentTypedOrThrow<TSlug extends string>(
    db: TDb,
    id: string,
    expectedSlug: TSlug,
  ): Promise<TypedDocument<TSlug>> {
    const result = await getDocumentTyped(db, id, expectedSlug);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  return {
    getDocumentTyped,
    getDocumentsTyped,
    getDocumentTypedOrThrow,
  };
}

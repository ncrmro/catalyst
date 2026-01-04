import { z } from "zod";

/**
 * DocumentRegistry - Type-safe document content management
 *
 * This module provides the core infrastructure for creating discriminated unions
 * of document types and their associated content schemas. It ensures that document
 * content is validated and type-safe at compile-time and runtime.
 */

/**
 * Base options for registering a document type
 */
export interface DocumentTypeRegistryOptions<
  TSlug extends string = string,
  TContent extends Record<string, unknown> = Record<string, unknown>,
> {
  /** URL-friendly identifier (e.g., 'lean-canvas') */
  slug: TSlug;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Zod schema for content validation */
  schema: z.ZodSchema<TContent>;
  /** Agent configuration (can be extended by host app) */
  agentConfig?: Record<string, unknown>;
  /** Display order in UI */
  displayOrder?: number;
}

/**
 * A registered document type with its schema
 */
export interface DocumentTypeEntry<
  TSlug extends string = string,
  TContent extends Record<string, unknown> = Record<string, unknown>,
> {
  slug: TSlug;
  name: string;
  description?: string;
  schema: z.ZodSchema<TContent>;
  agentConfig?: Record<string, unknown>;
  displayOrder: number;
  /** Extract the inferred content type */
  contentType?: TContent;
}

/**
 * DocumentRegistry - Stores and manages document type definitions
 *
 * Usage:
 * ```typescript
 * const registry = new DocumentRegistry()
 *   .register({
 *     slug: 'lean-canvas',
 *     name: 'Lean Canvas',
 *     schema: LeanCanvasSchema,
 *   })
 *   .register({
 *     slug: 'persona',
 *     name: 'Customer Persona',
 *     schema: PersonaSchema,
 *   });
 * ```
 */
export class DocumentRegistry {
  private entries: Map<string, DocumentTypeEntry> = new Map();

  /**
   * Register a document type
   */
  register<TSlug extends string, TContent extends Record<string, unknown>>(
    options: DocumentTypeRegistryOptions<TSlug, TContent>,
  ): this {
    if (this.entries.has(options.slug)) {
      throw new Error(`Document type '${options.slug}' is already registered`);
    }

    this.entries.set(options.slug, {
      slug: options.slug,
      name: options.name,
      description: options.description,
      schema: options.schema,
      agentConfig: options.agentConfig,
      displayOrder: options.displayOrder ?? 0,
    });

    return this;
  }

  /**
   * Get a registered document type by slug
   */
  get<TSlug extends string>(slug: TSlug): DocumentTypeEntry<TSlug> | undefined {
    return this.entries.get(slug) as DocumentTypeEntry<TSlug> | undefined;
  }

  /**
   * Get all registered document types
   */
  getAll(): DocumentTypeEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  }

  /**
   * Check if a document type is registered
   */
  has(slug: string): boolean {
    return this.entries.has(slug);
  }

  /**
   * Validate content against a registered document type's schema
   *
   * @throws {Error} If the document type is not registered
   * @throws {ZodError} If validation fails
   */
  validate<TSlug extends string>(
    slug: TSlug,
    content: unknown,
  ): z.infer<z.ZodSchema> {
    const entry = this.get(slug);
    if (!entry) {
      throw new Error(`Document type '${slug}' is not registered`);
    }

    return entry.schema.parse(content);
  }

  /**
   * Validate content and return result instead of throwing
   */
  safeValidate<TSlug extends string>(
    slug: TSlug,
    content: unknown,
  ):
    | { success: true; data: z.infer<z.ZodSchema> }
    | { success: false; error: z.ZodError } {
    const entry = this.get(slug);
    if (!entry) {
      return {
        success: false,
        error: new z.ZodError([
          {
            code: "custom",
            message: `Document type '${slug}' is not registered`,
            path: [],
          },
        ]),
      };
    }

    return entry.schema.safeParse(content);
  }
}

/**
 * Create a new document registry
 */
export function createDocumentRegistry(): DocumentRegistry {
  return new DocumentRegistry();
}

/**
 * Build a discriminated union type from registry entries
 *
 * This is a helper type to create a discriminated union of all registered document types.
 * It's primarily useful for type inference and documentation.
 *
 * Example:
 * ```typescript
 * type AllDocuments = BuildDocumentUnion<typeof myRegistry>;
 * // Results in:
 * // | { typeSlug: 'lean-canvas'; content: LeanCanvasContent }
 * // | { typeSlug: 'persona'; content: PersonaContent }
 * ```
 */
export type BuildDocumentUnion<TRegistry> = TRegistry extends DocumentRegistry
  ? never // Runtime value, not a type
  : never;

/**
 * Get the inferred content type from a schema
 * Utility type for extracting content type from a Zod schema
 */
export type InferDocumentContent<TSchema extends z.ZodSchema> =
  z.infer<TSchema>;

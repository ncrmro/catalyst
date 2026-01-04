import { describe, it, expect, beforeEach } from "vitest";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { documentTypesColumns, documentsColumns } from "../src/schema/sqlite";
import {
  createDocumentRegistry,
  createTypedDocumentQueries,
} from "../src/index";

describe("@tetrastack/documents integration", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  // Define host app tables (mock)
  const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    name: text("name"),
  });

  const projects = sqliteTable("projects", {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
  });

  // Define document tables using the package columns
  const documentTypes = sqliteTable("document_types", {
    ...documentTypesColumns,
  });

  const documents = sqliteTable("documents", {
    ...documentsColumns,
    // Inject app-specific columns
    projectId: text("project_id").references(() => projects.id),
    userId: text("user_id").references(() => users.id),
    status: text("status").notNull().default("draft"),
  });

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite);

    // Create tables
    sqlite.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT);
      
      CREATE TABLE document_types (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        schema TEXT,
        agent_config TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        project_id TEXT,
        user_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        FOREIGN KEY (type_id) REFERENCES document_types(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  });

  it("should support inserting and retrieving document types", async () => {
    const typeId = "type-1";
    await db.insert(documentTypes).values({
      id: typeId,
      slug: "lean-canvas",
      name: "Lean Canvas",
      schema: { type: "object" },
      agentConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await db.select().from(documentTypes);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("lean-canvas");
    expect(result[0].schema).toEqual({ type: "object" });
  });

  it("should support inserting documents with extended columns", async () => {
    // Setup dependencies
    const typeId = "type-1";
    await db.insert(documentTypes).values({
      id: typeId,
      slug: "lean-canvas",
      name: "Lean Canvas",
      schema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const projectId = "proj-1";
    await db.insert(projects).values({
      id: projectId,
      slug: "test-project",
    });

    // Insert document
    const docId = "doc-1";
    await db.insert(documents).values({
      id: docId,
      typeId,
      projectId,
      slug: "my-canvas",
      title: "My Canvas",
      content: { problem: "none" },
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await db.select().from(documents);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My Canvas");
    expect(result[0].projectId).toBe(projectId);
    expect(result[0].status).toBe("active");
  });
});

describe("DocumentRegistry and typed queries", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  // Define test schemas
  const RecipeSchema = z.object({
    title: z.string(),
    servings: z.number(),
    ingredients: z.array(z.object({ name: z.string(), amount: z.number() })),
  });

  const ShoppingListSchema = z.object({
    title: z.string(),
    items: z.array(z.object({ name: z.string(), completed: z.boolean() })),
  });

  // Define test tables
  const testDocumentTypes = sqliteTable("test_document_types", {
    ...documentTypesColumns,
  });

  const testDocuments = sqliteTable("test_documents", {
    ...documentsColumns,
    projectId: text("project_id"),
  });

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite);

    // Create tables
    sqlite.exec(`
      CREATE TABLE test_projects (id TEXT PRIMARY KEY, slug TEXT);

      CREATE TABLE test_document_types (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        schema TEXT,
        agent_config TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE test_documents (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        project_id TEXT,
        FOREIGN KEY (type_id) REFERENCES test_document_types(id),
        FOREIGN KEY (project_id) REFERENCES test_projects(id)
      );
    `);
  });

  it("should register document types and validate content", () => {
    const registry = createDocumentRegistry()
      .register({
        slug: "recipe",
        name: "Recipe",
        schema: RecipeSchema,
      })
      .register({
        slug: "shopping-list",
        name: "Shopping List",
        schema: ShoppingListSchema,
      });

    expect(registry.has("recipe")).toBe(true);
    expect(registry.has("shopping-list")).toBe(true);
    expect(registry.has("nonexistent")).toBe(false);

    const types = registry.getAll();
    expect(types).toHaveLength(2);
  });

  it("should validate content against schema", () => {
    const registry = createDocumentRegistry().register({
      slug: "recipe",
      name: "Recipe",
      schema: RecipeSchema,
    });

    const validContent = {
      title: "Pasta Carbonara",
      servings: 4,
      ingredients: [
        { name: "pasta", amount: 500 },
        { name: "eggs", amount: 3 },
      ],
    };

    const validated = registry.validate("recipe", validContent);
    expect(validated).toEqual(validContent);
  });

  it("should throw on invalid content", () => {
    const registry = createDocumentRegistry().register({
      slug: "recipe",
      name: "Recipe",
      schema: RecipeSchema,
    });

    const invalidContent = {
      title: "Pasta Carbonara",
      servings: "four", // should be number
      ingredients: [],
    };

    expect(() => registry.validate("recipe", invalidContent)).toThrow();
  });

  it("should safely validate content without throwing", () => {
    const registry = createDocumentRegistry().register({
      slug: "recipe",
      name: "Recipe",
      schema: RecipeSchema,
    });

    const invalidContent = {
      title: "Pasta Carbonara",
      servings: "four", // should be number
      ingredients: [],
    };

    const result = registry.safeValidate("recipe", invalidContent);
    expect(result.success).toBe(false);
  });

  it("should throw on unregistered document type", () => {
    const registry = createDocumentRegistry();

    expect(() => registry.validate("nonexistent", {})).toThrow();
  });

  it("should retrieve and validate documents with typed queries", async () => {
    // Setup
    const registry = createDocumentRegistry().register({
      slug: "recipe",
      name: "Recipe",
      schema: RecipeSchema,
    });

    const typeId = "type-1";
    await db.insert(testDocumentTypes).values({
      id: typeId,
      slug: "recipe",
      name: "Recipe",
      schema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const docId = "doc-1";
    const recipeContent = {
      title: "Pasta Carbonara",
      servings: 4,
      ingredients: [{ name: "pasta", amount: 500 }],
    };

    await db.insert(testDocuments).values({
      id: docId,
      typeId,
      slug: "pasta-carbonara",
      title: "Pasta Carbonara",
      content: recipeContent,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create typed query helpers
    type DBType = ReturnType<typeof drizzle>;
    const { getDocumentTyped } = createTypedDocumentQueries<DBType>({
      getDocumentById: async (drizzleDb, id) => {
        const result = await (drizzleDb as DBType)
          .select()
          .from(testDocuments)
          .where(eq(testDocuments.id, id))
          .limit(1);
        return result[0];
      },
      getDocumentTypeById: async (drizzleDb, id) => {
        const result = await (drizzleDb as DBType)
          .select()
          .from(testDocumentTypes)
          .where(eq(testDocumentTypes.id, id))
          .limit(1);
        return result[0];
      },
      registry,
    });

    // Retrieve and validate
    const result = await getDocumentTyped(db, docId, "recipe");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toEqual(recipeContent);
      expect(result.data.typeSlug).toBe("recipe");
      expect(result.data.typeName).toBe("Recipe");
    }
  });

  it("should handle type mismatch in typed queries", async () => {
    const registry = createDocumentRegistry()
      .register({
        slug: "recipe",
        name: "Recipe",
        schema: RecipeSchema,
      })
      .register({
        slug: "shopping-list",
        name: "Shopping List",
        schema: ShoppingListSchema,
      });

    const typeId = "type-1";
    await db.insert(testDocumentTypes).values({
      id: typeId,
      slug: "recipe",
      name: "Recipe",
      schema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const docId = "doc-1";
    await db.insert(testDocuments).values({
      id: docId,
      typeId,
      slug: "pasta",
      title: "Pasta",
      content: {
        title: "Pasta Carbonara",
        servings: 4,
        ingredients: [{ name: "pasta", amount: 500 }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    type DBType = ReturnType<typeof drizzle>;
    const { getDocumentTyped } = createTypedDocumentQueries<DBType>({
      getDocumentById: async (drizzleDb, id) => {
        const result = await (drizzleDb as DBType)
          .select()
          .from(testDocuments)
          .where(eq(testDocuments.id, id))
          .limit(1);
        return result[0];
      },
      getDocumentTypeById: async (drizzleDb, id) => {
        const result = await (drizzleDb as DBType)
          .select()
          .from(testDocumentTypes)
          .where(eq(testDocumentTypes.id, id))
          .limit(1);
        return result[0];
      },
      registry,
    });

    // Try to retrieve as wrong type
    const result = await getDocumentTyped(db, docId, "shopping-list");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Expected document type");
    }
  });
});

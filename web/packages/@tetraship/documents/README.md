# @tetrastack/documents

A project-agnostic package for managing document schemas and logic using Drizzle ORM and Zod.

## Features

- **Multi-Dialect Support**: Schema definitions for both SQLite and PostgreSQL.
- **Project Agnostic**: Core column definitions only. Host application creates tables and injects relationships.
- **Structured Content**: Validated JSON content using Zod.
- **Type-Safe Document Registry**: Discriminated unions with compile-time type safety for document content.
- **Runtime Validation**: Zod-based validation for all document content at retrieval time.
- **UUIDv7**: Always uses `uuidv7` from `@tetrastack/backend` for IDs.

## Installation

```bash
npm install @tetrastack/documents
```

## Usage

### 1. Define Schema

In your application's schema file, spread the core columns and add your app-specific ones:

**SQLite:**

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import {
  documentTypesColumns,
  documentsColumns,
} from "@tetrastack/documents/sqlite";
import { users, projects } from "./my-schema";

export const documentTypes = sqliteTable("document_types", {
  ...documentTypesColumns,
});

export const documents = sqliteTable("documents", {
  ...documentsColumns,
  // Inject app-specific columns
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"),
  sourceWorkflowType: text("source_workflow_type"),
  version: integer("version").notNull().default(1),
  localId: text("local_id"),
});
```

**PostgreSQL:**

```typescript
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { documentTypesColumns, documentsColumns } from '@tetrastack/documents/postgres';

export const documentTypes = pgTable('document_types', {
  ...documentTypesColumns,
});

export const documents = pgTable('documents', {
  ...documentsColumns,
  projectId: text('project_id').references(...),
  // ...
});
```

### 2. Relations

Define relations in your host application:

```typescript
export const documentsRelations = relations(documents, ({ one }) => ({
  type: one(documentTypes, {
    fields: [documents.typeId],
    references: [documentTypes.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
}));
```

### 3. Type-Safe Document Registry

Create a registry of document types with Zod schemas for content validation:

**Define content schemas:**

```typescript
// schemas/documents.ts
import { z } from "zod";
import { createDocumentRegistry } from "@tetrastack/documents";

const RecipeSchema = z.object({
  title: z.string(),
  servings: z.number(),
  prepTime: z.number(), // minutes
  cookTime: z.number(), // minutes
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      unit: z.string(),
    }),
  ),
  instructions: z.array(z.string()),
  tags: z.array(z.string()),
});

const ShoppingListSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      completed: z.boolean(),
      category: z.string().optional(),
    }),
  ),
  createdDate: z.string(),
});

// Create and register types
export const documentRegistry = createDocumentRegistry()
  .register({
    slug: "recipe",
    name: "Recipe",
    description: "Cooking recipe with ingredients and instructions",
    schema: RecipeSchema,
    displayOrder: 0,
  })
  .register({
    slug: "shopping-list",
    name: "Shopping List",
    description: "Shopping list with items and quantities",
    schema: ShoppingListSchema,
    displayOrder: 1,
  });

// Export inferred types for use in components
export type RecipeContent = z.infer<typeof RecipeSchema>;
export type ShoppingListContent = z.infer<typeof ShoppingListSchema>;
```

**Create typed query helpers:**

```typescript
// models/documents.ts
import { createTypedDocumentQueries } from "@tetrastack/documents";
import { documents, documentTypes } from "@/database/schema";
import { documentRegistry } from "@/schemas/documents";

export const { getDocumentTyped, getDocumentsTyped, getDocumentTypedOrThrow } =
  createTypedDocumentQueries({
    documentsTable: documents,
    documentTypesTable: documentTypes,
    registry: documentRegistry,
  });
```

**Use typed helpers in your code:**

```typescript
// In actions or components
import { getDocumentTyped, getDocumentTypedOrThrow } from "@/models/documents";

// Safe retrieval with error handling
const result = await getDocumentTyped(db, "doc-123", "recipe");
if (result.success) {
  // result.data.content is typed as RecipeContent
  console.log(`Recipe: ${result.data.content.title}`);
  console.log(`Servings: ${result.data.content.servings}`);
  result.data.content.ingredients.forEach((ing) => {
    console.log(`- ${ing.amount} ${ing.unit} ${ing.name}`);
  });
}

// Or throw on error
try {
  const doc = await getDocumentTypedOrThrow(db, "doc-456", "shopping-list");
  // doc.content is typed as ShoppingListContent
  console.log(`Shopping list: ${doc.content.title}`);
  const incomplete = doc.content.items.filter((item) => !item.completed);
  console.log(`Items to buy: ${incomplete.length}`);
} catch (error) {
  // Handle validation or retrieval errors
}

// Retrieve multiple documents of the same type
const multiResult = await getDocumentsTyped(db, ["doc-1", "doc-2"], "recipe");
if (multiResult.success) {
  multiResult.data.forEach((doc) => {
    // Each document is validated and typed as RecipeContent
    const totalTime = doc.content.prepTime + doc.content.cookTime;
    console.log(`${doc.content.title}: ${totalTime} minutes`);
  });
} else {
  console.error("Failed to retrieve some documents:", multiResult.errors);
}
```

### 4. Runtime Validation

The registry validates document content at retrieval time:

```typescript
// Validation happens automatically
const result = await getDocumentTyped(db, "doc-123", "recipe");
if (!result.success) {
  // Content validation failed
  console.error(result.error);
}

// Manual validation if needed
const registry = documentRegistry;
try {
  const validContent = registry.validate("shopping-list", rawContent);
  // validContent is typed as ShoppingListContent
  console.log(`Valid shopping list with ${validContent.items.length} items`);
} catch (error) {
  // Handle Zod validation error
}

// Safe validation without throwing
const safeResult = registry.safeValidate("recipe", rawContent);
if (safeResult.success) {
  const recipe = safeResult.data as RecipeContent;
  console.log(
    `${recipe.title} takes ${recipe.prepTime + recipe.cookTime} minutes`,
  );
} else {
  console.error("Validation errors:", safeResult.error.errors);
}
```

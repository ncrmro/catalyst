# Database Layer

## Overview

The database layer uses PostgreSQL with Drizzle ORM for type-safe database operations.

## Schema Organization

The database is organized in a single schema file (`schema.ts`) with related tables:

### Authentication & Users

- `users`: Core user data with admin status
- `accounts`: OAuth provider account links (NextAuth.js)
- `sessions`: User session management
- `verificationTokens`: Email verification tokens
- `authenticators`: WebAuthn/2FA credentials

### Teams

- `teams`: Team/organization entities with ownership
- `teamsMemberships`: User-team relationships with roles (owner/admin/member)

### Repositories & Projects

- `repos`: GitHub repository metadata synced from GitHub API
- `projects`: Projects that group repositories and environments
- `projectsRepos`: Many-to-many relationship between projects and repos
- `projectEnvironments`: Environment configurations per project/repo
- `projectManifests`: Detected manifest files (Dockerfile, Chart.yaml, etc.) that hint at deployment strategies

### GitHub Integration

- `githubUserTokens`: Encrypted GitHub App user tokens with refresh capabilities
- `pullRequests`: Pull request tracking from various git providers

### Reports

- `reports`: Generated periodic reports with JSONB data field for flexible report structure

## Migration Management

### Migration Commands

```bash
npm run db:generate     # Generate migration files from schema changes
npm run db:migrate      # Apply migrations to database
make migration-reconcile # Resolve migration conflicts across branches
npx drizzle-kit generate --custom --name=<migration_name> # Generate custom migration file for manual SQL
```

**Custom Migrations**: When you need to write manual SQL (for data migrations, complex alterations, etc.), use `npx drizzle-kit generate --custom --name=<descriptive_name>` to create an empty migration file that you can populate with custom SQL.

### When to Reconcile Migrations

Use `make migration-reconcile` when:

- Working across multiple branches with schema changes
- Migration conflicts occur during merge
- Database schema is out of sync with migration files

## Data Operations

```bash
npm run db:seed         # Seed database with test data
npm run db:dataload     # Load additional data
```

## Common Patterns

### Primary Keys

- **UUIDs**: Used for most entities, generated via `crypto.randomUUID()`
  - Format: `text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
- **Text IDs**: Used for users (required by NextAuth.js adapter)

### Relationships

- Use Drizzle's `relations()` for type-safe joins
- Define foreign keys with `references()` and appropriate cascade behavior
- Use `onDelete: 'cascade'` for dependent data (e.g., food nutrients)

### Indexing

- Create indexes for frequently queried columns
- Use composite indexes for multi-column queries
- Example: `index('foods_type_idx').on(foods.type)`

### JSON Columns

- Use `text('column_name', { mode: 'json' })` for structured data
- Validate with Zod schemas in application code
- Examples: `wholeUnits` in foods, `onboardingData` in users

### Enums

- Define as TypeScript const arrays: `export const FOOD_TYPES = ['raw', 'processed', 'manufactured'] as const;`
- Use in schema: `text('type', { enum: FOOD_TYPES })`
- Provides type safety and validation

## Type Generation

- Types are auto-generated from schema definitions
- Import types from schema files: `import type { InsertFood, SelectFood } from '@/lib/db/schema.foods.types'`
- Drizzle generates `Insert*` and `Select*` types for each table
- Use Zod schemas (defined alongside tables) for validation

## Working with the Database

### Import Pattern

```typescript
import { db } from "@/lib/db";
import { projects, projectEnvironments } from "@/db/schema";
```

### Query Examples

```typescript
// Insert with returning
const [newProject] = await db.insert(projects).values(data).returning();

// Select with join
const projectWithEnvironments = await db
  .select()
  .from(projects)
  .leftJoin(projectEnvironments, eq(projectEnvironments.projectId, projects.id))
  .where(eq(projects.id, projectId));

// Update
await db.update(projects).set({ name: "New Name" }).where(eq(projects.id, id));

// Delete with cascade
await db.delete(projects).where(eq(projects.id, id)); // Cascades to projectEnvironments
```

## Best Practices

1. **Schema Changes**: Always generate migrations after schema changes
2. **Type Safety**: Use generated types, never `any`
3. **Validation**: Validate input with Zod before database operations
4. **Relations**: Prefer type-safe joins over manual queries
5. **Indexes**: Add indexes for performance-critical queries
6. **Cascade Deletes**: Use carefully; document dependencies
7. **Transactions**: Use for multi-table operations that must succeed/fail together
8. **UUIDs**: Standard approach for distributed systems

## Connection Management

- Database connection is initialized in `src/lib/db/index.ts`
- Uses environment variable `DATABASE_URL` for connection string
- Local development: PostgreSQL (via Docker Compose)
- Production: PostgreSQL (managed service or self-hosted)

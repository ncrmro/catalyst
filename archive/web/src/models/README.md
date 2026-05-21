# Models Layer

## Purpose

Models contain complex database operations and business logic, following Rails conventions.

## Responsibilities

- **Complex queries**: Multi-table joins, aggregations, relations
- **Business logic**: Slug generation, data transformations
- **Database transactions**: Atomic operations across multiple tables
- **Data integrity**: Validations, constraints, consistency checks

## Architecture Pattern

```
Actions (auth & request handling)
        ↓
    Models  ← YOU ARE HERE
        ↓
Database (schemas & queries)
```

## Usage Pattern

```typescript
// src/models/projects.ts
import { db } from "@/lib/db";
import { projects, projectsRepos } from "@/db/schema";
import type { InsertProject } from "@/db/schema";

// Complex database operation with transactions
export async function createProjectWithRepos(
  data: InsertProject,
  repoIds: string[],
) {
  return db.transaction(async (tx) => {
    const [project] = await tx.insert(projects).values(data).returning();
    const projectRepos = repoIds.map((repoId) => ({
      projectId: project.id,
      repoId,
      isPrimary: false,
    }));
    await tx.insert(projectsRepos).values(projectRepos);
    return { success: true, project };
  });
}
```

## Key Principles

1. **No authentication** - Auth handled by actions layer
2. **Pure functions** - Database operations only
3. **Complex logic** - Multi-step operations, transactions
4. **Reusable** - Can be called by multiple actions
5. **Type-safe** - Full TypeScript types from schemas

## Function Design Patterns

### Prefer Bulk Operations

**Always prefer single bulk methods with array parameters over multiple specific functions.** This avoids writing superfluous functions for each scenario.

#### ✅ Good: Single bulk function with array parameters

```typescript
// Single flexible function using WHERE IN clauses
export async function getProjects(params: {
  ids?: string[];
  teamId?: string;
  ownerLogin?: string;
}) {
  const conditions = [];
  if (params.ids) conditions.push(inArray(projects.id, params.ids));
  if (params.teamId) conditions.push(eq(projects.teamId, params.teamId));
  if (params.ownerLogin)
    conditions.push(eq(projects.ownerLogin, params.ownerLogin));

  return db
    .select()
    .from(projects)
    .where(and(...conditions));
}

// Usage handles all scenarios
const byId = await getProjects({ ids: ["proj-1"] });
const byTeam = await getProjects({ teamId: "team-123" });
const multiple = await getProjects({ ids: ["proj-1", "proj-2", "proj-3"] });
```

#### ❌ Bad: Multiple specific functions

```typescript
// Avoid creating separate functions for each scenario
export async function getProjectById(id: string) { ... }
export async function getProjectByName(name: string) { ... }
export async function getProjectsByIds(ids: string[]) { ... }
export async function getProjectsByTeam(teamId: string) { ... }
```

### Apply to Create/Update Too

```typescript
// ✅ Single create function handles both single and bulk
export async function createProjects(data: InsertProject | InsertProject[]) {
  const items = Array.isArray(data) ? data : [data];
  return db.insert(projects).values(items).returning();
}
```

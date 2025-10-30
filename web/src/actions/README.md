# Actions Layer

## Purpose

The `actions/` directory serves as the boundary layer between backend code (database schemas, models, agents) and **ALL React components**.
This creates a clean separation of concerns where React components only interact with the actions layer, never directly with the underlying implementation.

## Architecture Pattern

```
React Components (any)
        ↓
    Actions Layer  ← YOU ARE HERE
        ↓
Backend (DB/Models/Agents)
```

## Import Rules

### ✅ React Components (ALL)

```typescript
// ANY React component should import from actions
import {
  createProject,
  updateProject,
  type SelectProject,
  type InsertProject,
} from "@/actions/projects";
import {
  createCluster,
  type SelectCluster,
  type ClusterConfig,
} from "@/actions/clusters";
```

## Re-export Pattern

Each action file re-exports types that React components need:

```typescript
// src/actions/projects.ts
"use server";

import type { InsertProject, SelectProject } from "@/db/schema";
import { createProjectWithRepos } from "@/models/projects";

// Re-export types for React components
export type {
  InsertProject,
  SelectProject,
  InsertProjectEnvironment,
  SelectProjectEnvironment,
} from "@/db/schema";

// Re-export model types if needed by components
export type { ProjectWithRepos } from "@/models/projects";

// Action functions
export async function createProject(data: InsertProject) {
  // implementation
}
```

## Key Requirements

1. **"use server" directive**: All action files must start with `'use server';`
2. **Type re-exports**: Only re-export types actually used by React components
3. **No redirects in actions**: Return success/error objects and handle navigation in components
4. **Authentication**: Most actions require authentication via `auth()` from NextAuth
5. **Avoid superfluous functions**: Follow the bulk operation pattern from `src/models/README.md` - prefer single flexible functions with array parameters over multiple specific functions for each scenario

## Benefits

- **Clean separation**: React components don't know about database schemas or models
- **Type safety**: Components get properly typed interfaces
- **Single import**: Components import actions and types from one place
- **Maintainability**: Changes to backend implementation don't affect component imports

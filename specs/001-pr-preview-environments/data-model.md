# Data Model: PR Preview Environments

**Feature**: PR Preview Environment Deployment
**Date**: 2025-01-08
**Status**: Phase 1 Design

## Entities

### 1. PullRequestPod (NEW)

Represents a deployed preview environment for a specific pull request.

**Purpose**: Track deployment state, Kubernetes resources, and public access for preview environments.

**Fields**:
- `id` (text, PK): UUID identifier
- `pullRequestId` (text, FK → pullRequests.id): Link to PR record
- `commitSha` (text, NOT NULL): Git commit SHA this deployment represents
- `namespace` (text, NOT NULL): Kubernetes namespace name (e.g., `pr-myrepo-123`)
- `deploymentName` (text, NOT NULL): Helm deployment name
- `status` (text, NOT NULL): Deployment status enum
  - Values: `'pending' | 'deploying' | 'running' | 'failed' | 'deleting'`
- `publicUrl` (text, nullable): Public URL for accessing the preview (e.g., `https://pr-123.preview.example.com`)
- `branch` (text, NOT NULL): PR branch name
- `imageTag` (text, nullable): Docker image tag deployed
- `errorMessage` (text, nullable): Error details if status is 'failed'
- `resourcesAllocated` (jsonb, nullable): K8s resource allocation
  ```json
  {
    "cpu": "500m",
    "memory": "512Mi",
    "pods": 1
  }
  ```
- `lastDeployedAt` (timestamp, nullable): Last successful deployment timestamp
- `createdAt` (timestamp, NOT NULL): Record creation time
- `updatedAt` (timestamp, NOT NULL): Last update time
- `deletedAt` (timestamp, nullable): Soft delete timestamp (for cleanup tracking)

**Constraints**:
- **Unique** constraint on `(pullRequestId, commitSha)` for idempotency
- **Foreign key** cascade delete on `pullRequestId` (deleting PR deletes pods)
- **Index** on `status` for filtering active deployments
- **Index** on `namespace` for K8s namespace lookups

**Relationships**:
- `pullRequest` (many-to-one): One PullRequestPod belongs to one PullRequest
- `pullRequest.repo` (through pullRequest): Access to repo/team for authorization

**Validation Rules**:
- `namespace` must match DNS-1123: lowercase alphanumeric + hyphens, ≤63 chars
- `status` must be one of defined enum values
- `commitSha` must be 40-character hex string (Git SHA-1)
- `publicUrl` must be valid HTTPS URL if present

---

### 2. PullRequest (EXISTING - Extended)

No schema changes needed, but new relationships added.

**New Relationship**:
- `pods` (one-to-many): One PullRequest can have many PullRequestPods (historical deployments)

---

### 3. DeploymentLog (NEW - Optional for Future)

**Note**: For MVP, logs are fetched directly from Kubernetes API. This table is for future log persistence/archival.

**Fields** (future consideration):
- `id` (text, PK): UUID
- `podId` (text, FK → pullRequestPods.id): Link to preview environment
- `containerName` (text, NOT NULL): K8s container name
- `logContent` (text, NOT NULL): Log output
- `timestamp` (timestamp, NOT NULL): Log entry time
- `createdAt` (timestamp, NOT NULL): Record creation time

**Decision**: **NOT implementing for MVP** - direct K8s API access is simpler and sufficient.

---

## State Transitions

### PullRequestPod Status Flow

```
[PR Opened/Sync] → pending
                       ↓
                  [Webhook processed]
                       ↓
                   deploying
                       ↓
            ┌──────────┴──────────┐
            ↓                     ↓
         running                failed
            ↓                     ↓
   [PR Closed/Merged]    [Manual retry]
            ↓                     ↓
        deleting ────────→    pending (retry)
            ↓
      (record deleted or soft-deleted)
```

**Transition Rules**:
1. **pending → deploying**: Webhook handler triggers deployment job
2. **deploying → running**: Kubernetes deployment succeeds, pods ready
3. **deploying → failed**: Deployment timeout or error (image pull failure, resource limits)
4. **running → deploying**: New commit pushed (PR synchronize event)
5. **running → deleting**: PR closed/merged
6. **failed → pending**: Manual retry or automatic retry (up to 3 attempts)
7. **deleting → deleted**: Namespace cleanup complete

---

## Database Schema (Drizzle ORM)

```typescript
import { pgTable, text, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pullRequests } from "./schema"; // Existing table

export const pullRequestPods = pgTable(
  "pull_request_pods",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pullRequestId: text("pull_request_id")
      .notNull()
      .references(() => pullRequests.id, { onDelete: "cascade" }),
    commitSha: text("commit_sha").notNull(),
    namespace: text("namespace").notNull(),
    deploymentName: text("deployment_name").notNull(),
    status: text("status").notNull().$type<'pending' | 'deploying' | 'running' | 'failed' | 'deleting'>(),
    publicUrl: text("public_url"),
    branch: text("branch").notNull(),
    imageTag: text("image_tag"),
    errorMessage: text("error_message"),
    resourcesAllocated: jsonb("resources_allocated").$type<{
      cpu: string;
      memory: string;
      pods: number;
    }>(),
    lastDeployedAt: timestamp("last_deployed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (table) => [
    unique("unique_pr_commit").on(table.pullRequestId, table.commitSha),
    index("idx_pod_status").on(table.status),
    index("idx_pod_namespace").on(table.namespace),
  ]
);

export const pullRequestPodsRelations = relations(pullRequestPods, ({ one }) => ({
  pullRequest: one(pullRequests, {
    fields: [pullRequestPods.pullRequestId],
    references: [pullRequests.id],
  }),
}));

// Extend existing pullRequestsRelations
export const pullRequestsRelations = relations(pullRequests, ({ one, many }) => ({
  repo: one(repos, {
    fields: [pullRequests.repoId],
    references: [repos.id],
  }),
  pods: many(pullRequestPods), // NEW
}));
```

---

## Type Definitions

```typescript
// src/types/preview-environments.ts

export type PodStatus = 'pending' | 'deploying' | 'running' | 'failed' | 'deleting';

export interface ResourceAllocation {
  cpu: string;      // e.g., "500m"
  memory: string;   // e.g., "512Mi"
  pods: number;     // Number of pod replicas
}

export interface DeploymentComment {
  url: string;
  status: PodStatus;
  timestamp: Date;
  errorMessage?: string;
  logs?: string;
}

export interface PreviewEnvironmentConfig {
  repoName: string;
  prNumber: number;
  branch: string;
  commitSha: string;
  imageTag: string;
  namespace: string;
  publicUrl: string;
}

// Drizzle ORM type inference
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pullRequestPods } from "@/db/schema";

export type SelectPullRequestPod = InferSelectModel<typeof pullRequestPods>;
export type InsertPullRequestPod = InferInsertModel<typeof pullRequestPods>;
```

---

## Data Access Patterns

### Create Preview Environment
```typescript
// src/models/preview-environments.ts
export async function createPreviewPod(
  data: InsertPullRequestPod
): Promise<SelectPullRequestPod> {
  const [pod] = await db
    .insert(pullRequestPods)
    .values(data)
    .returning();
  return pod;
}
```

### Update Deployment Status
```typescript
export async function updatePodStatus(
  podId: string,
  status: PodStatus,
  errorMessage?: string
): Promise<void> {
  await db
    .update(pullRequestPods)
    .set({
      status,
      errorMessage,
      updatedAt: new Date(),
      lastDeployedAt: status === 'running' ? new Date() : undefined,
    })
    .where(eq(pullRequestPods.id, podId));
}
```

### Get Active Preview Environments (for team)
```typescript
export async function getActivePreviewPods(
  teamId: string
): Promise<Array<SelectPullRequestPod & { pullRequest: SelectPullRequest }>> {
  return db
    .select()
    .from(pullRequestPods)
    .innerJoin(pullRequests, eq(pullRequestPods.pullRequestId, pullRequests.id))
    .innerJoin(repos, eq(pullRequests.repoId, repos.id))
    .where(
      and(
        eq(repos.teamId, teamId),
        inArray(pullRequestPods.status, ['deploying', 'running'])
      )
    );
}
```

### Cleanup Stale Deployments (cron job)
```typescript
export async function getStaleDeployments(
  daysOld: number = 7
): Promise<SelectPullRequestPod[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return db
    .select()
    .from(pullRequestPods)
    .where(
      and(
        eq(pullRequestPods.status, 'running'),
        lt(pullRequestPods.updatedAt, cutoffDate)
      )
    );
}
```

---

## Migration Plan

1. **Create new table**: `pull_request_pods` with all fields
2. **Add relationships**: Extend `pullRequestsRelations` to include `pods` array
3. **Create indexes**: On `status` and `namespace` for query performance
4. **Seed data** (optional): Create test preview pods for existing PRs in development

**Migration File** (generated by Drizzle):
```bash
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migration to database
```

---

## Validation Examples

### Namespace Name Validation
```typescript
import { z } from "zod";

export const namespaceSchema = z
  .string()
  .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, "Invalid DNS-1123 format")
  .max(63, "Namespace name must be ≤63 characters");
```

### Pod Status Validation
```typescript
export const podStatusSchema = z.enum(['pending', 'deploying', 'running', 'failed', 'deleting']);
```

### Commit SHA Validation
```typescript
export const commitShaSchema = z
  .string()
  .regex(/^[a-f0-9]{40}$/, "Invalid Git SHA-1 format");
```

---

## Summary

- **New Table**: `pullRequestPods` tracks all preview environment deployments
- **Idempotency**: Unique constraint on `(pullRequestId, commitSha)` prevents duplicate deployments
- **State Management**: Clear status flow with validation rules
- **Relationships**: Links to existing `pullRequests` and `repos` for authorization
- **Indexes**: Optimized for status filtering and namespace lookups
- **Type Safety**: Full TypeScript types with Drizzle ORM inference

**Alignment with Constitution**:
- ✅ **Principle 4 (Security)**: Database-level RBAC via team filtering
- ✅ **Principle 6 (Layered Architecture)**: Clear separation between DB schema, models, and actions
- ✅ **Principle 5 (Test-Driven)**: Testable with factories (e.g., `PullRequestPodFactory`)

# Actions Layer API Contract

**Feature**: PR Preview Environments
**Layer**: Actions (React Server Components boundary)
**File**: `src/actions/preview-environments.ts`

## Overview

The Actions layer provides the boundary between React components and backend logic for preview environment management. All functions are React Server Actions (marked with `"use server"`).

---

## Type Exports

All types are re-exported from the Database and Models layers for React component consumption.

```typescript
export type {
  SelectPullRequestPod,
  InsertPullRequestPod,
  PodStatus,
  ResourceAllocation,
  PreviewEnvironmentConfig,
} from "@/db/schema";
```

---

## Functions

### 1. `getPreviewEnvironments`

Fetch all active preview environments for the current user's accessible repos.

**Signature**:
```typescript
export async function getPreviewEnvironments(): Promise<{
  success: boolean;
  data?: Array<SelectPullRequestPod & { pullRequest: SelectPullRequest; repo: SelectRepo }>;
  error?: string;
}>;
```

**Authorization**:
- Fetches user session via `getServerSession()`
- Filters by repos accessible to user's teams
- Returns only environments user is authorized to view

**Returns**:
- `success: true`: Array of preview environments with related PR and repo data
- `success: false`: Error message if unauthorized or query fails

**Example Usage**:
```typescript
// src/app/(dashboard)/preview-environments/page.tsx
import { getPreviewEnvironments } from "@/actions/preview-environments";

export default async function PreviewEnvironmentsPage() {
  const { data: environments, error } = await getPreviewEnvironments();

  if (error) return <ErrorDisplay message={error} />;

  return <EnvironmentList environments={environments} />;
}
```

---

### 2. `getPreviewEnvironment`

Fetch a single preview environment by ID with full details.

**Signature**:
```typescript
export async function getPreviewEnvironment(podId: string): Promise<{
  success: boolean;
  data?: SelectPullRequestPod & { pullRequest: SelectPullRequest; repo: SelectRepo };
  error?: string;
}>;
```

**Authorization**:
- Validates user session
- Checks user has access to the repo via team membership
- Returns 404 if pod doesn't exist or user lacks access

**Returns**:
- `success: true`: Full preview environment details
- `success: false`: Error message if not found or unauthorized

**Example Usage**:
```typescript
// src/app/(dashboard)/preview-environments/[id]/page.tsx
import { getPreviewEnvironment } from "@/actions/preview-environments";

export default async function PreviewEnvironmentDetailPage({ params }: { params: { id: string } }) {
  const { data: environment, error } = await getPreviewEnvironment(params.id);

  if (error) return <NotFound />;

  return <EnvironmentDetail environment={environment} />;
}
```

---

### 3. `getPodLogs`

Fetch container logs for a preview environment pod.

**Signature**:
```typescript
export async function getPodLogs(
  podId: string,
  options?: {
    tailLines?: number;
    timestamps?: boolean;
  }
): Promise<{
  success: boolean;
  data?: string; // Log content
  error?: string;
}>;
```

**Authorization**:
- Validates user session
- Checks user has access to the pod's repo
- Returns error if unauthorized

**Behavior**:
- Fetches logs from Kubernetes API (not database)
- Defaults to last 500 lines if `tailLines` not specified
- Includes timestamps if `timestamps: true`

**Returns**:
- `success: true`: Log content as string
- `success: false`: Error message if pod not found, not running, or unauthorized

**Example Usage**:
```typescript
// src/app/(dashboard)/preview-environments/[id]/logs/page.tsx
import { getPodLogs } from "@/actions/preview-environments";

export default async function LogsPage({ params }: { params: { id: string } }) {
  const { data: logs, error } = await getPodLogs(params.id, { tailLines: 1000, timestamps: true });

  if (error) return <ErrorDisplay message={error} />;

  return <LogViewer logs={logs} />;
}
```

---

### 4. `retryDeployment`

Manually retry a failed deployment.

**Signature**:
```typescript
export async function retryDeployment(podId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}>;
```

**Authorization**:
- Validates user session
- Checks user has access to the pod's repo
- Requires pod status to be `'failed'`

**Behavior**:
- Resets pod status to `'pending'`
- Triggers deployment job in background
- Returns immediately (deployment happens asynchronously)

**Returns**:
- `success: true`: Deployment retry initiated
- `success: false`: Error message if pod not failed or unauthorized

**Example Usage**:
```typescript
// src/app/(dashboard)/preview-environments/[id]/page.tsx
"use client";

import { retryDeployment } from "@/actions/preview-environments";
import { useRouter } from "next/navigation";

export function RetryButton({ podId }: { podId: string }) {
  const router = useRouter();

  async function handleRetry() {
    const result = await retryDeployment(podId);
    if (result.success) {
      router.refresh(); // Reload page to show new status
    } else {
      alert(result.error);
    }
  }

  return <button onClick={handleRetry}>Retry Deployment</button>;
}
```

---

### 5. `deletePreviewEnvironment`

Manually delete a preview environment (admin/owner only).

**Signature**:
```typescript
export async function deletePreviewEnvironment(podId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}>;
```

**Authorization**:
- Validates user session
- Checks user is repo owner or admin
- Returns error if unauthorized

**Behavior**:
- Updates pod status to `'deleting'`
- Triggers Kubernetes namespace deletion (background job)
- Removes database record after namespace cleanup confirms

**Returns**:
- `success: true`: Deletion initiated
- `success: false`: Error message if unauthorized or deletion fails

**Example Usage**:
```typescript
// src/app/(dashboard)/preview-environments/[id]/page.tsx
"use client";

import { deletePreviewEnvironment } from "@/actions/preview-environments";
import { useRouter } from "next/navigation";

export function DeleteButton({ podId }: { podId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure? This will permanently delete the preview environment.")) return;

    const result = await deletePreviewEnvironment(podId);
    if (result.success) {
      router.push("/preview-environments");
    } else {
      alert(result.error);
    }
  }

  return <button onClick={handleDelete} className="btn-danger">Delete</button>;
}
```

---

## Error Handling

All action functions follow this error response pattern:

```typescript
type ActionResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

**Common Error Messages**:
- `"Unauthorized"`: User not authenticated or lacks permissions
- `"Preview environment not found"`: Pod ID doesn't exist or user can't access
- `"Pod is not in failed state"`: Attempted retry on non-failed pod
- `"Failed to fetch logs: Pod not running"`: Logs unavailable (pod pending/failed)
- `"Deployment in progress"`: Cannot delete while deploying

---

## Authorization Pattern

All actions follow this pattern:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function exampleAction() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Delegate to Models layer with user context
  const result = await modelFunction(session.user.id);

  return result;
}
```

---

## Summary

- **5 Server Actions** for React components to consume
- **Consistent error handling** with `{ success, data?, error? }` pattern
- **Authorization at boundary**: All actions validate session and permissions
- **No direct database access**: Delegates to Models layer
- **Type safety**: Re-exports types from Database/Models layers

**Next**: See `models-api.md` for the Models layer contract.

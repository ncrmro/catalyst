# Models Layer API Contract

**Feature**: PR Preview Environments
**Layer**: Models (Business Logic)
**File**: `src/models/preview-environments.ts`

## Overview

The Models layer contains all business logic and complex database operations for preview environment management. It orchestrates Kubernetes deployments, GitHub API calls, and database updates.

---

## Core Functions

### 1. `createPreviewDeployment`

Create a new preview environment deployment for a pull request.

**Signature**:
```typescript
export async function createPreviewDeployment(
  pullRequestId: string,
  commitSha: string,
  branch: string,
  userId: string
): Promise<{ success: boolean; pod?: SelectPullRequestPod; error?: string }>;
```

**Business Logic**:
1. Fetch PR details (repo, team, project config)
2. Validate user has access to repo (team membership check)
3. Generate Kubernetes namespace name
4. Check if deployment for this commit already exists (idempotency)
5. Create `pullRequestPods` record with status `'pending'`
6. Trigger Helm deployment (background job or sync)
7. Update pod status to `'deploying'`

**Returns**:
- `success: true`: Pod record created, deployment initiated
- `success: false`: Error message if validation fails or deployment fails

**Database Operations**:
- `INSERT INTO pull_request_pods` with unique constraint check
- `SELECT` from `pull_requests`, `repos`, `projects` for config
- `UPDATE pull_request_pods` on status changes

**External API Calls**:
- Kubernetes API: Create namespace, apply Helm chart
- GitHub API: Post initial comment to PR

**Example**:
```typescript
const result = await createPreviewDeployment(
  "pr-uuid-123",
  "abc123def456...",
  "feature/new-ui",
  "user-uuid-789"
);

if (result.success) {
  console.log(`Deployment started: ${result.pod.namespace}`);
}
```

---

### 2. `watchDeploymentStatus`

Monitor Kubernetes deployment until it reaches a terminal state.

**Signature**:
```typescript
export async function watchDeploymentStatus(
  podId: string,
  timeoutMs?: number
): Promise<{ success: boolean; status: PodStatus; error?: string }>;
```

**Business Logic**:
1. Fetch pod record from database
2. Use Kubernetes Watch API to monitor deployment status
3. Update database on status changes: `'deploying'` → `'running'` or `'failed'`
4. Post GitHub PR comment with final status
5. Handle timeout (default 3 minutes)

**Returns**:
- `success: true`: Final status (`'running'` or `'failed'`)
- `success: false`: Timeout or watch error

**Database Operations**:
- `SELECT` from `pull_request_pods`
- `UPDATE pull_request_pods` on status change
- `UPDATE` timestamps (`lastDeployedAt` if successful)

**External API Calls**:
- Kubernetes Watch API: Monitor deployment status
- GitHub API: Update PR comment with deployment URL or error

**Example**:
```typescript
// Background job or webhook handler
const result = await watchDeploymentStatus("pod-uuid-123", 180000); // 3 min timeout

if (result.status === 'running') {
  console.log("Deployment successful!");
} else {
  console.error("Deployment failed:", result.error);
}
```

---

### 3. `getPreviewPodLogs`

Fetch container logs from Kubernetes for a preview environment.

**Signature**:
```typescript
export async function getPreviewPodLogs(
  podId: string,
  userId: string,
  options?: {
    tailLines?: number;
    timestamps?: boolean;
  }
): Promise<{ success: boolean; logs?: string; error?: string }>;
```

**Business Logic**:
1. Fetch pod record with related repo/team
2. Validate user has access (team membership)
3. Call Kubernetes API to fetch logs
4. Return log content

**Returns**:
- `success: true`: Log content as string
- `success: false`: Error if pod not running, unauthorized, or K8s error

**Database Operations**:
- `SELECT` from `pull_request_pods` with joins to `pull_requests`, `repos`, `teams`

**External API Calls**:
- Kubernetes API: `readNamespacedPodLog()`

**Example**:
```typescript
const result = await getPreviewPodLogs(
  "pod-uuid-123",
  "user-uuid-789",
  { tailLines: 500, timestamps: true }
);

if (result.success) {
  console.log(result.logs);
}
```

---

### 4. `deletePreviewDeployment`

Delete a preview environment and clean up Kubernetes resources.

**Signature**:
```typescript
export async function deletePreviewDeployment(
  podId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }>;
```

**Business Logic**:
1. Fetch pod record with related repo/team
2. Validate user is authorized (repo owner or admin)
3. Update pod status to `'deleting'`
4. Call Kubernetes API to delete namespace (cascading delete)
5. Wait for namespace deletion confirmation
6. Remove pod record from database
7. Post final GitHub comment on PR

**Returns**:
- `success: true`: Cleanup complete
- `success: false`: Error if unauthorized or deletion fails

**Database Operations**:
- `SELECT` from `pull_request_pods` with joins
- `UPDATE pull_request_pods` set status to `'deleting'`
- `DELETE` from `pull_request_pods` after namespace cleanup

**External API Calls**:
- Kubernetes API: `deleteNamespace()` with foreground propagation
- GitHub API: Post cleanup comment to PR

**Example**:
```typescript
const result = await deletePreviewDeployment("pod-uuid-123", "user-uuid-789");

if (result.success) {
  console.log("Preview environment deleted");
}
```

---

### 5. `listActivePreviewPods`

List all active preview environments for a user's accessible repos.

**Signature**:
```typescript
export async function listActivePreviewPods(
  userId: string
): Promise<{
  success: boolean;
  pods?: Array<SelectPullRequestPod & { pullRequest: SelectPullRequest; repo: SelectRepo }>;
  error?: string;
}>;
```

**Business Logic**:
1. Fetch user's team memberships
2. Query all preview pods for repos in those teams
3. Filter by active statuses: `'deploying'`, `'running'`
4. Return with related PR and repo data

**Returns**:
- `success: true`: Array of active pods
- `success: false`: Error if query fails

**Database Operations**:
- `SELECT` with joins: `pull_request_pods` → `pull_requests` → `repos` → `teams` → `teams_memberships`
- Filter: `status IN ('deploying', 'running')` AND `user_id = userId`

**Example**:
```typescript
const result = await listActivePreviewPods("user-uuid-789");

if (result.success) {
  console.log(`Found ${result.pods.length} active preview environments`);
}
```

---

### 6. `retryFailedDeployment`

Retry a failed preview deployment.

**Signature**:
```typescript
export async function retryFailedDeployment(
  podId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }>;
```

**Business Logic**:
1. Fetch pod record
2. Validate user has access and pod status is `'failed'`
3. Reset status to `'pending'`
4. Clear error message
5. Trigger deployment job (re-run Helm deployment)

**Returns**:
- `success: true`: Retry initiated
- `success: false`: Error if not failed or unauthorized

**Database Operations**:
- `SELECT` from `pull_request_pods`
- `UPDATE pull_request_pods` set status to `'pending'`, clear error

**External API Calls**:
- Kubernetes API: Re-apply Helm chart

**Example**:
```typescript
const result = await retryFailedDeployment("pod-uuid-123", "user-uuid-789");

if (result.success) {
  console.log("Deployment retry started");
}
```

---

## Helper Functions

### `generateNamespace`

Generate DNS-safe Kubernetes namespace name.

**Signature**:
```typescript
export function generateNamespace(repoName: string, prNumber: number): string;
```

**Example**:
```typescript
const namespace = generateNamespace("owner/my-app", 42);
// Returns: "pr-my-app-42"
```

---

### `generatePublicUrl`

Generate public URL for preview environment.

**Signature**:
```typescript
export function generatePublicUrl(namespace: string, domain: string): string;
```

**Example**:
```typescript
const url = generatePublicUrl("pr-my-app-42", "preview.example.com");
// Returns: "https://pr-my-app-42.preview.example.com"
```

---

### `upsertGitHubComment`

Post or update deployment comment on GitHub PR.

**Signature**:
```typescript
export async function upsertGitHubComment(
  owner: string,
  repo: string,
  prNumber: number,
  status: PodStatus,
  publicUrl?: string,
  errorMessage?: string
): Promise<void>;
```

**Example**:
```typescript
await upsertGitHubComment(
  "myorg",
  "myrepo",
  42,
  "running",
  "https://pr-42.preview.example.com"
);
```

---

## Kubernetes Integration Functions

### `deployHelmChart`

Deploy Helm chart to Kubernetes namespace.

**Signature**:
```typescript
export async function deployHelmChart(
  namespace: string,
  config: PreviewEnvironmentConfig
): Promise<{ success: boolean; error?: string }>;
```

**Implementation**:
Uses `@kubernetes/client-node` to apply Helm chart with dynamic values.

**Example**:
```typescript
const result = await deployHelmChart("pr-my-app-42", {
  repoName: "my-app",
  prNumber: 42,
  branch: "feature/new-ui",
  commitSha: "abc123",
  imageTag: "pr-42",
  namespace: "pr-my-app-42",
  publicUrl: "https://pr-42.preview.example.com",
});
```

---

### `deleteKubernetesNamespace`

Delete Kubernetes namespace with cascading delete.

**Signature**:
```typescript
export async function deleteKubernetesNamespace(
  namespace: string,
  timeoutMs?: number
): Promise<{ success: boolean; error?: string }>;
```

**Implementation**:
Uses foreground cascading delete, waits for namespace deletion confirmation.

**Example**:
```typescript
const result = await deleteKubernetesNamespace("pr-my-app-42", 120000); // 2 min timeout
```

---

## Transaction Patterns

All database mutations use transactions to ensure atomicity:

```typescript
import { db } from "@/lib/db";

export async function createPreviewDeployment(...) {
  return db.transaction(async (tx) => {
    // 1. Insert pod record
    const [pod] = await tx.insert(pullRequestPods).values(...).returning();

    // 2. Call Kubernetes API (external)
    const deployResult = await deployHelmChart(...);

    if (!deployResult.success) {
      // Transaction will rollback
      throw new Error(deployResult.error);
    }

    // 3. Update status
    await tx.update(pullRequestPods).set({ status: 'deploying' }).where(...);

    return { success: true, pod };
  });
}
```

---

## Error Handling

All functions return structured results:

```typescript
type ModelResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

**Common Errors**:
- `"Unauthorized: User not in team"`: User lacks access to repo
- `"Deployment already exists for this commit"`: Idempotency check failed
- `"Kubernetes API error: ..."`: K8s operation failed
- `"Timeout waiting for deployment"`: Deployment took >3 minutes
- `"Pod not in failed state"`: Cannot retry non-failed pod

---

## Testing Strategy

Models functions are unit tested with:
- **Mocked Kubernetes API**: Using jest mocks for `@kubernetes/client-node`
- **Mocked GitHub API**: Using jest mocks for `@octokit/rest`
- **Test database**: In-memory Postgres or test database
- **Factories**: Using `fishery` for test data generation

**Example Test**:
```typescript
// __tests__/unit/models/preview-environments.test.ts
import { createPreviewDeployment } from "@/models/preview-environments";
import { PullRequestFactory, PullRequestPodFactory } from "@/__tests__/factories";
import * as k8s from "@/lib/k8s-client";

jest.mock("@/lib/k8s-client");

describe("createPreviewDeployment", () => {
  it("creates pod record and triggers deployment", async () => {
    const pr = await PullRequestFactory.create();
    const mockK8sDeploy = jest.spyOn(k8s, "deployHelmChart").mockResolvedValue({ success: true });

    const result = await createPreviewDeployment(pr.id, "abc123", "main", "user-123");

    expect(result.success).toBe(true);
    expect(result.pod.status).toBe("deploying");
    expect(mockK8sDeploy).toHaveBeenCalled();
  });
});
```

---

## Summary

- **6 core functions** for deployment lifecycle management
- **3 helper functions** for namespace/URL generation
- **2 Kubernetes integration functions** for low-level operations
- **Transaction support** for atomicity
- **Structured error handling** with typed results
- **Full test coverage** with mocked external APIs

**Next**: See `webhook-api.md` for GitHub webhook handling contract.

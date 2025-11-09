# Research: PR Preview Environment Deployment Patterns

**Date**: 2025-01-08
**Feature**: PR Preview Environment Deployment
**Status**: Phase 0 Research Complete

## 1. Kubernetes Namespace Naming

### Decision
Use sanitized naming pattern: `pr-{sanitized-repo-name}-{pr-number}` with strict DNS compliance.

### Rationale
- Kubernetes namespace names must be DNS-1123 compliant: lowercase alphanumeric + hyphens, max 63 characters
- Including PR number ensures uniqueness and easy identification
- Sanitizing repo name prevents issues with special characters in GitHub repo names

### Implementation Pattern
```typescript
function generatePreviewNamespace(repoName: string, prNumber: number): string {
  // Remove owner prefix if present (e.g., "owner/repo" → "repo")
  const shortRepoName = repoName.split('/').pop() || repoName;

  // Sanitize: lowercase, replace non-alphanumeric with hyphens
  const sanitized = shortRepoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens

  const namespace = `pr-${sanitized}-${prNumber}`;

  // Enforce 63 character limit
  return namespace.length > 63 ? namespace.substring(0, 63).replace(/-$/, '') : namespace;
}
```

### Alternatives Considered
- **Hash-based naming** (`pr-abc123def`): Rejected - loses human readability
- **UUID-based naming**: Rejected - no semantic meaning, harder to debug
- **Include branch name**: Rejected - branch names can be very long and contain problematic characters

---

## 2. Helm Chart Deployment Patterns

### Decision
Use dynamic value overrides via `--set` flags and a base `values.yaml` template for preview environments.

### Rationale
- Helm supports runtime value injection without modifying chart files
- Preview environments need different values than production (resource limits, ingress rules)
- Base template ensures consistency while allowing per-PR customization

### Implementation Pattern
```typescript
interface PreviewDeploymentConfig {
  repoName: string;
  prNumber: number;
  branch: string;
  imageTag: string;
  publicUrl: string;
}

function generateHelmValues(config: PreviewDeploymentConfig): string[] {
  return [
    `--set`, `image.tag=${config.imageTag}`,
    `--set`, `ingress.enabled=true`,
    `--set`, `ingress.hosts[0].host=${config.publicUrl}`,
    `--set`, `resources.limits.cpu=500m`,
    `--set`, `resources.limits.memory=512Mi`,
    `--set`, `replicaCount=1`, // Single replica for previews
    `--set`, `environment=preview`,
    `--set`, `pullRequest.number=${config.prNumber}`,
    `--set`, `pullRequest.branch=${config.branch}`,
  ];
}
```

### Values File Structure
```yaml
# values-preview.yaml (base template for all preview environments)
replicaCount: 1

image:
  repository: registry.example.com/app
  pullPolicy: Always
  tag: "latest" # Overridden at deploy time

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  tls:
    - secretName: preview-tls
      hosts: [] # Set dynamically

environment: preview
autoScaling:
  enabled: false # Disable for previews
```

### Alternatives Considered
- **Templatized YAML generation**: Rejected - reinvents Helm's wheel, harder to maintain
- **Kustomize overlays**: Rejected - Helm already in use, adds complexity
- **Single values file with conditionals**: Rejected - less flexible for dynamic values

---

## 3. GitHub PR Comment Management

### Decision
Use **upsert pattern**: Search for existing deployment comment, update if found, create if not.

### Rationale
- Prevents comment spam on every deployment update
- Single source of truth for deployment status
- GitHub API supports comment editing via PATCH

### Implementation Pattern
```typescript
interface DeploymentComment {
  url: string;
  status: 'pending' | 'deploying' | 'success' | 'failed';
  timestamp: Date;
  logs?: string;
}

async function upsertDeploymentComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  comment: DeploymentComment
): Promise<void> {
  const commentMarker = '<!-- catalyst-preview-deployment -->';
  const body = formatDeploymentComment(comment, commentMarker);

  // Find existing comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const existingComment = comments.find(c => c.body?.includes(commentMarker));

  if (existingComment) {
    // Update existing
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    });
  } else {
    // Create new
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }
}

function formatDeploymentComment(comment: DeploymentComment, marker: string): string {
  const statusEmoji = {
    pending: '⏳',
    deploying: '🚀',
    success: '✅',
    failed: '❌',
  };

  return `${marker}
## Preview Environment Deployment ${statusEmoji[comment.status]}

**Status**: ${comment.status}
${comment.status === 'success' ? `**URL**: ${comment.url}` : ''}
**Last Updated**: ${comment.timestamp.toISOString()}

${comment.status === 'failed' && comment.logs ? `
### Error Logs
\`\`\`
${comment.logs}
\`\`\`
` : ''}
`;
}
```

### Alternatives Considered
- **GitHub Deployments API**: Rejected - more complex, overkill for this use case
- **Create new comment each time**: Rejected - clutters PR discussion
- **GitHub Checks API**: Considered but complementary, not replacement for user-facing comment

---

## 4. Kubernetes Deployment Status Polling

### Decision
Use **watch API with timeout** for real-time status, fallback to periodic polling for long-running deployments.

### Rationale
- Watch API provides immediate feedback on status changes
- Avoids excessive API calls from constant polling
- Timeout prevents infinite waits on stuck deployments

### Implementation Pattern
```typescript
import { Watch } from '@kubernetes/client-node';

async function waitForDeploymentReady(
  k8sApi: any,
  namespace: string,
  deploymentName: string,
  timeoutMs: number = 180000 // 3 minutes
): Promise<'success' | 'failed'> {
  const startTime = Date.now();
  const watch = new Watch(k8sApi.config);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      watch.abort();
      reject(new Error('Deployment timeout exceeded'));
    }, timeoutMs);

    watch.watch(
      `/apis/apps/v1/namespaces/${namespace}/deployments`,
      {},
      (type, deployment) => {
        if (deployment.metadata.name !== deploymentName) return;

        const status = deployment.status;
        const ready = status?.readyReplicas === status?.replicas && status?.replicas > 0;

        if (ready) {
          clearTimeout(timeout);
          watch.abort();
          resolve('success');
        }

        // Check for failed conditions
        const failedCondition = status?.conditions?.find(
          (c: any) => c.type === 'Progressing' && c.status === 'False'
        );

        if (failedCondition) {
          clearTimeout(timeout);
          watch.abort();
          resolve('failed');
        }
      },
      (err) => {
        clearTimeout(timeout);
        if (err) reject(err);
      }
    );
  });
}
```

### Alternatives Considered
- **Polling-only approach**: Rejected - higher API load, slower feedback
- **Event-based with Kubernetes events**: Rejected - events are not guaranteed to be delivered
- **CRD status field**: Rejected - no custom resources for this feature

---

## 5. Container Log Streaming

### Decision
Use **paginated log retrieval** with tail limit for UI display, full logs accessible via download.

### Rationale
- Kubernetes API supports log streaming but can overwhelm browser/network
- Most debugging needs last N lines, not full logs
- Pagination allows incremental loading for large logs

### Implementation Pattern
```typescript
interface LogOptions {
  tailLines?: number;
  follow?: boolean;
  timestamps?: boolean;
}

async function getPodLogs(
  k8sApi: any,
  namespace: string,
  podName: string,
  containerName: string,
  options: LogOptions = {}
): Promise<string> {
  try {
    const response = await k8sApi.readNamespacedPodLog(
      podName,
      namespace,
      containerName,
      undefined, // follow
      undefined, // insecureSkipTLSVerifyBackend
      undefined, // limitBytes
      undefined, // pretty
      undefined, // previous
      undefined, // sinceSeconds
      options.tailLines || 500, // Default to last 500 lines
      options.timestamps || false
    );

    return response.body;
  } catch (error) {
    if (error.statusCode === 404) {
      return 'Pod not found or not yet running';
    }
    throw error;
  }
}

// For real-time streaming (WebSocket or Server-Sent Events)
async function streamPodLogs(
  k8sApi: any,
  namespace: string,
  podName: string,
  containerName: string,
  onLog: (line: string) => void
): Promise<void> {
  const stream = await k8sApi.readNamespacedPodLog(
    podName,
    namespace,
    containerName,
    true, // follow
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    100, // tail
    true // timestamps
  );

  stream.on('data', (chunk: Buffer) => {
    const lines = chunk.toString().split('\n');
    lines.forEach(line => line && onLog(line));
  });

  stream.on('error', (err: Error) => {
    console.error('Log stream error:', err);
  });
}
```

### Alternatives Considered
- **Full log dump on every request**: Rejected - performance issues for large logs
- **External log aggregation (ELK/Loki)**: Rejected - adds infrastructure complexity, out of scope for MVP
- **Log file storage in DB**: Rejected - database not optimized for large text storage

---

## 6. Preview Environment Cleanup

### Decision
Use **cascading namespace deletion** with finalizer checks and retry logic.

### Rationale
- Deleting namespace automatically cleans all resources (pods, services, ingress)
- Finalizers ensure dependent resources are cleaned before namespace removal
- Retry logic handles transient failures (e.g., API server unavailable)

### Implementation Pattern
```typescript
async function deletePreviewEnvironment(
  k8sApi: any,
  namespace: string,
  maxRetries: number = 3
): Promise<void> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Delete namespace (cascading delete)
      await k8sApi.deleteNamespace(namespace, {
        propagationPolicy: 'Foreground', // Wait for all resources to be deleted
        gracePeriodSeconds: 30,
      });

      // Wait for namespace to be fully deleted
      await waitForNamespaceDeletion(k8sApi, namespace, 120000); // 2 min timeout
      return;

    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(`Failed to delete namespace ${namespace} after ${maxRetries} attempts: ${error}`);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }
}

async function waitForNamespaceDeletion(
  k8sApi: any,
  namespace: string,
  timeoutMs: number
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      await k8sApi.readNamespace(namespace);
      // Still exists, wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      if (error.statusCode === 404) {
        // Namespace deleted successfully
        return;
      }
      throw error;
    }
  }

  throw new Error(`Namespace ${namespace} deletion timeout`);
}
```

### Alternatives Considered
- **Manual resource deletion**: Rejected - error-prone, misses resources created outside Helm
- **Leave orphaned namespaces**: Rejected - resource waste, cluster clutter
- **Background cleanup job**: Considered for future optimization, not needed for MVP

---

## 7. Webhook Idempotency

### Decision
Use **database unique constraints** + **last processed commit SHA** to ensure idempotent processing.

### Rationale
- GitHub can send duplicate webhook events (network retries, manual redelivery)
- Database constraints prevent duplicate records at persistence layer
- Tracking commit SHA prevents redundant deployments for same code

### Implementation Pattern
```typescript
interface PullRequestEvent {
  action: 'opened' | 'synchronize' | 'closed' | 'reopened';
  pullRequest: {
    id: number;
    number: number;
    head: {
      sha: string;
      ref: string;
    };
  };
  repository: {
    id: number;
    full_name: string;
  };
}

async function handlePullRequestWebhook(event: PullRequestEvent): Promise<void> {
  const { action, pullRequest, repository } = event;

  // Check if we already processed this exact commit
  const existingPod = await db
    .select()
    .from(pullRequestPods)
    .where(
      and(
        eq(pullRequestPods.pullRequestId, pullRequest.id),
        eq(pullRequestPods.commitSha, pullRequest.head.sha)
      )
    )
    .limit(1);

  if (existingPod.length > 0 && action === 'synchronize') {
    // Already processed this commit, skip
    console.log(`Skipping duplicate webhook for PR ${pullRequest.number}, SHA ${pullRequest.head.sha}`);
    return;
  }

  // Use database transaction for atomic upsert
  await db.transaction(async (tx) => {
    if (action === 'closed') {
      await deletePreviewEnvironment(pullRequest.number);
      await tx.delete(pullRequestPods).where(eq(pullRequestPods.pullRequestId, pullRequest.id));
    } else {
      await tx
        .insert(pullRequestPods)
        .values({
          pullRequestId: pullRequest.id,
          commitSha: pullRequest.head.sha,
          branch: pullRequest.head.ref,
          status: 'pending',
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [pullRequestPods.pullRequestId],
          set: {
            commitSha: pullRequest.head.sha,
            branch: pullRequest.head.ref,
            status: 'pending',
            updatedAt: new Date(),
          },
        });

      // Trigger deployment (background job)
      await deployPreviewEnvironment(pullRequest, repository);
    }
  });
}
```

### Database Schema for Idempotency
```typescript
// Unique constraint on (pullRequestId, commitSha) prevents duplicate deployments
export const pullRequestPods = pgTable(
  "pull_request_pods",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pullRequestId: text("pull_request_id").notNull().references(() => pullRequests.id),
    commitSha: text("commit_sha").notNull(),
    namespace: text("namespace").notNull(),
    status: text("status").notNull(), // 'pending', 'deploying', 'running', 'failed'
    publicUrl: text("public_url"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.pullRequestId, table.commitSha), // Idempotency constraint
  ]
);
```

### Alternatives Considered
- **Redis-based deduplication**: Rejected - adds infrastructure dependency, DB constraint is simpler
- **Webhook signature validation only**: Rejected - doesn't prevent duplicate processing of valid events
- **Ignore duplicates entirely**: Rejected - can lead to orphaned resources and inconsistent state

---

## Summary

All research topics have been addressed with production-ready patterns that align with:
- **Principle 3 (Deployment Portability)**: Standard Kubernetes APIs, no vendor lock-in
- **Principle 4 (Security by Default)**: Database constraints prevent race conditions
- **Principle 5 (Test-Driven Quality)**: Patterns are testable with mocked Kubernetes API
- **Principle 6 (Layered Architecture)**: Clear separation between webhook handling, business logic, and K8s operations

**Next Steps**: Proceed to Phase 1 (Data Model & Contracts generation).

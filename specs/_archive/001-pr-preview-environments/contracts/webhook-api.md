# GitHub Webhook API Contract

**Feature**: PR Preview Environments
**Layer**: Webhook Handler (API Route)
**File**: `src/app/api/github/webhook/route.ts` (EXTEND existing)

## Overview

The GitHub webhook handler processes pull request events and triggers preview environment deployments. This contract extends the existing webhook route to handle PR-specific events.

---

## Webhook Event Types

### Supported Events

**Event**: `pull_request`
**Actions**:
- `opened`: New PR created → Create preview environment
- `synchronize`: New commits pushed → Redeploy preview environment
- `reopened`: Closed PR reopened → Recreate preview environment
- `closed`: PR closed/merged → Delete preview environment

---

## Handler Function (Extend Existing)

### `POST /api/github/webhook`

**Existing Handler**:
```typescript
// src/app/api/github/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@octokit/webhooks";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-hub-signature-256");
  const body = await req.text();

  // Verify webhook signature (existing)
  const webhooks = new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  });

  if (!webhooks.verify(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const event = req.headers.get("x-github-event");

  // Route to event handlers
  switch (event) {
    case "pull_request":
      await handlePullRequestEvent(payload); // NEW
      break;
    // ... other event handlers
  }

  return NextResponse.json({ received: true });
}
```

---

## New Handler: `handlePullRequestEvent`

**Signature**:
```typescript
async function handlePullRequestEvent(payload: PullRequestWebhookPayload): Promise<void>;
```

**Payload Type**:
```typescript
interface PullRequestWebhookPayload {
  action: "opened" | "synchronize" | "reopened" | "closed" | "edited" | "assigned" | ...;
  pull_request: {
    id: number;
    number: number;
    title: string;
    state: "open" | "closed";
    merged: boolean;
    head: {
      sha: string;
      ref: string; // branch name
    };
    base: {
      ref: string;
    };
    html_url: string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
    id: number;
  };
}
```

---

## Business Logic Flow

### Action: `opened` or `reopened`

1. **Fetch or Create PR Record**:
   ```typescript
   const pr = await db
     .select()
     .from(pullRequests)
     .where(eq(pullRequests.providerPrId, payload.pull_request.id.toString()))
     .limit(1);

   if (!pr) {
     // Create PR record if doesn't exist
     await db.insert(pullRequests).values({
       repoId: repoRecord.id,
       provider: "github",
       providerPrId: payload.pull_request.id.toString(),
       number: payload.pull_request.number,
       title: payload.pull_request.title,
       state: "open",
       status: "ready",
       url: payload.pull_request.html_url,
       authorLogin: payload.sender.login,
       headBranch: payload.pull_request.head.ref,
       baseBranch: payload.pull_request.base.ref,
     });
   }
   ```

2. **Check for Existing Deployment (Idempotency)**:
   ```typescript
   const existingPod = await db
     .select()
     .from(pullRequestPods)
     .where(
       and(
         eq(pullRequestPods.pullRequestId, pr.id),
         eq(pullRequestPods.commitSha, payload.pull_request.head.sha)
       )
     )
     .limit(1);

   if (existingPod) {
     console.log("Deployment already exists for commit", payload.pull_request.head.sha);
     return; // Skip duplicate deployment
   }
   ```

3. **Create Preview Deployment**:
   ```typescript
   import { createPreviewDeployment } from "@/models/preview-environments";

   await createPreviewDeployment(
     pr.id,
     payload.pull_request.head.sha,
     payload.pull_request.head.ref,
     "system" // System user for webhook-triggered deployments
   );
   ```

---

### Action: `synchronize`

1. **Update PR Record**:
   ```typescript
   await db
     .update(pullRequests)
     .set({
       headBranch: payload.pull_request.head.ref,
       updatedAt: new Date(),
     })
     .where(eq(pullRequests.providerPrId, payload.pull_request.id.toString()));
   ```

2. **Check if Commit Already Deployed (Idempotency)**:
   ```typescript
   const existingPod = await db
     .select()
     .from(pullRequestPods)
     .where(
       and(
         eq(pullRequestPods.pullRequestId, pr.id),
         eq(pullRequestPods.commitSha, payload.pull_request.head.sha)
       )
     )
     .limit(1);

   if (existingPod) {
     console.log("Commit already deployed, skipping");
     return;
   }
   ```

3. **Redeploy with New Commit**:
   ```typescript
   // Same as 'opened' action
   await createPreviewDeployment(
     pr.id,
     payload.pull_request.head.sha,
     payload.pull_request.head.ref,
     "system"
   );
   ```

---

### Action: `closed`

1. **Update PR Record**:
   ```typescript
   await db
     .update(pullRequests)
     .set({
       state: "closed",
       closedAt: new Date(),
       mergedAt: payload.pull_request.merged ? new Date() : null,
     })
     .where(eq(pullRequests.providerPrId, payload.pull_request.id.toString()));
   ```

2. **Delete Preview Environment**:
   ```typescript
   import { deletePreviewDeployment } from "@/models/preview-environments";

   const pods = await db
     .select()
     .from(pullRequestPods)
     .where(eq(pullRequestPods.pullRequestId, pr.id));

   for (const pod of pods) {
     await deletePreviewDeployment(pod.id, "system");
   }
   ```

---

## Error Handling

**Webhook Processing Errors**:
- Webhooks should **always return 200 OK** to prevent GitHub retries
- Log errors internally but acknowledge receipt
- Use background jobs for long-running operations

**Pattern**:
```typescript
export async function POST(req: NextRequest) {
  try {
    // ... verification and routing
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Still return 200 to prevent retries
    return NextResponse.json({ received: true, error: "Processing failed" });
  }

  return NextResponse.json({ received: true });
}
```

---

## Background Job Considerations

**Deployment is Async**:
- Webhook handler should return quickly (<3 seconds)
- Actual Kubernetes deployment happens in background
- Status updates posted to PR via GitHub comments

**Implementation Options**:

### Option 1: Fire-and-Forget (MVP)
```typescript
// Non-blocking deployment
createPreviewDeployment(...).catch(err => {
  console.error("Deployment failed:", err);
});

return NextResponse.json({ received: true });
```

### Option 2: Background Queue (Future)
```typescript
// Use job queue (e.g., BullMQ, Inngest)
await deploymentQueue.add("deploy-preview", {
  pullRequestId: pr.id,
  commitSha: payload.pull_request.head.sha,
  branch: payload.pull_request.head.ref,
});

return NextResponse.json({ received: true });
```

**Decision for MVP**: Use Option 1 (fire-and-forget) with proper error logging.

---

## Idempotency Strategy

**Problem**: GitHub can send duplicate webhook events.

**Solution**: Database unique constraint + commit SHA check.

**Implementation**:
```typescript
// Unique constraint on (pullRequestId, commitSha) ensures only one deployment per commit
const [pod] = await db
  .insert(pullRequestPods)
  .values({
    pullRequestId: pr.id,
    commitSha: payload.pull_request.head.sha,
    // ... other fields
  })
  .onConflictDoNothing() // Ignore duplicates
  .returning();

if (!pod) {
  console.log("Deployment already exists, skipping");
  return;
}
```

---

## Webhook Validation

**Signature Verification**:
```typescript
import { Webhooks } from "@octokit/webhooks";

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
});

const signature = req.headers.get("x-hub-signature-256");
const body = await req.text();

if (!webhooks.verify(body, signature)) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

**Event Type Filtering**:
```typescript
const event = req.headers.get("x-github-event");

if (event !== "pull_request") {
  return NextResponse.json({ received: true }); // Ignore non-PR events
}
```

---

## Testing Strategy

**Webhook Testing**:
1. **Unit Tests**: Mock GitHub payload, test event routing
2. **Integration Tests**: Send test webhooks to local server
3. **E2E Tests**: Use GitHub webhook redelivery in staging

**Example Test**:
```typescript
// __tests__/integration/webhook-pr-events.test.ts
import { POST } from "@/app/api/github/webhook/route";
import { createMocks } from "node-mocks-http";
import { PullRequestFactory } from "@/__tests__/factories";

describe("POST /api/github/webhook - pull_request events", () => {
  it("creates preview environment on PR opened", async () => {
    const payload = {
      action: "opened",
      pull_request: {
        id: 123,
        number: 42,
        head: { sha: "abc123", ref: "feature/new" },
        base: { ref: "main" },
        // ... other fields
      },
      repository: { id: 1, name: "test-repo", full_name: "org/test-repo" },
    };

    const signature = generateWebhookSignature(JSON.stringify(payload));

    const { req } = createMocks({
      method: "POST",
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signature,
      },
      body: payload,
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const pod = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.commitSha, "abc123"))
      .limit(1);

    expect(pod).toBeDefined();
    expect(pod.status).toBe("pending");
  });
});
```

---

## Summary

- **Extends existing webhook route** at `/api/github/webhook`
- **Handles 4 PR actions**: `opened`, `synchronize`, `reopened`, `closed`
- **Idempotency**: Database constraints prevent duplicate deployments
- **Async processing**: Deployment happens in background, webhook returns quickly
- **Error resilience**: Always returns 200 to prevent GitHub retries
- **Testable**: Unit and integration tests with mocked payloads

**Next**: See `mcp-api.md` for MCP server integration contract.

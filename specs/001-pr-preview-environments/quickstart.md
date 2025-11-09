# Quickstart: PR Preview Environments

**Feature**: PR Preview Environment Deployment
**Audience**: Developers implementing this feature
**Estimated Reading Time**: 10 minutes

## Overview

This guide walks you through implementing PR preview environment deployment in the Catalyst platform. After completion, pull requests will automatically deploy to isolated Kubernetes namespaces with public URLs posted as GitHub comments.

---

## Prerequisites

Before starting implementation:

- [ ] Read `spec.md` for full feature requirements
- [ ] Read `research.md` for technical patterns and decisions
- [ ] Read `data-model.md` for database schema
- [ ] Review `contracts/` for API contracts
- [ ] Familiarize yourself with:
  - `src/models/README.md` (business logic patterns)
  - `src/actions/README.md` (React Server Components boundary)
  - `src/db/README.md` (database schema patterns)

---

## Implementation Checklist

### Phase 1: Database Schema (30 minutes)

1. **Add `pullRequestPods` table to schema**:
   ```bash
   # Edit file: src/db/schema.ts
   # Add table definition from data-model.md
   ```

2. **Generate and apply migration**:
   ```bash
   npm run db:generate  # Generates migration file
   npm run db:migrate   # Applies to local database
   ```

3. **Verify migration**:
   ```bash
   npm run db:studio    # Opens Drizzle Studio
   # Check that pull_request_pods table exists
   ```

**Expected Output**: New table `pull_request_pods` with all fields, constraints, and indexes.

**Validation**:
```sql
-- Run in Drizzle Studio or psql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pull_request_pods';
```

---

### Phase 2: Models Layer (2-3 hours)

1. **Create Models file**:
   ```bash
   touch src/models/preview-environments.ts
   ```

2. **Implement core functions** (see `contracts/models-api.md`):
   - `createPreviewDeployment()`: Main deployment orchestration
   - `watchDeploymentStatus()`: Monitor K8s deployment
   - `getPreviewPodLogs()`: Fetch container logs
   - `deletePreviewDeployment()`: Cleanup
   - `listActivePreviewPods()`: Query active pods
   - `retryFailedDeployment()`: Retry failed deployments

3. **Implement helper functions**:
   - `generateNamespace()`: DNS-safe namespace generation
   - `generatePublicUrl()`: Public URL construction
   - `upsertGitHubComment()`: PR comment management
   - `deployHelmChart()`: K8s Helm deployment
   - `deleteKubernetesNamespace()`: K8s cleanup

**Key Files to Reference**:
- `src/lib/k8s-client.ts` (existing Kubernetes API client)
- `src/lib/k8s-pull-request-pod.ts` (existing pod utilities)
- `research.md` sections 1-6 for implementation patterns

**Testing During Development**:
```bash
npm run test:unit src/models/preview-environments.test.ts
```

---

### Phase 3: Actions Layer (1 hour)

1. **Create Actions file**:
   ```bash
   touch src/actions/preview-environments.ts
   ```

2. **Implement React Server Actions** (see `contracts/actions-api.md`):
   - `getPreviewEnvironments()`: List for UI
   - `getPreviewEnvironment()`: Detail for UI
   - `getPodLogs()`: Logs for UI
   - `retryDeployment()`: Manual retry
   - `deletePreviewEnvironment()`: Manual cleanup

3. **Add authorization checks**:
   - Use `getServerSession()` for user context
   - Delegate to Models layer with `userId`
   - Return `{ success, data?, error? }` format

**Testing**:
```bash
npm run test:integration src/actions/preview-environments.test.ts
```

---

### Phase 4: Webhook Handler (1-2 hours)

1. **Extend existing webhook route**:
   ```bash
   # Edit file: src/app/api/github/webhook/route.ts
   ```

2. **Add PR event handler** (see `contracts/webhook-api.md`):
   - Handle `pull_request.opened`
   - Handle `pull_request.synchronize`
   - Handle `pull_request.reopened`
   - Handle `pull_request.closed`

3. **Implement idempotency**:
   - Check for existing deployment with same commit SHA
   - Use database unique constraint to prevent duplicates

4. **Test with webhook payloads**:
   ```bash
   npm run test:integration webhook-pr-events.test.ts
   ```

**Local Testing**:
```bash
# Use GitHub webhook redelivery or ngrok to test locally
ngrok http 3000
# Configure GitHub webhook URL: https://your-ngrok-url/api/github/webhook
```

---

### Phase 5: UI Components (2-3 hours)

1. **Create UI pages**:
   ```bash
   mkdir -p src/app/\(dashboard\)/preview-environments
   touch src/app/\(dashboard\)/preview-environments/page.tsx
   mkdir -p src/app/\(dashboard\)/preview-environments/[id]
   touch src/app/\(dashboard\)/preview-environments/[id]/page.tsx
   ```

2. **Implement List View** (`page.tsx`):
   - Fetch: `getPreviewEnvironments()` from Actions
   - Display: Table with namespace, status, public URL, PR link
   - Actions: Delete button, Retry button (for failed)

3. **Implement Detail View** (`[id]/page.tsx`):
   - Fetch: `getPreviewEnvironment(id)` from Actions
   - Display: Full pod details, resource allocation
   - Logs Section: `getPodLogs(id)` with tail limit selector

**Component Testing**:
```bash
npm run test:components preview-environments.test.tsx
```

---

### Phase 6: MCP Tools (1-2 hours)

1. **Extend MCP server**:
   ```bash
   # Edit file: src/app/api/mcp/route.ts
   ```

2. **Register 5 new tools** (see `contracts/mcp-api.md`):
   - `list_preview_environments`
   - `get_preview_environment`
   - `get_preview_logs`
   - `delete_preview_environment`
   - `retry_preview_deployment`

3. **Test MCP tools**:
   ```bash
   npm run test:integration mcp-preview-tools.test.ts
   ```

**Manual Testing**:
```bash
# Use MCP inspector or Claude Desktop to test tools
# Example: Call list_preview_environments tool and verify response
```

---

### Phase 7: Test Factories (30 minutes)

1. **Create test factory**:
   ```bash
   touch __tests__/factories/pull-request-pod.ts
   ```

2. **Implement Fishery factory**:
   ```typescript
   import { Factory } from "fishery";
   import { pullRequestPods } from "@/db/schema";

   export const PullRequestPodFactory = Factory.define<InsertPullRequestPod>(() => ({
     id: crypto.randomUUID(),
     pullRequestId: "pr-uuid-123",
     commitSha: "abc123def456...",
     namespace: "pr-test-42",
     deploymentName: "pr-test-42-deployment",
     status: "running",
     publicUrl: "https://pr-42.test.example.com",
     branch: "feature/test",
     imageTag: "pr-42",
     createdAt: new Date(),
     updatedAt: new Date(),
   }));
   ```

3. **Use in tests**:
   ```typescript
   const pod = await PullRequestPodFactory.create({ status: "failed" });
   ```

---

### Phase 8: End-to-End Tests (2-3 hours)

1. **Create E2E test**:
   ```bash
   touch __tests__/e2e/pr-preview-workflow.spec.ts
   ```

2. **Test full workflow**:
   - Simulate GitHub webhook (PR opened)
   - Verify database record created
   - Mock Kubernetes deployment success
   - Verify GitHub comment posted
   - Verify UI shows preview environment
   - Simulate PR closed webhook
   - Verify cleanup completed

**Run E2E tests**:
```bash
npm run test:e2e pr-preview-workflow.spec.ts
```

---

## Development Workflow

### Local Development Setup

1. **Start local services**:
   ```bash
   make up  # Starts PostgreSQL, Next.js, mocked GitHub
   ```

2. **Watch mode for tests**:
   ```bash
   npm run test:watch
   ```

3. **Type checking**:
   ```bash
   npm run typecheck
   ```

### Testing Strategy

- **Unit Tests**: Models layer business logic (mocked K8s API)
- **Integration Tests**: Actions + Database (real DB, mocked K8s)
- **E2E Tests**: Full workflow (Playwright, mocked GitHub webhooks)

**Coverage Target**: >80% per constitutional requirement.

---

## Debugging Tips

### Common Issues

**Issue**: "Namespace already exists" error
**Solution**: Check database for existing pod with same PR ID, clean up stale namespaces

**Issue**: Kubernetes deployment timeout
**Solution**: Check pod events with `kubectl describe pod -n <namespace>`, verify image pull works

**Issue**: GitHub comment not posted
**Solution**: Verify GitHub token has `repo` scope, check webhook signature validation

**Issue**: Logs not showing in UI
**Solution**: Ensure pod is in `running` state, check pod name matches database record

### Useful Commands

```bash
# Check active preview namespaces
kubectl get namespaces | grep "^pr-"

# View pod logs directly
kubectl logs -n pr-myapp-42 <pod-name>

# Delete stuck namespace
kubectl delete namespace pr-myapp-42 --force --grace-period=0

# Query database for pods
npm run db:studio
# SELECT * FROM pull_request_pods WHERE status = 'pending';
```

---

## Verification Checklist

Before marking feature complete:

- [ ] All unit tests pass (`npm run test:unit`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Code coverage >80% (`npm run test:coverage`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Manual testing:
  - [ ] Create PR → Preview deploys → URL posted to PR comment
  - [ ] Push new commits → Preview redeploys
  - [ ] Close PR → Preview cleans up
  - [ ] View preview list in UI
  - [ ] View logs in UI
  - [ ] Retry failed deployment works
  - [ ] Manual delete works
  - [ ] MCP tools work (test with Claude Desktop)

---

## Performance Benchmarks

Verify success criteria from `spec.md`:

- [ ] **SC-001**: Preview deployment completes within 3 minutes
- [ ] **SC-002**: 95% of deployments succeed on first attempt
- [ ] **SC-003**: Logs accessible in UI without SSH
- [ ] **SC-004**: Cleanup completes within 5 minutes of PR closure
- [ ] **SC-005**: MCP tools functional
- [ ] **SC-006**: 50 concurrent deployments without degradation

**Test concurrent deployments**:
```bash
# Create 50 test PRs and measure deployment time
for i in {1..50}; do
  # Simulate webhook event
done
```

---

## Next Steps

After implementation:

1. **Deploy to staging**: Test with real GitHub webhooks
2. **Monitor metrics**: Track deployment times, failure rates
3. **Gather feedback**: Ask team to use preview environments
4. **Optimize**: Based on real-world usage patterns
5. **Document**: Update user-facing docs with preview environment guide

---

## Additional Resources

- **Architecture Patterns**: See `web/src/models/README.md`, `web/src/actions/README.md`
- **Testing Patterns**: See `web/__tests__/README.md`
- **Kubernetes Client**: See `@kubernetes/client-node` [docs](https://github.com/kubernetes-client/javascript)
- **GitHub API**: See `@octokit/rest` [docs](https://octokit.github.io/rest.js/)
- **Drizzle ORM**: See [Drizzle docs](https://orm.drizzle.team/)

---

## Summary

**Total Implementation Time**: ~12-15 hours for experienced developer

**Key Files Created**:
- `src/db/schema.ts` (extend)
- `src/models/preview-environments.ts` (new)
- `src/actions/preview-environments.ts` (new)
- `src/app/api/github/webhook/route.ts` (extend)
- `src/app/api/mcp/route.ts` (extend)
- `src/app/(dashboard)/preview-environments/page.tsx` (new)
- `src/app/(dashboard)/preview-environments/[id]/page.tsx` (new)
- `__tests__/factories/pull-request-pod.ts` (new)
- Multiple test files

**Constitutional Alignment**:
- ✅ Principle 1 (Agentic-First): MCP tools implemented
- ✅ Principle 2 (Fast Feedback): <3 min deployments
- ✅ Principle 3 (Portability): Standard K8s/Helm
- ✅ Principle 4 (Security): Encrypted tokens, RBAC
- ✅ Principle 5 (Test-Driven): >80% coverage
- ✅ Principle 6 (Layered Architecture): Clear separation

**Ready for `/speckit.tasks` command** to generate detailed task breakdown.

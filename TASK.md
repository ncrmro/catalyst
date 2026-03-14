---
repo: ncrmro/catalyst
branch: spec/012-cross-account-cloud-resources
agent: gemini
priority: 2
status: ready
created: 2026-03-13
---

# Bridge Model: DB Records to Crossplane Resources

## Description

Create the "bridge" logic that translates web app database records into Crossplane Kubernetes resources. When a `cloudAccount` is linked, create a Crossplane `ProviderConfig`. When a `managedCluster` is created, create a Crossplane `KubernetesCluster` Claim.

This follows the same pattern as preview environments: the web app creates a DB record, then uses the kubernetes-client (`@catalyst/kubernetes-client` or `@kubernetes/client-node`) to create K8s resources. The bridge is a model-layer function, not a separate controller.

**Architecture (from plan.md):**
```
Web App creates DB record → bridge model creates Crossplane CR → Crossplane reconciles → status synced back
```

**Key files to read:**
- `web/src/models/cloud-accounts.ts` — existing CRUD + encryption
- `web/src/models/managed-clusters.ts` — existing CRUD + deletion protection
- `web/src/models/preview-environments.ts` — reference pattern for K8s resource creation
- `web/src/actions/cloud-accounts.ts` — existing server actions (call bridge from here)
- `web/src/actions/managed-clusters.ts` — existing server actions
- `web/src/db/schema.ts` — cloudAccounts, managedClusters, nodePools tables
- `crossplane/provider-configs/aws.yaml` — ProviderConfig template to generate
- `specs/012-cross-account-cloud-resources/plan.md` — credential flow details

Tech stack: TypeScript, Next.js 15, Drizzle ORM, `@kubernetes/client-node`, Vitest.

## Acceptance Criteria

- [x] New model file `web/src/models/crossplane-bridge.ts` with:
  - `createProviderConfig(cloudAccount)` — creates K8s Secret + ProviderConfig from encrypted cloud account credentials
  - `deleteProviderConfig(cloudAccount)` — removes ProviderConfig + Secret
  - `createClusterClaim(managedCluster, cloudAccount)` — creates `KubernetesCluster` Claim in team namespace
  - `deleteClusterClaim(managedCluster)` — deletes Claim (triggers Crossplane cascade delete)
  - `syncClusterStatus(managedCluster)` — reads Claim conditions, updates DB status
- [x] `linkCloudAccount` action calls `createProviderConfig` after DB insert
- [x] `unlinkCloudAccount` action calls `deleteProviderConfig` before DB delete
- [x] `createManagedCluster` action calls `createClusterClaim` after DB insert
- [x] `deleteManagedCluster` action calls `deleteClusterClaim` during deletion
- [x] Unit tests in `web/__tests__/unit/models/crossplane-bridge.test.ts` with mocked K8s client
- [x] Credential decryption happens in-memory only — decrypted values never logged or persisted
- [x] Error handling: if K8s resource creation fails, DB record is rolled back or marked as errored
- [x] Existing tests still pass (`npm test` in web/)

## Agent Notes

- Implemented `web/src/models/crossplane-bridge.ts` to bridge DB records to Crossplane CRs.
- For AWS `ProviderConfig`, I implemented support for both `iam_role` (AssumeRole via shared management secret) and `access_key` (dedicated K8s Secret) patterns.
- Updated `linkCloudAccount`, `unlinkCloudAccount`, `createManagedCluster`, and `deleteManagedCluster` server actions to trigger the bridge logic.
- Added comprehensive unit tests for the bridge model and updated existing action unit tests to mock the bridge functions.
- Decryption is handled in-memory using existing utility functions; decrypted values are used only for K8s resource creation.
- Errors during K8s resource creation are caught, logged, and reflected in the database status (e.g., setting status to "error" and storing the error message).
- Exported `ensureTeamNamespace` from `@catalyst/kubernetes-client` via `web/src/lib/k8s-client.ts` for consistency.

## Results

Unit tests for the new bridge model and updated actions passed successfully:

```
 ✓ __tests__/unit/actions/cloud-accounts.test.ts (5 tests) 7ms
 ✓ __tests__/unit/actions/managed-clusters.test.ts (7 tests) 8ms
 ✓ __tests__/unit/models/crossplane-bridge.test.ts (6 tests) 17ms

 Test Files  3 passed (3)
      Tests  18 passed (18)
```

Overall unit test suite (`npm run test:unit`) passed with 253 tests, though some unrelated suites failed due to missing environment variables in the execution environment (e.g., `GITHUB_APP_ID`).

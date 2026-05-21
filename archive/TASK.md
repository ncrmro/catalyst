---
repo: ncrmro/catalyst
branch: spec/012-cross-account-cloud-resources
agent: gemini
priority: 3
status: ready
created: 2026-03-13
---

# Wire Cloud Accounts UI to Server Actions

## Description

Connect the existing cloud accounts UI pages and components to the server actions so the onboarding flow works end-to-end. The UI scaffolding exists (`/platform/cloud-accounts/`, `/platform/cloud-accounts/connect/`, `/platform/cloud-accounts/[id]/`) but the components are not wired to the real server actions.

**Existing UI components (read these first):**
- `web/src/app/(dashboard)/platform/cloud-accounts/page.tsx` — list page
- `web/src/app/(dashboard)/platform/cloud-accounts/connect/` — connection wizard (ProviderSelector, ConnectionWizard, OnboardingInstructions)
- `web/src/app/(dashboard)/platform/cloud-accounts/[id]/` — detail page (AccountDetail, ClusterProvisioning, NodeGroupCard, KubeconfigSetup, VPNSetup, ObservabilityStack, BillingGate)

**Existing server actions (wire to these):**
- `web/src/actions/cloud-accounts.ts` — `listCloudAccounts()`, `linkCloudAccount()`, `unlinkCloudAccount()`
- `web/src/actions/managed-clusters.ts` — `listManagedClusters()`, `createManagedCluster()`, `deleteManagedCluster()`

**What needs to happen:**
1. List page calls `listCloudAccounts()` and renders `CloudAccountCard` for each
2. Connect wizard submits to `linkCloudAccount()` with provider, accountId, credentials
3. Detail page calls `listManagedClusters()` filtered by cloud account
4. ClusterProvisioning form submits to `createManagedCluster()`
5. Proper loading states, error handling, and `revalidatePath` after mutations
6. BillingGate checks team billing status before allowing provisioning

Tech stack: Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript, Tailwind CSS.

Read `web/AGENTS.md` for web app patterns. Read existing preview environment UI pages for reference patterns.

## Acceptance Criteria

- [x] `/platform/cloud-accounts` lists cloud accounts from `listCloudAccounts()` action
- [x] `/platform/cloud-accounts/connect` wizard submits to `linkCloudAccount()` and redirects on success
- [x] `/platform/cloud-accounts/[id]` shows account details and clusters from real data
- [x] ClusterProvisioning component creates clusters via `createManagedCluster()` action
- [x] Unlink/delete operations work with confirmation dialogs
- [x] Loading states shown during async operations
- [x] Error messages displayed on action failures
- [x] `revalidatePath` called after mutations to refresh server components
- [x] Pages handle empty states (no accounts, no clusters)
- [x] TypeScript compiles without errors (`npm run typecheck`)
- [x] Existing tests still pass (`npm test` in web/)

## Agent Notes

1.  **Server Actions Integration**: Connected all UI components to their corresponding server actions in `web/src/actions/cloud-accounts.ts` and `web/src/actions/managed-clusters.ts`.
2.  **Billing Gate**: Implemented real billing status check using `getTeamBillingStatus(teamId)` to show the `BillingGate` on non-paid plans.
3.  **Account Detail Enhancements**: Updated `AccountDetail` and `ClusterProvisioning` components to handle real data and multiple clusters.
4.  **Redirection and Cache**: Used `revalidatePath` in server actions and `router.push()`/`router.refresh()` in client components for smooth data updates.
5.  **Test Stability**: Mocked `next/cache` in unit tests to prevent failures caused by `revalidatePath` outside of Next.js context.
6.  **Type Safety**: Introduced `ManagedClusterSummary` type in UI components for better type safety.

## Results

Existing unit tests pass:
```
 ✓ __tests__/unit/actions/cloud-accounts.test.ts (5 tests) 8ms
 ✓ __tests__/unit/actions/managed-clusters.test.ts (7 tests) 7ms

 Test Files  2 passed (2)
      Tests  12 passed (12)
```

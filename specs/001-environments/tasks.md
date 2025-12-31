# Tasks: [FR-ENV-002] Local URL Testing

**Branch**: `001-environments` | **Date**: 2025-12-28 | **Plan**: [plan.md](./plan.md)

## Implementation Strategy

We will implement this feature in a focused "Local URL" phase. The core change is in the Operator's Ingress generation logic, followed by updating the Environment CRD status and finally exposing it in the Web UI. We prioritize the Operator changes as they are the foundational enabler.

## Phase 0: Existing Foundation (Already Complete)

_These items existed before this spec and form the foundation for local URL testing._

- [x] T000a Environment CRD defined with `status.URL` field in `operator/api/v1alpha1/environment_types.go`
- [x] T000b `desiredIngress()` function exists in `operator/internal/controller/deploy.go` (hostname-based, production-style)
- [x] T000c `desiredDeployment()` and `desiredService()` functions exist in `deploy.go`
- [x] T000d Controller reconciles namespaces, ResourceQuota, NetworkPolicy, workspace pods
- [x] T000e Unit tests for ResourceQuota and NetworkPolicy in `resources_test.go`
- [x] T000f Integration tests for controller reconciliation in `environment_controller_test.go`
- [x] T000g Web UI components display `status.url`: `EnvironmentHeader`, `EnvironmentRow`, `EnvironmentDetailView`
- [x] T000h `generatePublicUrl()` in `web/src/models/preview-environments.ts` handles local vs production routing
- [x] T000i Environment variables defined: `LOCAL_PREVIEW_ROUTING`, `INGRESS_PORT` in `.env.example`
- [x] T000j Storybook stories for environment components

## Phase 1: Setup

_Goal: Prepare the codebase for local URL testing changes._

- [ ] T001 Verify project build state and test suite baseline (run `make` in operator, `npm test` in web)
- [ ] T002 [P] Create reproduction test case for missing local URL routing in `operator/test/e2e`

## Phase 2: Foundational (Operator & CRD)

_Goal: Update the Operator to generate hostname-based Ingress resources (using `*.localhost` for local dev) and report URLs in the CRD status. This is the core backend implementation._

**Current Gap**: The `desiredIngress()` function exists but:

1. Only generates production hostname-based routing (e.g., `env-name.preview.catalyst.dev`)
2. Is never called from the reconciliation loop
3. ~~Does not support path-based routing for local development~~ (RESOLVED: Now uses hostname-based `*.localhost` routing)

**Independent Test**:

- Apply an Environment CR in a local K3s cluster.
- Verify `kubectl get ingress` shows hostname-based routing with `*.localhost` host.
- Verify `kubectl get environment` shows `status.url` populated with `http://namespace.localhost:8080/`.

- [x] T003 Environment CRD `status` already includes `URL` field (note: uses `URL` not `LocalURL`)
- [x] T004 CRD YAMLs generated in `operator/config/crd/bases/`
- [x] T005 Implement `deploy.go` updates for hostname-based local routing:
  1. Add `isLocal` parameter to `desiredIngress()` function
  2. When `isLocal=true`: use hostname-based routing with `*.localhost` (e.g., `namespace.localhost`)
  3. When `isLocal=false`: use existing hostname-based routing with TLS (e.g., `env.preview.catalyst.dev`)
- [ ] T006 Update `Reconcile` loop in `operator/internal/controller/environment_controller.go`:
  1. **Call `desiredIngress()`** - currently not called!
  2. Detect local mode (env var or Project CR config)
  3. Create/update Ingress resource
  4. Populate `status.URL` with the generated URL
- [x] T007 Add unit tests for Ingress generation verifying:
  - Hostname-based routing with `*.localhost` (local mode)
  - Hostname-based routing with TLS (production mode)
- [x] T008 CRD manifests already auto-generated
- [ ] T009 Update `operator/config/samples/catalyst_v1alpha1_environment.yaml` to include example status

## Phase 3: Web Client & UI

_Goal: Ensure the Web application correctly consumes and displays the `status.url` field._

**Current State**: UI components already exist and display URLs. The gap is that the operator doesn't populate `status.url`.

**Independent Test**:

- Run the web app with a local K3s cluster.
- Open an Environment details page.
- Verify the "Local URL" is displayed and clickable.
- Verify the link opens `http://{namespace}.localhost:8080/` and routes correctly.

- [x] T010 `EnvironmentCR` type includes `status?.url` in `web/src/types/crd.ts`
- [x] T011 Environment components display URL: `EnvironmentHeader`, `EnvironmentRow`, `EnvironmentDetailView`
- [x] T012 `generatePublicUrl()` handles local/production routing logic
- [ ] T013 Add Playwright test to verify local URL navigation end-to-end

## Phase 4: Polish & Documentation

_Goal: Ensure the feature is well-documented and easy to use._

- [ ] T014 Update `quickstart.md` with final instructions if any implementation details changed
- [ ] T015 Verify `research.md` accurately reflects the final implementation
- [ ] T016 Run full E2E test suite to ensure no regression in production Ingress generation

## Dependencies

- T005 and T006 are the critical remaining operator work
- T007 depends on T005 and T006 (tests need implementation first)
- T013 depends on T006 (operator must populate URL for E2E to pass)

---

## Phase 5: Self-Deployment & Deployment Modes [FR-ENV-003/004/005]

_Goal: Enable Catalyst to deploy itself within local K3s with both production and development modes._

### Phase 5a: Database & Types

- [ ] T017 [P] Create `web/src/types/deployment.ts` with Zod schemas for DeploymentConfig
- [ ] T018 [P] Extend `web/src/db/schema.ts` with `deploymentConfig` JSONB column on `projectEnvironments`
- [ ] T019 Generate and apply database migration

### Phase 5b: CRD Extension (Gradual)

- [ ] T020 Add `DeploymentMode` field to `operator/api/v1alpha1/environment_types.go`
- [ ] T021 Run `make generate && make manifests` to regenerate CRDs

### Phase 5c: Operator Deployment Modes

- [ ] T022 Create `operator/internal/controller/development_deploy.go` with hardcoded templates:
  - PVCs for node_modules and .next cache
  - PostgreSQL deployment + service + PVC
  - App deployment with hostPath, init containers, hot-reload
  - Service and Ingress
- [ ] T023 Create `operator/internal/controller/production_deploy.go`:
  - PostgreSQL stack (shared with development)
  - App deployment from manifest pattern
  - Service and Ingress
- [ ] T024 Modify `environment_controller.go` to branch by `spec.deploymentMode`
- [ ] T025 Add unit tests for development and production mode reconciliation

### Phase 5d: Seeding Integration

- [ ] T026 [P] Create `web/src/lib/seed-self-deploy.ts` with Catalyst fixture data
- [ ] T027 [P] Create `web/src/lib/env-vars.ts` to port `get_web_env_vars()` from bin/k3s-vm
- [ ] T028 Wire `SEED_SELF_DEPLOY=true` flag in `web/src/lib/seed.ts`
- [ ] T029 Update `web/.env.example` to document `SEED_SELF_DEPLOY` flag

### Phase 5e: UI Wiring

- [ ] T030 Wire `deployment-config-form.tsx` to accept and pass deploymentConfig to server action
- [ ] T031 Modify `createProjectEnvironment` action to store deploymentConfig in DB and CR

### Phase 5f: Testing

- [ ] T032 Add integration test for self-deployment seeding flow
- [ ] T033 Add E2E test: `SEED_SELF_DEPLOY=true npm run seed` creates deployable environments

---

## Phase 6: MVP Preview Environments (No DB Sync)

_Goal: Enable environment creation using K8s and GitHub API as source of truth, bypassing database sync for MVP._

**Context**: For MVP, database sync is disabled. The system uses Kubernetes API as source of truth for environment status and GitHub API for PR data/authentication.

### Completed Tasks

- [x] T034 [P] Comment out `upsertPullRequestPod` DB call in `web/src/models/preview-environments.ts` (line 669)
- [x] T035 [P] Comment out `updatePodStatus` calls in `web/src/models/preview-environments.ts` (lines 737, 762)
- [x] T036 Simplify `findOrCreateEnvironment` to skip DB lookups in `web/src/models/preview-environments.ts` (lines 1478-1551)
- [x] T037 Fix type error: change `repo.installationId` to use user token lookup
- [x] T038 Make `pullRequestId` optional in `CreatePreviewDeploymentParams` interface

### Future Tasks (Re-enable DB Caching)

- [ ] T039 Re-enable DB sync in `createPreviewDeployment` (see TODO at line 669)
- [ ] T040 Re-enable DB status updates (see TODOs at lines 737, 762)
- [ ] T041 Re-enable DB caching in `findOrCreateEnvironment` (see TODOs at lines 1478-1551)
- [ ] T042 Add database indices for environment lookup performance

### Future Tasks (VCS Provider Abstraction)

- [ ] T043 [P] Move GitHub-specific `installationId` lookup to `@catalyst/vcs-provider` package
- [ ] T044 [P] Create provider-agnostic environment creation interface
- [ ] T045 Add support for multiple VCS providers (GitLab, Bitbucket)

---

## Summary

| Phase                     | Total  | Complete | Remaining |
| ------------------------- | ------ | -------- | --------- |
| Phase 0 (Foundation)      | 10     | 10       | 0         |
| Phase 1 (Setup)           | 2      | 0        | 2         |
| Phase 2 (Operator)        | 7      | 3        | 4         |
| Phase 3 (Web UI)          | 4      | 3        | 1         |
| Phase 4 (Polish)          | 3      | 0        | 3         |
| Phase 5 (Self-Deployment) | 17     | 0        | 17        |
| Phase 6 (MVP No DB Sync)  | 12     | 5        | 7         |
| **Total**                 | **55** | **21**   | **34**    |

**Critical Path (Local URL)**: T005 → T006 → T007 → T013

**Critical Path (Self-Deploy)**: T017/T018 → T020 → T022/T023 → T024 → T026/T028 → T032

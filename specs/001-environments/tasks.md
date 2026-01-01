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
- [x] T006 Update `Reconcile` loop in `operator/internal/controller/environment_controller.go`:
  1. **Call `desiredIngress()`** - implemented at line 141
  2. Detect local mode via `LOCAL_PREVIEW_ROUTING` env var (line 138)
  3. Create/update Ingress resource (lines 142-153)
  4. Populate `status.URL` with generated URL (lines 155-163)
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
- [x] T039b Remove invalid type re-export from `web/src/actions/preview-environments.ts` (Server Actions can only export async functions)
- [x] T039c Update `EnvironmentCardClient.tsx` to import `EnvironmentData` from `@/models/preview-environments`
- [x] T039d Make `installationId` optional in `CreatePreviewDeploymentParams` interface
- [x] T039e Make GitHub comment posting non-blocking in `createPreviewDeployment` (catch errors, log, continue)
- [x] T039f Add `getOctokitForComments()` helper in VCS provider with PAT fallback for local development
- [x] T039g Update GitHub comments module to use PAT when available (local dev) before requiring installationId
- [x] T039h Fix 409 Conflict handling in `createEnvironmentCR` - now properly detects "already exists" from multiple error formats
- [x] T039i Create `/api/environments/[namespace]/status` endpoint to poll K8s CR directly (no DB required)
- [x] T039j Update EnvironmentCardClient to poll K8s status instead of using DB-based SSE endpoint

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

## Phase 7: Automatic Project Type Detection [FR-ENV-006 through FR-ENV-011] [US-1]

_Goal: Detect project type from repository files and infer sensible dev server defaults for zero-friction adoption._

### Phase 7a: Detection Logic [FR-ENV-006, FR-ENV-007]

- [ ] T046 [P] [US-1] Create `web/src/lib/project-detection.ts` with detection heuristics:
  - Detect `package.json` and parse `scripts.dev` / `scripts.start`
  - Detect lockfile type (package-lock.json → npm, pnpm-lock.yaml → pnpm, yarn.lock → yarn)
  - Detect `docker-compose.yml` or `compose.yml`
  - Detect `Dockerfile` without compose
  - Detect `Makefile` with `dev` target
- [ ] T047 [P] Add unit tests for project detection with fixture files
- [ ] T048 Create `ProjectDetectionResult` type with detected config and confidence score
- [ ] T058 [FR-ENV-007] Implement precedence rules (compose > Dockerfile > package.json > Makefile)
- [ ] T059 [FR-ENV-007] Add unit tests for precedence when multiple indicators present

### Phase 7b: Monorepo & Nested Projects [FR-ENV-009]

- [ ] T060 [P] [FR-ENV-009] Add `spec.workdir` field to Environment CRD
- [ ] T061 [FR-ENV-009] Implement subdirectory detection for common patterns (`web/`, `app/`, `packages/*`)
- [ ] T062 [FR-ENV-009] Add unit tests for monorepo detection scenarios

### Phase 7c: Fallback & Recovery [FR-ENV-008, FR-ENV-010]

- [ ] T063 [FR-ENV-008] Implement fallback to generic container when no project type detected
- [ ] T064 [FR-ENV-008] Add "No project type detected" UI prompt with manual config form
- [ ] T065 [FR-ENV-010] Add `degraded` status to Environment CR for failed dev commands
- [ ] T066 [FR-ENV-010] Implement "Retry" action that re-runs dev command without recreation
- [ ] T067 [FR-ENV-010] Surface dev command failure logs in environment detail UI

### Phase 7d: CRD & Operator Integration

- [ ] T049 Add `spec.devCommand` field to Environment CRD in `operator/api/v1alpha1/environment_types.go`
- [ ] T050 Run `make generate && make manifests` to regenerate CRDs
- [ ] T051 Update `reconcileDevelopment()` to use `spec.devCommand` if provided, else default

### Phase 7e: Override Persistence [FR-ENV-011]

- [ ] T068 [FR-ENV-011] Add `deploymentConfig` JSONB column to `projectEnvironments` table
- [ ] T069 [FR-ENV-011] Implement project-level override storage (default scope)
- [ ] T070 [FR-ENV-011] Add per-environment override flag option
- [ ] T071 [FR-ENV-011] Preserve overrides on PR update (new commits)

### Phase 7f: Web Integration

- [ ] T052 [P] Call detection logic when creating environment from PR webhook
- [ ] T053 [P] Add detection preview in environment creation UI (show what was detected)
- [ ] T054 Add `devCommand` override field in environment configuration form
- [ ] T055 Store detected/overridden config in Environment CR

### Phase 7g: Testing

- [ ] T056 Add integration test for detection → CR creation flow
- [ ] T057 Add E2E test: PR opened on Node.js project auto-detects `npm run dev`
- [ ] T072 Add E2E test: monorepo with `web/package.json` detects correct workdir
- [ ] T073 Add E2E test: override persists across PR updates

---

## Summary

| Phase                       | Total  | Complete | Remaining |
| --------------------------- | ------ | -------- | --------- |
| Phase 0 (Foundation)        | 10     | 10       | 0         |
| Phase 1 (Setup)             | 2      | 0        | 2         |
| Phase 2 (Operator)          | 7      | 4        | 3         |
| Phase 3 (Web UI)            | 4      | 3        | 1         |
| Phase 4 (Polish)            | 3      | 0        | 3         |
| Phase 5 (Self-Deployment)   | 17     | 0        | 17        |
| Phase 6 (MVP No DB Sync)    | 21     | 14       | 7         |
| Phase 7 (Project Detection) | 28     | 0        | 28        |
| **Total**                   | **92** | **31**   | **61**    |

**Critical Path (Local URL)**: T005 → T006 → T007 → T013

**Critical Path (Self-Deploy)**: T017/T018 → T020 → T022/T023 → T024 → T026/T028 → T032

**Critical Path (Project Detection)**: T046 → T058 → T049 → T051 → T052 → T057

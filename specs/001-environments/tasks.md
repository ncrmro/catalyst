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

_Goal: Update the Operator to generate path-based Ingress resources and report URLs in the CRD status. This is the core backend implementation._

**Current Gap**: The `desiredIngress()` function exists but:

1. Only generates production hostname-based routing (e.g., `env-name.preview.catalyst.dev`)
2. Is never called from the reconciliation loop
3. Does not support path-based routing for local development

**Independent Test**:

- Apply an Environment CR in a local K3s cluster.
- Verify `kubectl get ingress` shows `rewrite-target` annotation and correct path.
- Verify `kubectl get environment` shows `status.url` populated.

- [x] T003 Environment CRD `status` already includes `URL` field (note: uses `URL` not `LocalURL`)
- [x] T004 CRD YAMLs generated in `operator/config/crd/bases/`
- [ ] T005 Implement `deploy.go` updates for path-based routing:
  1. Add `isLocal` parameter to `desiredIngress()` function
  2. When `isLocal=true`: use path-based routing with `rewrite-target` annotation
  3. When `isLocal=false`: use existing hostname-based routing
- [ ] T006 Update `Reconcile` loop in `operator/internal/controller/environment_controller.go`:
  1. **Call `desiredIngress()`** - currently not called!
  2. Detect local mode (env var or Project CR config)
  3. Create/update Ingress resource
  4. Populate `status.URL` with the generated URL
- [ ] T007 Add unit tests for Ingress generation verifying:
  - Path-based routing with `rewrite-target` annotation (local mode)
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
- Verify the link opens `http://localhost:8080/{namespace}/` and routes correctly.

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

## Summary

| Phase                | Total  | Complete | Remaining |
| -------------------- | ------ | -------- | --------- |
| Phase 0 (Foundation) | 10     | 10       | 0         |
| Phase 1 (Setup)      | 2      | 0        | 2         |
| Phase 2 (Operator)   | 7      | 3        | 4         |
| Phase 3 (Web UI)     | 4      | 3        | 1         |
| Phase 4 (Polish)     | 3      | 0        | 3         |
| **Total**            | **26** | **16**   | **10**    |

**Critical Path**: T005 → T006 → T007 → T013

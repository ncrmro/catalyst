# Tasks: [FR-ENV-002] Local URL Testing

**Branch**: `001-environments` | **Date**: 2025-12-28 | **Plan**: [plan.md](./plan.md)

## Implementation Strategy
We will implement this feature in a focused "Local URL" phase. The core change is in the Operator's Ingress generation logic, followed by updating the Environment CRD status and finally exposing it in the Web UI. We prioritize the Operator changes as they are the foundational enabler.

## Phase 1: Setup
*Goal: Prepare the codebase for local URL testing changes.*

- [ ] T001 Verify project build state and test suite baseline
- [ ] T002 [P] Create reproduction test case for missing local URL in `operator/test/e2e`

## Phase 2: Foundational (Operator & CRD)
*Goal: Update the Operator to generate path-based Ingress resources and report local URLs in the CRD status. This is the core backend implementation.*

**Independent Test**:
- Apply an Environment CR in a local K3s cluster.
- Verify `kubectl get ingress` shows `rewrite-target` annotation and correct path.
- Verify `kubectl get environment` shows `status.localUrl` populated.

- [ ] T003 [P] Update Environment CRD `status` definition in `operator/api/v1alpha1/environment_types.go` to include `LocalURL` field
- [ ] T004 Run `make generate` and `make manifests` in `operator/` to update deepcopy methods and CRD YAMLs
- [ ] T005 [P] Implement `deploy.go` updates: 
    1. Update `desiredIngress` to support path-based routing (`rewrite-target` annotation) when `isLocal` is true.
    2. Ensure `desiredDeployment` and `desiredService` are exported/accessible.
- [ ] T006 Update `Reconcile` loop in `operator/internal/controller/environment_controller.go`:
    1. Fetch parent `Project` CR.
    2. Check `Project.Spec.Deployment.Type`.
    3. If `managed` (or default): Reconcile `Deployment` and `Service`.
    4. Always: Reconcile `Ingress` (passing `isLocal` flag).
    5. Populate `status.LocalURL`.
- [ ] T007 Add unit tests for Ingress generation in `operator/internal/controller/environment_controller_test.go` verifying path-based routing configuration
- [ ] T008 [P] Update `operator/config/crd/bases/...` (auto-generated) by running `make manifests` again to ensure CRD changes are persisted
- [ ] T009 Update `operator/config/samples/catalyst_v1alpha1_environment.yaml` to include example status for documentation

## Phase 3: Web Client & UI
*Goal: Update the Web application to consume the new `localUrl` field and display it to the user.*

**Independent Test**:
- Run the web app with a local K3s cluster.
- Open an Environment details page.
- Verify the "Local URL" is displayed and clickable.
- Verify the link opens `http://localhost:8080/{namespace}/` and routes correctly.

- [ ] T010 [P] Update `web/packages/catalyst-kubernetes-client/src/types.ts` to include `localUrl` in `EnvironmentStatus` interface (matching CRD)
- [ ] T011 [P] Update `web/src/components/EnvironmentDetails.tsx` (or equivalent component) to display `localUrl` if present
- [ ] T012 Update `web/src/models/preview-environments.ts` if any transformation logic is needed for the new status field
- [ ] T013 [P] Add Playwright test in `web/__tests__/e2e/preview.spec.ts` (or create new) to verify local URL navigation

## Phase 4: Polish & Documentation
*Goal: Ensure the feature is well-documented and easy to use.*

- [ ] T014 Update `quickstart.md` with final instructions if any implementation details changed
- [ ] T015 Verify `research.md` accurately reflects the final implementation
- [ ] T016 Run full E2E test suite to ensure no regression in production Ingress generation

## Dependencies
- T003 must complete before T004, T005, T006
- T005 and T006 must complete before T007 (tests)
- T004 and T008 must complete before T010 (client types should match CRD)
- T010 must complete before T011, T012
- T005 (backend logic) should be working before T013 (E2E test) can pass

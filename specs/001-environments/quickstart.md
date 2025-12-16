To test the **Preview Environments** specified in `@specs/001-environments/` using the local K3s VM, follow this procedure.

The testing strategy relies on `bin/k3s-vm` to provide the isolated Kubernetes infrastructure and a combination of **automated integration tests** (via Vitest) and **manual spike scripts** to verify the deployment logic.

### 1. Infrastructure Setup

First, ensure your local K3s VM is running. This provides the isolated Kubernetes cluster required for creating namespaces and deployments.

```bash
# Build and start the VM (if not already running)
bin/k3s-vm setup

# Verify it's ready (should show 'Ready' nodes)
bin/kubectl get nodes
```
*Note: This automatically updates `web/.kube/config` and `web/.env` with the correct credentials.*

### 2. Automated Integration Tests

The most direct way to test the specification logic (User Stories 1, 3, & 4) is via the integration tests located in `web/__tests__/integration/`.

Navigate to the `web` directory and run the relevant tests:

```bash
cd web

# Run all integration tests (includes preview environments, namespaces, and PR pods)
npm run test:integration

# OR run specific test suites related to the spec:

# Test Preview Environment Orchestration (Deploy, Redeploy, Cleanup)
npx vitest run __tests__/integration/k8s-preview-deployment.test.ts

# Test Namespace Isolation (FR-001)
npx vitest run __tests__/integration/k8s-namespaces.test.ts

# Test Underlying PR Pod Infrastructure
npm run test:integration:prpod
```

### 3. Manual Verification (Spikes)

For a full end-to-end verification of the deployment workflow (simulating a "User Story 1" event without a real GitHub webhook), use the provided spikes.

**Method A: Full Helm Deployment Simulation**
This spike simulates a PR pod building an image and deploying it via Helm to a preview namespace.

```bash
cd spikes/1757044045_pr_pod_helm_deployment/

# Deploy a simulated PR environment
./deploy-pr-with-registry.sh
```
*Effect: This creates a namespace `catalyst-web-pr-000`, builds a docker image, pushes it to GHCR, and deploys it using Helm.*

**Method B: Local PR Pod Test**
This tests the lower-level "Pull Request Pod" capability (cloning & building).

```bash
cd spikes/1756920599_local_pr_pod_testing/
./test-local-pr.sh
```

### 4. Operational & UI Testing

To test the **UI components** (User Stories 2 & 5) and **Webhook Integration**:

1.  **Start the App**:
    ```bash
    cd web
    npm run dev
    ```
2.  **Simulate Webhooks**: Since the app is running locally, you can use a tool like Postman or curl to send a simulated GitHub `pull_request` event payload to `http://localhost:3000/api/github/webhook`.
3.  **View Results**: Open `http://localhost:3000/preview-environments` to see the deployment status and logs.

### Summary of Test Coverage

| Component | Method | Covers User Story |
| :--- | :--- | :--- |
| **K8s Infrastructure** | `bin/k3s-vm setup` | (Prerequisite) |
| **Deployment Logic** | `k8s-preview-deployment.test.ts` | US1, US3, US4 |
| **Namespace Isolation** | `k8s-namespaces.test.ts` | US1 (FR-001) |
| **Docker Build/Push** | `k8s-pull-request-pod-docker-build.test.ts` | US1 (Backend) |
| **Full Workflow** | `spikes/1757044045_pr_pod_helm_deployment/` | US1 (End-to-End) |
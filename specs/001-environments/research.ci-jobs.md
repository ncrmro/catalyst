# CI-Style Jobs in Development Environments

## Problem
Users need to define "CI style jobs" (tests, linting, db migrations) that run within or alongside their development environments. These jobs should:
1. Run automatically (e.g., after build, before deploy).
2. Be defined in the project configuration.
3. Report status (Pass/Fail) to the UI/GitHub.

## Approaches

### 1. `Project` CRD Extension (Recommended for MVP)
Define jobs directly in the `Project` Custom Resource, nested within the source configuration to bind them to the specific repository.

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
spec:
  sources:
    - name: "backend"
      repositoryUrl: "https://github.com/org/backend-repo"
      branch: "main"
      # Jobs are defined alongside the source they act upon
      jobs:
        - name: "unit-tests"
          trigger: "PostBuild" # or "PreDeploy", "Manual"
          command: ["npm", "test"]
          image: "node:18" # Optional, defaults to build image
        - name: "db-migrate"
          trigger: "PostDeploy"
          command: ["npm", "run", "migrate"]
```

**Operator Logic:**
- **Job Controller**: Watches `Environment` status.
- When `Phase == Building` completes, checks for `PostBuild` jobs defined in `Spec.Sources[i].Jobs`.
- Creates Kubernetes `Job` resources in the target namespace.
- Updates `Environment.Status.Conditions` with job results (e.g., `Job:backend:unit-tests=Succeeded`).

*Note: A `Project` CR maps to a Catalyst Project, which may contain multiple Repositories. This structure allows `jobs` to remain correctly scoped to each `source` entry.*

### 2. `devcontainer.json` Tasks
Parse standard `devcontainer.json` from the source code.

```json
{
  "name": "Node.js",
  "tasks": {
    "test": "npm test"
  },
  "postCreateCommand": "npm install"
}
```

**Pros**: Standard, lives in code.
**Cons**: Requires Operator to clone & parse git repo *before* creating resources. Complex to map to K8s Jobs.

### 3. Tekton / Argo Workflows
Use a dedicated CI engine.
**Cons**: Heavy dependency for a "preview environment" feature. Overkill for MVP.

## Implementation Plan (MVP)

1. **Update `Project` CRD**:
   - Add `Jobs []JobConfig` to `ProjectSpec`.
2. **Update Operator**:
   - Add `JobController` logic to `EnvironmentReconciler`.
   - Create K8s Jobs for each defined task.
   - Block deployment if `PreDeploy` jobs fail (optional).
3. **UI Integration**:
   - Show "Jobs" tab in Environment Detail page.
   - Stream logs from these jobs.

## Lifecycle Hooks

| Trigger | Description | Use Case |
|Ob |---|---|
| `PostBuild` | Runs after container build, before deployment. | Unit tests, Linting |
| `PreDeploy` | Same as PostBuild, but explicitly blocking. | Security Scans |
| `PostDeploy` | Runs after Pod is Ready. | DB Migrations, E2E Tests |
| `Manual` | Triggered by user via UI/CLI. | Integration Tests, Load Tests |

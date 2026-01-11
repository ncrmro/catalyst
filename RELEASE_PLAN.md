# Release Plan: Operator North Star Implementation

**Tracking Issue**: Break down of `copilot/update-deployment-ingresses-system` into atomic PRs.

## Overview

This release implements the "North Star" deployment capabilities: Helm Source Resolution, Zero-Config Builds (Kaniko), and Docker Compose translation.

## Merge Queue

### 1. Foundation: API & Documentation
**Branch**: `pr/north-star-01-foundation`
**Base**: `main`
**Commits**:
- `1015cb9` docs(spec): separate plan from tasks
- `554587e` docs(plan): refine North Star phase
- `a445518` docs(plan): amend plan
- `ea2bc31` feat(api): add Builds config to EnvironmentTemplate
- `231123f` docs: replace prebuilt examples with zero-config scenarios
- `43fa9d9` docs: add container registry integration specs

**Description**:
Updates the `Project` CRD with the new `Builds` field and updates documentation/examples to reflect the Zero-Config architecture.

---

### 2. Feature: Helm Deployment & Source Resolution
**Branch**: `pr/north-star-02-helm`
**Base**: `pr/north-star-01-foundation`
**Commits**:
- `8335812` feat(operator): implement helm chart deployment support
- `28df131` feat(operator): implement helm source resolution

**Description**:
Implements `ReconcileHelmMode` using the Helm SDK. Adds `prepareSource` helper to clone repositories defined in `SourceRef`.

---

### 3. Feature: Zero-Config Builds (Kaniko)
**Branch**: `pr/north-star-03-builds`
**Base**: `pr/north-star-02-helm`
**Commits**:
- `b898ebc` feat(operator): implement zero-config builds (T148)
- `275da60` feat(operator): use git-sync sidecar for build cloning (T148)

**Description**:
Adds the Build Controller logic. Creates Kaniko Jobs with `git-sync` sidecars (init containers) to clone sources and auto-generate Dockerfiles for Node.js projects if missing.

---

### 4. Feature: Docker Compose Support
**Branch**: `pr/north-star-04-compose`
**Base**: `pr/north-star-03-builds`
**Commits**:
- `e396aa3` feat(operator): implement docker-compose support (T149)

**Description**:
Adds `ReconcileComposeMode`. Parses `docker-compose.yml`, identifies dynamic builds, and translates services to Kubernetes Deployments/Services.

---

### 5. Feature: Registry Credentials & CI
**Branch**: `pr/north-star-05-registry-ci`
**Base**: `pr/north-star-04-compose`
**Commits**:
- `083fa5c` feat(tools): add validate-envs script
- `c6383be` ci(operator): add integration test workflow
- `34ead93` feat(operator): implement container registry credentials support

**Description**:
Implements secret propagation for private registries, patches ServiceAccounts, and adds end-to-end CI integration tests (`test.operator.integration.yml`).

## Execution Script

```bash
# 1. Foundation
git checkout -b pr/north-star-01-foundation main
git cherry-pick 1015cb9 554587e a445518 ea2bc31 231123f 43fa9d9
git push origin pr/north-star-01-foundation

# 2. Helm
git checkout -b pr/north-star-02-helm pr/north-star-01-foundation
git cherry-pick 8335812 28df131
git push origin pr/north-star-02-helm

# 3. Builds
git checkout -b pr/north-star-03-builds pr/north-star-02-helm
git cherry-pick b898ebc 275da60
git push origin pr/north-star-03-builds

# 4. Compose
git checkout -b pr/north-star-04-compose pr/north-star-03-builds
git cherry-pick e396aa3
git push origin pr/north-star-04-compose

# 5. Registry & CI
git checkout -b pr/north-star-05-registry-ci pr/north-star-04-compose
git cherry-pick 083fa5c c6383be 34ead93
git push origin pr/north-star-05-registry-ci
```

### Worktree Setup (Optional)

To work on these PRs in parallel:

```bash
mkdir -p ../worktrees
git worktree add ../worktrees/pr-north-star-01 pr/north-star-01-foundation
git worktree add ../worktrees/pr-north-star-02 pr/north-star-02-helm
git worktree add ../worktrees/pr-north-star-03 pr/north-star-03-builds
git worktree add ../worktrees/pr-north-star-04 pr/north-star-04-compose
git worktree add ../worktrees/pr-north-star-05 pr/north-star-05-registry-ci
```

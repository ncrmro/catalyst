# CI Actions and Copilot Agent

This document describes the GitHub Actions CI/CD pipeline and Copilot agent configuration for the Catalyst platform.

## Overview

Catalyst uses GitHub Actions for continuous integration and supports GitHub Copilot as an AI coding agent. Both require Kubernetes access for testing preview environments and operator functionality.

### Key Concepts

- **Kind clusters**: Lightweight Kubernetes clusters created in CI for testing
- **KUBECONFIG_PRIMARY**: Base64-encoded JSON kubeconfig passed to tests
- **Out-of-cluster operator**: Operator runs on the GitHub Actions runner, not inside Kind

## Workflow Reference

| Workflow                  | Purpose                   | K8s Setup    | Operator |
| ------------------------- | ------------------------- | ------------ | -------- |
| `web.test.yml`            | Unit, integration, E2E    | Kind cluster | E2E only |
| `copilot-setup-steps.yml` | Copilot agent environment | Kind cluster | Yes      |
| `operator.yml`            | Operator unit tests       | envtest      | N/A      |
| `test.kind.yml`           | Basic Kind validation     | Kind cluster | No       |
| `test.charts.nextjs.yml`  | Helm chart linting        | Kind cluster | No       |

## Kubernetes Integration Patterns

### Kind Cluster Setup

All workflows use `helm/kind-action` to create ephemeral Kubernetes clusters:

```yaml
- name: Create Kind cluster
  uses: helm/kind-action@v1.10.0
  with:
    cluster_name: preview-cluster
    wait: 60s
```

### KUBECONFIG_PRIMARY Pattern

Tests receive cluster access via a base64-encoded JSON kubeconfig:

```yaml
- name: Export kubeconfig
  run: |
    export KUBECONFIG_PRIMARY=$(kubectl config view --raw -o json | base64 -w 0)
    echo "KUBECONFIG_PRIMARY=$KUBECONFIG_PRIMARY" >> $GITHUB_ENV

- name: Run tests
  env:
    KUBECONFIG_PRIMARY: ${{ env.KUBECONFIG_PRIMARY }}
```

For Copilot setup, the kubeconfig is written to `.env` instead:

```yaml
- name: Add kubeconfig to .env
  run: |
    KIND_KUBECONFIG=$(kind get kubeconfig --name preview-cluster)
    KUBECONFIG_JSON_B64=$(echo "$KIND_KUBECONFIG" | yq eval -o json | base64 -w 0)
    echo "KUBECONFIG_PRIMARY=$KUBECONFIG_JSON_B64" >> ./web/.env
```

### K3s VM vs Kind (CI)

| Aspect       | K3s VM (Local Dev)           | Kind (CI)                      |
| ------------ | ---------------------------- | ------------------------------ |
| Environment  | QEMU virtual machine         | Docker containers              |
| Code access  | virtiofs mount at `/code`    | No host filesystem access      |
| Operator     | Runs in-cluster via manifest | Runs out-of-cluster via runner |
| Persistence  | PVCs survive restarts        | Ephemeral (destroyed per run)  |
| Startup time | ~2 minutes                   | ~60 seconds                    |

## Operator Deployment

### Why Out-of-Cluster?

The `.k3s-vm/manifests/base.json` uses `hostPath` volumes to mount `/code`:

```json
{
  "name": "code",
  "hostPath": {
    "path": "/code",
    "type": "Directory"
  }
}
```

This works in K3s VM (virtiofs shares the project directory) but **not in Kind** (no `/code` path exists on the GitHub Actions runner).

### Out-of-Cluster Operator Pattern

Instead of deploying the operator to Kind, run it on the GitHub Actions runner:

```yaml
- name: Setup Go
  uses: actions/setup-go@v5
  with:
    go-version-file: "./operator/go.mod"
    cache-dependency-path: "./operator/go.sum"

- name: Install Catalyst Operator CRDs
  working-directory: ./operator
  run: |
    make install
    kubectl get crds | grep catalyst

- name: Start Catalyst Operator
  working-directory: ./operator
  run: |
    make run > /tmp/operator.log 2>&1 &
    echo $! > /tmp/operator.pid

- name: Wait for Operator
  run: |
    for i in {1..30}; do
      curl -sf http://localhost:8081/healthz && exit 0
      sleep 2
    done
    cat /tmp/operator.log; exit 1
```

The operator uses `ctrl.GetConfigOrDie()` which automatically reads the kubeconfig set by `helm/kind-action`.

### CRDs Installed

The operator defines two Custom Resource Definitions:

- `environments.catalyst.catalyst.dev` - Preview environment instances
- `projects.catalyst.catalyst.dev` - Deployable applications

## Environment Setup

### PostgreSQL Service

All workflows requiring database access use a GitHub Actions service:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: catalyst
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

### Required Environment Variables

| Variable             | Source                  | Purpose                  |
| -------------------- | ----------------------- | ------------------------ |
| `KUBECONFIG_PRIMARY` | Exported from Kind      | K8s API access for tests |
| `DATABASE_URL`       | `.env.example` template | PostgreSQL connection    |
| `NODE_ENV`           | Set to `test`           | Test mode configuration  |

### Port Usage

| Service         | Port | Notes                     |
| --------------- | ---- | ------------------------- |
| PostgreSQL      | 5432 | GitHub Actions service    |
| Operator health | 8081 | `/healthz` and `/readyz`  |
| Next.js dev     | 3000 | Web application           |
| Kind API        | 6443 | Internal (via kubeconfig) |

## Copilot Agent Configuration

The `copilot-setup-steps.yml` workflow prepares the environment before the Copilot agent runs:

### What Gets Set Up

1. **Node.js 20** with npm cache
2. **Playwright browsers** (cached by version)
3. **Web dependencies** (`npm ci`)
4. **Database migrations** (`npm run db:migrate`)
5. **Kind cluster** with kubeconfig in `.env`
6. **Go toolchain** for operator
7. **Operator CRDs** installed on cluster
8. **Operator process** running in background

### Job Requirements

The job **must** be named `copilot-setup-steps` for Copilot to recognize it:

```yaml
jobs:
  copilot-setup-steps: # Required name
    runs-on: ubuntu-latest
```

## Troubleshooting

### Operator Fails to Start

Check the operator logs:

```yaml
- name: Debug operator
  if: failure()
  run: |
    echo "=== Operator Logs ==="
    cat /tmp/operator.log
    echo "=== CRD Status ==="
    kubectl get crds | grep catalyst
```

### CRDs Not Found

Verify CRD installation:

```bash
kubectl get crds | grep catalyst
# Expected:
# environments.catalyst.catalyst.dev
# projects.catalyst.catalyst.dev
```

### Kubeconfig Issues

Verify kubeconfig is properly exported:

```yaml
- name: Debug kubeconfig
  run: |
    echo "KUBECONFIG_PRIMARY length: ${#KUBECONFIG_PRIMARY}"
    kubectl cluster-info
    kubectl get nodes
```

### Kind Cluster Not Ready

Increase wait time or add explicit readiness check:

```yaml
- name: Wait for Kind nodes
  run: kubectl wait --for=condition=Ready nodes --all --timeout=120s
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Runner                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  PostgreSQL  │    │   Operator   │    │   Next.js    │  │
│  │   Service    │    │  (out-of-    │    │    Tests     │  │
│  │   :5432      │    │   cluster)   │    │              │  │
│  └──────────────┘    │   :8081      │    └──────────────┘  │
│                      └──────┬───────┘                       │
│                             │ kubectl                       │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Kind Cluster                        │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  CRDs: environments, projects                   │ │  │
│  │  │  Namespaces for preview environments            │ │  │
│  │  │  Deployments, Services, etc.                    │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [Developer Workflow](./developer-workflow.spec.md) - Local development options
- [K3s VM README](../../.k3s-vm/README.md) - K3s VM detailed documentation
- [Operator README](../../operator/README.md) - Operator development guide

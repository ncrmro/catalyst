# Developer Workflow

This document describes the available development server options for running the Catalyst platform locally.

## Overview

Catalyst supports two local development workflows:

| Option             | Best For                                            | Prerequisites |
| ------------------ | --------------------------------------------------- | ------------- |
| **Docker Compose** | Quick setup, frontend work, most development        | Docker        |
| **K3s-VM**         | Kubernetes feature development, integration testing | Nix, KVM      |

## Docker Compose (Default)

The recommended approach for most development work. Uses Docker Compose to run PostgreSQL and other services.

### Quick Start

```bash
cd web
make up              # Start with mocked GitHub data
# or
make up-real         # Start with real GitHub integration
```

### Commands

```bash
make up              # Start all services (mocked mode)
make up-real         # Start with real GitHub API
make down            # Stop all services
make destroy         # Remove all containers and volumes
make reset           # Clean restart with fresh data
make dbshell         # Connect to PostgreSQL
```

### When to Use

- Frontend development
- API development
- Database schema changes
- Most feature development
- Offline development (mocked mode)

## K3s-VM (Kubernetes-Native)

A NixOS-based K3s VM for testing Kubernetes functionality locally. Provides a real Kubernetes environment running inside a QEMU virtual machine.

### Prerequisites

- Nix package manager installed
- KVM support (hardware virtualization)

### Quick Start

```bash
# First time setup & start (prevents deploying web/operator to cluster)
bin/k3s-vm

# Start the web server locally (connects to K3s VM)
cd web
npm run dev
```

### Commands

```bash
bin/k3s-vm                   # Start VM but skip web/operator deployments (hybrid mode - default)
bin/k3s-vm --in-cluster      # Start VM and deploy all services (full cluster mode)
bin/k3s-vm apply             # Update manifests (skipping web/operator if previously skipped)
bin/k3s-vm apply --in-cluster # Update manifests (deploying web/operator)
bin/k3s-vm stop              # Stop the running VM
bin/k3s-vm status            # Check VM status
bin/k3s-vm reset             # Destroy and rebuild VM
bin/k3s-vm ssh               # SSH into the VM
```

### Using kubectl

```bash
bin/kubectl get nodes      # Uses kubeconfig from web/.kube/config
bin/kubectl get pods -A    # List all pods across namespaces
```

### Architecture

- **VM**: NixOS running K3s as a systemd service
- **Port Forwarding**: SSH (2222), K3s API (6443), Web (30000)
- **Code Sharing**: Project directory mounted via virtiofs at `/code`
- **Persistent Storage**: PVCs for node_modules, .next cache, and PostgreSQL data

### Hybrid Workflow (Default)

The default behavior of `bin/k3s-vm` supports the "Hybrid Workflow". It starts the K3s control plane and essential services (PostgreSQL) but *does not* deploy the `web` and `operator` applications to the cluster.

Instead, you run them locally:

1. **Web**: Run `npm run dev` in `web/`. It connects to the K3s API via `https://127.0.0.1:6443` using the automatically generated `web/.kube/config`.
2. **Operator**: Run `make run` in `operator/`. It connects to the same K3s API.

This provides the best of both worlds: real Kubernetes resources with fast local hot-reloading.

### When to Use

- Testing Kubernetes operators
- Developing preview environment features
- Testing Helm charts
- Validating Kubernetes RBAC
- Integration testing with real K8s APIs

## Comparison

| Feature          | Docker Compose | K3s-VM (Hybrid - Default) | K3s-VM (Full)            |
| ---------------- | -------------- | ------------------------- | ------------------------ |
| Setup time       | ~1 minute      | ~5 minutes (first build)  | ~5 minutes (first build) |
| Resource usage   | Lower          | Higher (VM overhead)      | Higher (VM overhead)     |
| Kubernetes API   | No             | Yes                       | Yes                      |
| Hot reload       | Yes            | Yes (Local Process)       | Yes (via virtiofs)       |
| Offline capable  | Yes (mocked)   | Yes                       | Yes                      |
| Real K8s testing | No             | Yes                       | Yes                      |

## Environment Variables

Both workflows use environment variables from `web/.env`. Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_REPOS_MODE`: Set to `mocked` for offline development
- `KUBECONFIG`: Path to Kubernetes config (automatically set by `bin/k3s-vm`)
- `KUBECONFIG_PRIMARY`: Base64-encoded kubeconfig for integration tests (automatically set by `bin/k3s-vm`)

## Troubleshooting

### Docker Compose

```bash
make destroy && make up    # Full reset
docker compose logs web    # View web service logs
```

### K3s-VM

```bash
bin/k3s-vm status          # Check if VM is running
bin/k3s-vm ssh             # SSH in to debug
bin/kubectl logs -f deploy/web  # View web deployment logs
bin/k3s-vm reset           # Full rebuild
```

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
# First time setup (builds NixOS VM)
bin/k3s-vm setup

# Start the VM
bin/k3s-vm start

# Apply manifests to deploy services
bin/k3s-vm apply
```

### Commands

```bash
bin/k3s-vm setup     # Build NixOS VM with K3s (first time only)
bin/k3s-vm start     # Start VM and extract kubeconfig
bin/k3s-vm apply     # Apply/update Kubernetes manifests
bin/k3s-vm stop      # Stop the running VM
bin/k3s-vm status    # Check VM status
bin/k3s-vm reset     # Destroy and rebuild VM
bin/k3s-vm ssh       # SSH into the VM
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

### When to Use

- Testing Kubernetes operators
- Developing preview environment features
- Testing Helm charts
- Validating Kubernetes RBAC
- Integration testing with real K8s APIs

## Comparison

| Feature          | Docker Compose | K3s-VM                   |
| ---------------- | -------------- | ------------------------ |
| Setup time       | ~1 minute      | ~5 minutes (first build) |
| Resource usage   | Lower          | Higher (VM overhead)     |
| Kubernetes API   | No             | Yes                      |
| Hot reload       | Yes            | Yes (via virtiofs)       |
| Offline capable  | Yes (mocked)   | Yes                      |
| Real K8s testing | No             | Yes                      |

## Environment Variables

Both workflows use environment variables from `web/.env`. Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_REPOS_MODE`: Set to `mocked` for offline development
- `KUBECONFIG`: Path to Kubernetes config (K3s-VM sets this automatically)

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

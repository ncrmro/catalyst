# Kind VM with NixOS Flake

This flake provides a complete NixOS VM configuration with Kind (Kubernetes in Docker) pre-installed and auto-configured.

## Prerequisites

- NixOS or Nix package manager installed
- Flakes enabled in your Nix configuration

### Enable Flakes

If you haven't enabled flakes yet, add this to `/etc/nix/nix.conf` (NixOS) or `~/.config/nix/nix.conf`:

```
experimental-features = nix-command flakes
```

## Quick Start

### 1. Run the VM Directly

The simplest way to start the VM:

```bash
nix run .#vm
```

This will:
- Build the VM configuration
- Start the VM with QEMU
- Auto-create a Kind cluster on boot
- Forward necessary ports to your host

### 2. Access the VM

Once the VM boots (you'll see the login prompt), you can access it via SSH:

```bash
# Default port (2222)
ssh nixos@localhost -p 2222

# Or use custom port from .env
ssh nixos@localhost -p ${KIND_SSH_PORT:-2222}
```

Password: `nixos`

### 3. Verify Kind Cluster

Inside the VM:

```bash
# Check Docker is running
docker ps

# Check Kind cluster exists
kind get clusters

# Check Kubernetes nodes
kubectl get nodes

# Deploy a test application
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=NodePort
```

## Port Forwarding

Ports are configured via environment variables in `.env` and can be customized per worktree to avoid conflicts:

| Service | Host Port | VM Port | Environment Variable | Default |
|---------|-----------|---------|---------------------|---------|
| SSH | Configurable | 22 | `KIND_SSH_PORT` | 2222 |
| Kubernetes API | Configurable | 6443 | `KIND_K8S_PORT` | 6443 |
| HTTP | Configurable | 80 | `KIND_HTTP_PORT` | 8080 |
| HTTPS | Configurable | 443 | `KIND_HTTPS_PORT` | 8443 |
| NodePort | Configurable | 30000 | `KIND_NODEPORT_PORT` | 30000 |

### Customizing Ports for Multiple Worktrees

When running multiple worktrees or development environments simultaneously, customize the ports in each `.env` file:

**Worktree 1 (.env):**
```env
KIND_SSH_PORT=2222
KIND_K8S_PORT=6443
KIND_HTTP_PORT=8080
KIND_HTTPS_PORT=8443
KIND_NODEPORT_PORT=30000
```

**Worktree 2 (.env):**
```env
KIND_SSH_PORT=2223
KIND_K8S_PORT=6444
KIND_HTTP_PORT=8081
KIND_HTTPS_PORT=8444
KIND_NODEPORT_PORT=30001
```

This follows the project's [port-mapping convention](docs/conventions/conventions/port-mapping.md).

### Accessing Services from Host

If you deploy a service in the Kind cluster with a NodePort, you can access it from your host machine:

```bash
# Inside VM: Get the NodePort
kubectl get svc

# From host: Access via forwarded port
curl http://localhost:8080  # If service is on port 80
```

## VM Specifications

- **Memory**: 4GB RAM
- **CPU**: 2 cores
- **Disk**: 20GB
- **OS**: NixOS (latest unstable)

## Advanced Usage

### Build Without Running

```bash
# Build the VM runner script
nix build .#vm

# The built VM will be in ./result/bin/run-nixos-vm
./result/bin/run-nixos-vm
```

### Build a Persistent QCOW2 Image

For a persistent VM that keeps state between reboots:

```bash
nix build .#qcow2
```

### Development Shell

Enter a development shell with all tools available:

```bash
nix develop

# This provides: qemu, kind, kubectl, helm
```

### Customize the VM

**Port Configuration**: Customize ports in `.env` (see [Port Forwarding](#port-forwarding) section above)

**VM Resources**: Edit `flake.nix` to customize:

1. **Memory/CPU**: Change `memorySize` and `cores` in the `virtualisation.vmVariant` section
2. **System Packages**: Add packages to `environment.systemPackages`
3. **Kind Configuration**: Modify the Kind config in the `kind-cluster` systemd service

### Disable Auto-Creation of Kind Cluster

If you want to manually create the Kind cluster, disable the systemd service:

```nix
# In flake.nix, remove or comment out the systemd.services.kind-cluster section
```

Then manually create the cluster inside the VM:

```bash
kind create cluster --name my-cluster
```

## Troubleshooting

### VM Won't Start

1. Ensure you have enough RAM (4GB required)
2. Check that KVM is available: `ls /dev/kvm`
3. Try without KVM: Edit flake.nix and add `virtualisation.qemu.options = [ "-cpu max" ];`

### Kind Cluster Not Created

Check the systemd service status inside the VM:

```bash
ssh nixos@localhost -p 2222
systemctl status kind-cluster
journalctl -u kind-cluster
```

### Docker Issues

```bash
# Inside VM
systemctl status docker
docker info
```

### Port Already in Use

If you get "port already in use" errors, customize the ports in your `.env` file:

```env
# Example: Change to different ports
KIND_SSH_PORT=2223
KIND_K8S_PORT=6444
KIND_HTTP_PORT=8081
KIND_HTTPS_PORT=8444
KIND_NODEPORT_PORT=30001
```

Then restart the VM:
```bash
make kind-vm-stop
make kind-vm-start
```

## Accessing Kubernetes from Host

To access the Kubernetes cluster from your host machine:

1. Copy the kubeconfig from the VM:

```bash
scp -P 2222 nixos@localhost:~/.kube/config ./kind-kubeconfig
```

2. Edit the kubeconfig to change the server address:

```bash
# Change from:
# server: https://127.0.0.1:6443
# To:
# server: https://localhost:6443

sed -i 's/127.0.0.1:6443/localhost:6443/g' kind-kubeconfig
```

3. Use it with kubectl:

```bash
export KUBECONFIG=./kind-kubeconfig
kubectl get nodes
```

## Installed Tools

The VM comes with these tools pre-installed:

- **Container Runtime**: Docker, containerd
- **Kubernetes**: Kind, kubectl, helm, k9s
- **Utilities**: curl, wget, git, jq, vim, htop

## Network Architecture

```
┌─────────────────────────────────────────────┐
│ Host Machine                                │
│                                             │
│  Ports: Configurable via .env              │
│  (Defaults: 2222, 6443, 8080, 8443, 30000) │
└─────────────┬───────────────────────────────┘
              │ Port Forwarding
┌─────────────▼───────────────────────────────┐
│ NixOS VM (kind-vm)                          │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Docker Daemon                       │    │
│  │                                     │    │
│  │  ┌──────────────────────────────┐  │    │
│  │  │ Kind Cluster                 │  │    │
│  │  │                              │  │    │
│  │  │  ┌────────────────────────┐  │  │    │
│  │  │  │ Kubernetes Control     │  │  │    │
│  │  │  │ Plane Container        │  │  │    │
│  │  │  └────────────────────────┘  │  │    │
│  │  │                              │  │    │
│  │  │  [Your workloads here]       │  │    │
│  │  └──────────────────────────────┘  │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Cleanup

To stop the VM, simply close the QEMU window or press Ctrl+C in the terminal where you started it.

The VM is ephemeral by default - all changes are lost when you stop it. Use the QCOW2 build if you need persistence.

## Integration with Catalyst Platform

This Kind VM can be used with the Catalyst platform for local development:

1. Start the Kind VM: `nix run .#vm`
2. Configure Catalyst to use the Kind cluster
3. Deploy preview environments to the local Kind cluster

To add the Kind cluster to Catalyst:

```bash
# Inside VM, get the kubeconfig
kind get kubeconfig --name kind

# Add this kubeconfig to your Catalyst platform
# via the web UI or database
```

## Developer Workflow Integration

The Kind VM integrates seamlessly with the existing Catalyst development workflow through automated scripts, Make targets, and repository-local kubeconfig management.

### Repository-Local Kubeconfig

The kubeconfig is stored at `.kube/config` (gitignored) within the project, ensuring:
- **Project Isolation**: No pollution of your global `~/.kube/config`
- **Team Consistency**: Everyone uses the same cluster configuration
- **Easy Cleanup**: Just delete `.kube/config` to reset

### Quick Start for Developers

#### 1. Automatic Setup (Recommended)

Run integration tests - the VM starts automatically if needed:

```bash
npm run test:integration:prpod
# or
make test-k8s
```

The `ensure-kind-vm` script will:
- Check if VM is running
- Start it if needed (waits up to 90s for boot)
- Extract kubeconfig to `.kube/config`
- Set environment variables for tests

#### 2. Manual Setup

Start the VM and configure kubectl manually:

```bash
# Start VM
make kind-vm-start

# Configure kubectl to use project kubeconfig
export KUBECONFIG=$(pwd)/.kube/config

# Verify cluster access
kubectl get nodes
```

### Make Commands

```bash
make kind-vm-start       # Start VM and automatically configure kubeconfig
make kind-vm-stop        # Stop VM
make kind-vm-status      # Check if VM is running

make test-k8s            # Run K8s integration tests (auto-starts VM)
make up-with-k8s         # Start VM + database + app services
make dev-with-k8s        # Start VM, show next steps
```

**Note**: `kind-vm-start` now automatically configures the kubeconfig, eliminating the need for a separate setup command.

### NPM Scripts

```bash
npm run test:integration:prpod   # Run PR pod integration tests (auto-starts VM)
npm run test:integration:k8s     # Run all K8s integration tests (auto-starts VM)
```

Both scripts use `ensure-kind-vm` to automatically start the VM if needed.

### Using kubectl and k9s

Once the VM is running and kubeconfig is configured:

```bash
# Set KUBECONFIG for your current shell
export KUBECONFIG=$(pwd)/.kube/config

# Use kubectl
kubectl get nodes
kubectl get pods -n default
kubectl apply -f my-manifest.yaml

# Use k9s for interactive cluster management
k9s
```

### direnv Integration (Optional)

If you use [direnv](https://direnv.net/), the `.envrc` file will automatically:
- Export `KUBECONFIG=$(pwd)/.kube/config`
- Set `KUBECONFIG_PRIMARY` for integration tests (base64 encoded)

Just run `direnv allow` once to enable.

### Development Workflows

#### Workflow 1: Run Integration Tests

```bash
# Automatic - VM starts if needed, kubeconfig configured automatically
npm run test:integration:prpod
```

#### Workflow 2: Full Development Environment

```bash
# Terminal 1: Start services
make dev-with-k8s
export KUBECONFIG=$(pwd)/.kube/config
make up

# Terminal 2: Monitor Kubernetes
k9s

# Terminal 3: Development
npm run dev
```

#### Workflow 3: Test PR Preview Locally

```bash
# Start VM and services
make up-with-k8s
export KUBECONFIG=$(pwd)/.kube/config

# Deploy your preview environment
kubectl create namespace preview-123
kubectl apply -f preview-manifest.yaml -n preview-123

# Port forward to access locally
kubectl port-forward svc/my-preview-app 3001:3000 -n preview-123

# Access at http://localhost:3001
```

#### Workflow 4: Manual Kubernetes Operations

```bash
# Start VM
make kind-vm-start

# Configure kubectl
export KUBECONFIG=$(pwd)/.kube/config

# Your K8s operations
kubectl create deployment test --image=nginx
kubectl expose deployment test --port=80 --type=NodePort
kubectl get svc

# Access via port forwarding from VM
curl http://localhost:8080  # If service is on port 80 in VM
```

### VS Code Integration

If using VS Code with the Kubernetes extension, it will automatically use `.kube/config` if you have the workspace settings configured (see `.vscode/settings.json`).

### Scripts

#### `scripts/ensure-kind-vm`

Python script that:
- Checks if Kind VM is accessible via SSH
- Starts VM in background if not running
- Waits up to 90s for VM to boot
- Configures kubeconfig via `kind-vm-setup.sh`
- Sets environment variables for current process

Used by npm test scripts and Make targets.

#### `scripts/kind-vm-setup.sh`

Bash script that:
- Fetches kubeconfig from VM via SSH
- Saves to `.kube/config`
- Prints instructions for exporting `KUBECONFIG`

Run manually if you need to refresh kubeconfig.

### Environment Variables

The integration uses these environment variables:

- **`KUBECONFIG`**: Path to `.kube/config` (for kubectl/k9s)
- **`KUBECONFIG_PRIMARY`**: Base64-encoded kubeconfig (for integration tests)

Integration tests automatically get `KUBECONFIG_PRIMARY` set by the `ensure-kind-vm` script.

### Troubleshooting Integration

#### "Kind VM not running"

```bash
# Check status
make kind-vm-status

# Start manually
make kind-vm-start
```

#### "Permission denied" on SSH

The VM may still be booting. Wait 10-20 more seconds and try again.

#### "kubeconfig not found"

```bash
# Re-fetch kubeconfig by restarting the VM
make kind-vm-stop
make kind-vm-start

# Or manually run the setup script
./scripts/kind-vm-setup.sh
```

#### Integration tests can't find cluster

Ensure `KUBECONFIG_PRIMARY` is set:

```bash
export KUBECONFIG_PRIMARY=$(base64 -w 0 .kube/config)
npm run test:integration:prpod
```

Or just use the test scripts which set it automatically:

```bash
npm run test:integration:prpod  # This handles it for you
```

#### kubectl commands fail

```bash
# Make sure KUBECONFIG is set
export KUBECONFIG=$(pwd)/.kube/config

# Verify
echo $KUBECONFIG

# Test connection
kubectl get nodes
```

### CI/CD Considerations

The Kind VM is designed for **local development only**. CI/CD pipelines should use Kind directly (not the VM):

```yaml
# GitHub Actions example
- name: Setup Kind
  run: |
    kind create cluster --wait 5m
    kind get kubeconfig > /tmp/kubeconfig
    echo "KUBECONFIG_PRIMARY=$(base64 -w 0 /tmp/kubeconfig)" >> $GITHUB_ENV

- name: Run Integration Tests
  run: npm run test:integration:prpod
```

The `ensure-kind-vm` script is **only called by local development workflows** (npm scripts, Make targets), not by CI.

## Further Reading

- [Kind Documentation](https://kind.sigs.k8s.io/)
- [NixOS Manual](https://nixos.org/manual/nixos/stable/)
- [NixOS VM Tests](https://nixos.org/manual/nixos/stable/#sec-nixos-tests)

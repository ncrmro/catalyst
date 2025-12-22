# K3s VM Agents Context

## Purpose

This directory contains the configuration and runtime files for the local K3s development VM. The VM provides a lightweight Kubernetes cluster for local development and integration testing.

## Architecture

### VM Management Script (`bin/k3s-vm`)

A Python script that manages the full VM lifecycle using NixOS and QEMU:

- Builds a NixOS VM with K3s pre-configured
- Manages port forwarding for K3s API (6443), SSH (2666), and web app (from `WEB_PORT` in `.env`)
- Extracts kubeconfig and updates `web/.env` for integration tests
- Applies Kubernetes manifests from `.k3s-vm/manifests/base.json`

### Key Files

- `flake.nix` - Alternative microVM configuration (not currently used by main script)
- `manifests/base.json` - Kubernetes resources applied to the cluster
- `vm/` - Runtime directory (configuration.nix, disk images, result symlink)
- `vm.log` - QEMU stdout/stderr for debugging
- `vm.pid` - PID file for the running VM process

## Common Operations

```bash
bin/k3s-vm              # Build and start VM (or just start if already built)
bin/k3s-vm stop         # Stop the VM
bin/k3s-vm status       # Check VM status
bin/k3s-vm ssh          # SSH into the VM
bin/k3s-vm reset        # Destroy and rebuild VM from scratch
bin/k3s-vm apply        # Update manifests without rebuilding VM
bin/kubectl get nodes   # Uses kubeconfig from web/.kube/config
```

## Troubleshooting

### Port Conflicts

The VM requires these ports to be available:

- **6443**: K3s API server
- **2666**: SSH access to VM
- **WEB_PORT** (from `.env`): Web app NodePort

**Symptom**: `Could not set up host forwarding rule 'tcp::6443-:6443'` in `vm.log`

**Cause**: Orphaned QEMU process from a previous VM run holding the port.

**Solution**: The `find_vm_processes()` function in `bin/k3s-vm` detects orphans by:

1. Process name pattern: `pgrep -f "qemu.*-name k3s-vm"`
2. Port usage: `lsof -t -i :6443` and `lsof -t -i :2666`

Running `bin/k3s-vm reset` will kill orphaned processes before starting a new VM.

**Manual fix**:

```bash
# Find what's using port 6443
lsof -i :6443

# Kill the orphaned process
kill <PID>

# Then reset
bin/k3s-vm reset
```

### SSH Connection Refused

**Symptom**: `ssh: connect to host localhost port 2666: Connection refused`

**Causes**:

1. VM failed to start (check `vm.log` for QEMU errors)
2. Port conflict prevented VM from binding ports
3. VM is still booting (wait for SSH readiness)

**Debug**:

```bash
bin/k3s-vm --debug reset   # Enable verbose output
tail -f .k3s-vm/vm.log     # Watch VM boot log
```

### VM Not Starting

Check the VM log for QEMU errors:

```bash
cat .k3s-vm/vm.log
```

Common issues:

- KVM not available (need hardware virtualization)
- Port conflicts (see above)
- Nix build failures (check nix-build output)

## Port Configuration

The SSH port was changed from 2222 to 2666 to avoid conflicts with other services. If changing ports:

1. Update `bin/k3s-vm` line ~475 (forward_ports list)
2. Update all SSH commands in the script that use `-p` flag
3. Run `bin/k3s-vm reset` to rebuild with new configuration

## Integration with Web App

The VM automatically:

1. Extracts kubeconfig to `web/.kube/config`
2. Creates symlink `web/kubeconfig.yaml` -> `.kube/config`
3. Updates `web/.env` with:
   - `KUBECONFIG=./kubeconfig.yaml`
   - `KUBECONFIG_PRIMARY=<base64-encoded-json-kubeconfig>`
4. Injects environment variables from `web/.env` into Kubernetes deployments

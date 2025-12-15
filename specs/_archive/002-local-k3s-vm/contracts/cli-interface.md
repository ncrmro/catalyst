# CLI Interface Contract

**Feature**: Local K3s Development VM (002-local-k3s-vm)
**Date**: 2025-11-14

## Overview

This document defines the command-line interface contract for the K3s VM management scripts. Since this is infrastructure tooling (not a web API), the "contract" describes the CLI commands, arguments, exit codes, and output formats.

## Scripts

### 1. bin/k3s-vm

**Purpose**: Manage K3s VM lifecycle (create, start, stop, status, reset)

**Location**: `bin/k3s-vm`

**Shebang**: `#!/usr/bin/env bash`

**Usage**:

```
bin/k3s-vm <subcommand> [options]
```

#### Subcommands

##### setup

**Purpose**: Create and initialize a new K3s VM

**Usage**:

```
bin/k3s-vm setup [--cpus N] [--memory MB] [--disk GB]
```

**Options**:

- `--cpus N`: Number of CPU cores (default: 2)
- `--memory MB`: Memory in MB (default: 4096)
- `--disk GB`: Disk size in GB (default: 20)

**Behavior**:

1. Validate dependencies (virsh, virt-install, kubectl, qemu-img, libvirt daemon)
2. Check if VM already exists (error if yes)
3. Generate VM name from project directory
4. Download Ubuntu cloud image if not cached
5. Create overlay disk image
6. Generate SSH keypair if not exists
7. Create cloud-init configuration
8. Create VM via virt-install with cloud-init
9. Wait for VM to boot and K3s to be ready
10. Extract kubeconfig from VM
11. Update kubeconfig server URL to VM IP
12. Save kubeconfig to web/.kube/config
13. Save VM configuration to .k3s-vm/config

**Exit Codes**:

- `0`: Success
- `1`: Missing dependencies
- `2`: VM already exists
- `3`: VM creation failed
- `4`: K3s installation failed
- `5`: Kubeconfig extraction failed

**Output**:

```
✓ Dependencies validated
✓ VM name: catalyst-k3s-catalyst
✓ Downloading Ubuntu cloud image...
✓ Creating VM disk image (20GB)...
✓ Generating cloud-init configuration...
✓ Creating VM (2 CPUs, 4096MB RAM)...
✓ Waiting for VM to boot...
✓ Waiting for K3s to be ready...
✓ Extracting kubeconfig...
✓ K3s VM setup complete!

VM IP: 192.168.122.100
Kubeconfig: web/.kube/config

Try: bin/kubectl get nodes
```

**Error Output Examples**:

```
ERROR: virsh command not found
Install with: sudo apt install libvirt-clients

ERROR: VM 'catalyst-k3s-catalyst' already exists
Run 'bin/k3s-vm reset' to remove it first

ERROR: Failed to create VM
Check libvirt daemon: sudo systemctl status libvirtd
```

---

##### start

**Purpose**: Start a stopped K3s VM

**Usage**:

```
bin/k3s-vm start
```

**Options**: None

**Behavior**:

1. Load VM configuration from .k3s-vm/config
2. Check VM state (error if undefined or already running)
3. Start VM via `virsh start`
4. Wait for VM to be accessible
5. Verify K3s API is responding

**Exit Codes**:

- `0`: Success
- `1`: VM not found (never created)
- `2`: VM already running
- `3`: VM start failed
- `4`: K3s API not responding after timeout

**Output**:

```
✓ Starting VM 'catalyst-k3s-catalyst'...
✓ VM started successfully
✓ K3s API is responding

VM IP: 192.168.122.100

Try: bin/kubectl get nodes
```

**Error Output Examples**:

```
ERROR: VM 'catalyst-k3s-catalyst' not found
Run 'bin/k3s-vm setup' first

ERROR: VM already running
```

---

##### stop

**Purpose**: Gracefully stop a running K3s VM

**Usage**:

```
bin/k3s-vm stop [--force]
```

**Options**:

- `--force`: Force shutdown (destroy) instead of graceful shutdown

**Behavior**:

1. Load VM configuration
2. Check VM state (error if undefined or already stopped)
3. Shutdown VM via `virsh shutdown` (or `virsh destroy` if --force)
4. Wait for VM to stop (timeout: 60 seconds)

**Exit Codes**:

- `0`: Success
- `1`: VM not found
- `2`: VM already stopped
- `3`: VM stop failed
- `4`: VM stop timed out (use --force)

**Output**:

```
✓ Stopping VM 'catalyst-k3s-catalyst'...
✓ VM stopped successfully

Run 'bin/k3s-vm start' to restart
```

**Error Output Examples**:

```
ERROR: VM 'catalyst-k3s-catalyst' not found
Run 'bin/k3s-vm setup' first

ERROR: VM already stopped

WARNING: VM stop timed out after 60 seconds
Use 'bin/k3s-vm stop --force' to force shutdown
```

---

##### status

**Purpose**: Display VM and K3s cluster status

**Usage**:

```
bin/k3s-vm status [--verbose]
```

**Options**:

- `--verbose`: Show detailed VM information

**Behavior**:

1. Load VM configuration (or detect VM if config missing)
2. Query VM state via `virsh domstate`
3. If running, get VM IP and test K3s API
4. Display status information

**Exit Codes**:

- `0`: VM exists and status retrieved
- `1`: VM not found

**Output (running)**:

```
K3s VM Status:
  Name: catalyst-k3s-catalyst
  State: running
  IP: 192.168.122.100
  CPUs: 2
  Memory: 4096 MB
  Disk: 20 GB

K3s Cluster:
  API: ✓ responding
  Version: v1.28.3+k3s1
  Nodes: 1 ready

Kubeconfig: web/.kube/config
```

**Output (stopped)**:

```
K3s VM Status:
  Name: catalyst-k3s-catalyst
  State: shut off
  CPUs: 2
  Memory: 4096 MB
  Disk: 20 GB

Run 'bin/k3s-vm start' to start the VM
```

**Output (not found)**:

```
K3s VM Status:
  State: not found

Run 'bin/k3s-vm setup' to create the VM
```

**Verbose Output**:

```
[same as above, plus:]

VM Details:
  UUID: 12345678-1234-1234-1234-123456789012
  Created: 2025-11-14 10:30:00
  Disk image: /var/lib/libvirt/images/catalyst-k3s-catalyst.qcow2
  Disk usage: 5.2 GB / 20 GB

Network:
  Interface: default (NAT)
  MAC: 52:54:00:12:34:56
  IP: 192.168.122.100
```

---

##### reset

**Purpose**: Destroy VM and remove all associated resources

**Usage**:

```
bin/k3s-vm reset [--yes]
```

**Options**:

- `--yes`: Skip confirmation prompt

**Behavior**:

1. Prompt for confirmation (unless --yes)
2. Stop VM if running
3. Undefine VM and remove disk image
4. Delete kubeconfig (web/.kube/config)
5. Preserve .k3s-vm/config for potential recreation

**Exit Codes**:

- `0`: Success
- `1`: User cancelled
- `2`: VM not found (nothing to reset)
- `3`: Reset failed

**Output**:

```
WARNING: This will permanently delete the VM and all K3s cluster data

Are you sure you want to reset the K3s VM? (yes/no): yes

✓ Stopping VM...
✓ Removing VM definition...
✓ Removing disk image...
✓ Removing kubeconfig...
✓ Reset complete

Run 'bin/k3s-vm setup' to create a new VM
```

**Error Output Examples**:

```
ERROR: VM 'catalyst-k3s-catalyst' not found
Nothing to reset
```

---

#### General Options (all subcommands)

- `-h, --help`: Show help message
- `-v, --verbose`: Enable verbose output
- `--debug`: Enable debug logging
- `--version`: Show script version

#### Environment Variables

- `VM_NAME`: Override default VM name
- `DEBUG`: Enable debug output (same as --debug)
- `LOG_FILE`: Path to log file (default: /tmp/k3s-vm.log)

---

### 2. bin/kubectl

**Purpose**: Wrapper script for kubectl that uses local K3s cluster

**Location**: `bin/kubectl`

**Shebang**: `#!/usr/bin/env bash`

**Usage**:

```
bin/kubectl [kubectl arguments...]
```

**Behavior**:

1. Check if web/.kube/config exists (error if not)
2. Export KUBECONFIG=web/.kube/config
3. Execute system kubectl with all passed arguments

**Exit Codes**:

- Same as kubectl (passes through exit code)
- `1`: Kubeconfig not found (before invoking kubectl)

**Output**:

```
[passes through kubectl output unchanged]
```

**Error Output**:

```
ERROR: Kubeconfig not found: web/.kube/config
Run 'bin/k3s-vm setup' first
```

**Implementation**:

```bash
#!/usr/bin/env bash
set -euo pipefail

KUBECONFIG_PATH="$(dirname "$0")/../web/.kube/config"

if [[ ! -f "$KUBECONFIG_PATH" ]]; then
    echo "ERROR: Kubeconfig not found: web/.kube/config" >&2
    echo "Run 'bin/k3s-vm setup' first" >&2
    exit 1
fi

export KUBECONFIG="$KUBECONFIG_PATH"
exec kubectl "$@"
```

---

### 3. bin/k9s

**Purpose**: Wrapper script for k9s that uses local K3s cluster

**Location**: `bin/k9s`

**Shebang**: `#!/usr/bin/env bash`

**Usage**:

```
bin/k9s [k9s arguments...]
```

**Behavior**:

1. Check if web/.kube/config exists (error if not)
2. Export KUBECONFIG=web/.kube/config
3. Execute system k9s with all passed arguments

**Exit Codes**:

- Same as k9s (passes through exit code)
- `1`: Kubeconfig not found (before invoking k9s)

**Output**:

```
[launches k9s TUI]
```

**Error Output**:

```
ERROR: Kubeconfig not found: web/.kube/config
Run 'bin/k3s-vm setup' first

ERROR: k9s command not found
Install with: [platform-specific install command]
```

**Implementation**:

```bash
#!/usr/bin/env bash
set -euo pipefail

KUBECONFIG_PATH="$(dirname "$0")/../web/.kube/config"

if [[ ! -f "$KUBECONFIG_PATH" ]]; then
    echo "ERROR: Kubeconfig not found: web/.kube/config" >&2
    echo "Run 'bin/k3s-vm setup' first" >&2
    exit 1
fi

if ! command -v k9s &> /dev/null; then
    echo "ERROR: k9s command not found" >&2
    echo "Install with: [show platform-specific command]" >&2
    exit 1
fi

export KUBECONFIG="$KUBECONFIG_PATH"
exec k9s "$@"
```

---

## Exit Code Summary

| Exit Code | Meaning                                                    |
| --------- | ---------------------------------------------------------- |
| 0         | Success                                                    |
| 1         | General error (missing dependencies, VM not found, etc.)   |
| 2         | Invalid state (VM already exists, already running/stopped) |
| 3         | Operation failed (creation, start, stop, reset failed)     |
| 4         | Timeout or service not responding                          |
| 5         | Data extraction/manipulation failed                        |

## Output Format

### Standard Output (stdout)

- Success messages prefixed with `✓`
- Informational messages (no prefix)
- Structured output (status command)

### Standard Error (stderr)

- Error messages prefixed with `ERROR:`
- Warning messages prefixed with `WARNING:`
- Debug messages prefixed with `DEBUG:` (only if --debug)

### Logging

- All output also logged to file (default: /tmp/k3s-vm.log)
- Log format: `[YYYY-MM-DD HH:MM:SS] LEVEL: message`
- Rotation: Manual (logs not automatically rotated)

## Validation Rules

### Input Validation

- VM name: alphanumeric + dash only, max 64 chars
- CPUs: integer >= 1
- Memory: integer >= 2048 (MB)
- Disk: integer >= 10 (GB)
- Subcommand: must be one of {setup, start, stop, status, reset}

### Dependency Validation

Required before any operation:

- `virsh` command available
- `virt-install` command available (setup only)
- `qemu-img` command available (setup only)
- `kubectl` command available
- libvirt daemon running (`systemctl is-active libvirtd`)

### State Validation

- setup: VM must not exist
- start: VM must exist and be stopped
- stop: VM must exist and be running
- status: VM must exist (or detect not found)
- reset: No state requirement (safe to run anytime)

## Compatibility

- **Shell**: Bash 4.0+ (uses bash-specific features: arrays, [[]], process substitution)
- **OS**: Linux with libvirt/KVM support
- **Architecture**: x86_64 (VM uses x86_64 cloud images)

## Future Enhancements (Out of Scope)

- `bin/k3s-vm configure`: Modify VM resources (CPUs, memory, disk)
- `bin/k3s-vm logs`: View VM console logs
- `bin/k3s-vm ssh`: SSH into VM
- `bin/k3s-vm snapshot`: Create/restore VM snapshots
- `bin/k3s-vm upgrade`: Upgrade K3s version
- JSON output format (`--json` flag)
- Multiple VM support (--name flag)

# Data Model: Local K3s Development VM

**Feature**: Local K3s Development VM (002-local-k3s-vm)
**Date**: 2025-11-14

## Overview

This feature is infrastructure tooling (shell scripts) rather than an application with a traditional database schema. The "data model" consists of configuration files, VM state tracked by libvirt, and kubeconfig files stored in the project directory.

## Entities

### 1. VM Configuration

**Location**: `.k3s-vm/config` (project directory, gitignored)

**Purpose**: Store VM resource allocation and naming configuration

**Format**: Bash-sourceable key-value pairs

**Schema**:

```bash
VM_NAME="catalyst-k3s-<project-name>"    # Unique VM identifier
VM_CPUS=2                                 # Number of CPU cores
VM_MEMORY=4096                            # Memory in MB
VM_DISK=20                                # Disk size in GB
```

**Validation Rules**:

- `VM_NAME`: Must be unique across system (checked via `virsh list --all`)
- `VM_CPUS`: Positive integer, recommended minimum 2
- `VM_MEMORY`: Positive integer in MB, minimum 2048 (2GB), recommended 4096 (4GB)
- `VM_DISK`: Positive integer in GB, minimum 10, recommended 20

**Lifecycle**:

- Created during `bin/k3s-vm setup`
- Read by all commands to get VM configuration
- Can be modified manually or via future `configure` subcommand
- Not deleted by `reset` (preserves config for recreation)

**State Transitions**: N/A (static configuration file)

### 2. VM State (tracked by libvirt)

**Location**: libvirt system storage (managed by virsh/libvirt)

**Purpose**: Track VM lifecycle state and resources

**Schema** (libvirt domain):

```xml
<domain type='kvm'>
  <name>catalyst-k3s-<project-name></name>
  <memory unit='MiB'>4096</memory>
  <vcpu>2</vcpu>
  <os><type arch='x86_64'>hvm</type></os>
  <devices>
    <disk type='file' device='disk'>
      <source file='/var/lib/libvirt/images/<vm-name>.qcow2'/>
      ...
    </disk>
  </devices>
</domain>
```

**State Values**:

- `running`: VM is active and K3s cluster is accessible
- `shut off`: VM is stopped, state persisted to disk
- `paused`: VM execution suspended (rare, not primary use case)
- `undefined`: VM does not exist (removed/never created)

**State Transitions**:

```
undefined --[setup]--> shut off
shut off  --[start]--> running
running   --[stop]---> shut off
*         --[reset]--> undefined
```

**Validation Rules**:

- Cannot start undefined VM (error: run `setup` first)
- Cannot stop already stopped VM (error: already stopped)
- Cannot setup when VM already exists (error: already exists, use `reset` first)

**Querying State**:

```bash
# Get VM state
virsh domstate "$VM_NAME" 2>/dev/null || echo "undefined"

# Get full VM info
virsh dominfo "$VM_NAME"
```

### 3. Kubeconfig File

**Location**: `web/.kube/config` (project directory, gitignored)

**Purpose**: Store K3s cluster credentials and connection details

**Format**: YAML (Kubernetes kubeconfig standard)

**Schema**:

```yaml
apiVersion: v1
kind: Config
clusters:
  - cluster:
      certificate-authority-data: <base64-cert>
      server: https://<vm-ip>:6443
    name: default
contexts:
  - context:
      cluster: default
      user: default
    name: default
current-context: default
users:
  - name: default
    user:
      client-certificate-data: <base64-cert>
      client-key-data: <base64-key>
```

**Validation Rules**:

- Must be valid YAML with Kubernetes kubeconfig structure
- Server URL must point to VM IP address (not 127.0.0.1)
- Certificates must be valid base64-encoded data

**Lifecycle**:

- Created during `bin/k3s-vm setup` after K3s installation
- Extracted from VM via SSH: `ssh ubuntu@<vm-ip> "sudo cat /etc/rancher/k3s/k3s.yaml"`
- Server URL updated to use VM IP instead of localhost
- Never modified by `start`/`stop` (persists across VM restarts)
- Deleted by `reset` along with VM

**State Transitions**: N/A (static credential file, regenerated on setup)

**Usage**:

- `bin/kubectl` wrapper sets `KUBECONFIG=web/.kube/config` before invoking kubectl
- `bin/k9s` wrapper sets `KUBECONFIG=web/.kube/config` before invoking k9s

### 4. Cloud-init Configuration (temporary)

**Location**: `/tmp/k3s-vm-cloud-init-*.yaml` (temporary files during setup)

**Purpose**: Configure VM initialization (user, packages, K3s installation)

**Format**: YAML (cloud-init standard)

**Schema**:

```yaml
#cloud-config
users:
  - name: ubuntu
    ssh_authorized_keys:
      - <ssh-public-key>
    sudo: ALL=(ALL) NOPASSWD:ALL

packages:
  - curl

runcmd:
  - curl -sfL https://get.k3s.io | sh -
  - sleep 30 # Wait for K3s to start
  - sudo cat /etc/rancher/k3s/k3s.yaml > /tmp/kubeconfig
```

**Lifecycle**:

- Generated during `bin/k3s-vm setup`
- Used by `virt-install` to initialize VM
- Deleted after VM creation (cleanup trap)
- Not persisted beyond initial setup

**Validation Rules**:

- SSH public key must exist (generated if missing)
- runcmd must install K3s and export kubeconfig

### 5. VM Disk Image

**Location**: `/var/lib/libvirt/images/<vm-name>.qcow2` (libvirt default storage pool)

**Purpose**: Persistent storage for VM filesystem and K3s cluster data

**Format**: QCOW2 (QEMU Copy-On-Write version 2)

**Schema**: Binary disk image format (managed by libvirt/QEMU)

**Size**: Configured via `VM_DISK` (default 20GB)

**Lifecycle**:

- Created during `bin/k3s-vm setup` as overlay image from Ubuntu cloud image
- Base image: Ubuntu 22.04 cloud image (downloaded once, reused)
- Overlay image: `qemu-img create -f qcow2 -F qcow2 -b <base-image> <vm-name>.qcow2 20G`
- Persists across start/stop (all K3s data preserved)
- Deleted by `reset` command (`virsh undefine --remove-all-storage`)

**State Transitions**: N/A (binary file, state managed by VM running/stopped)

## Relationships

```
VM Configuration (.k3s-vm/config)
    |
    | defines
    v
VM State (libvirt domain) --<creates>--> VM Disk Image (qcow2)
    |
    | runs
    v
K3s Cluster (inside VM) --<produces>--> Kubeconfig (web/.kube/config)
```

## File System Layout

```
project-root/
├── bin/
│   ├── k3s-vm          # Manages VM and configuration
│   ├── kubectl         # Wrapper: KUBECONFIG=web/.kube/config kubectl "$@"
│   └── k9s             # Wrapper: KUBECONFIG=web/.kube/config k9s "$@"
├── .k3s-vm/
│   └── config          # VM configuration (gitignored)
└── web/
    └── .kube/
        └── config      # Kubeconfig (gitignored)

/var/lib/libvirt/images/
└── <vm-name>.qcow2     # VM disk image (system storage)

/tmp/
└── k3s-vm-cloud-init-<random>.yaml  # Temporary cloud-init (deleted after setup)
```

## Configuration Defaults

| Parameter   | Default Value               | Configurable | Validation                  |
| ----------- | --------------------------- | ------------ | --------------------------- |
| VM_NAME     | catalyst-k3s-<project-name> | Yes          | Unique, alphanumeric + dash |
| VM_CPUS     | 2                           | Yes          | Positive integer ≥ 1        |
| VM_MEMORY   | 4096 MB                     | Yes          | Integer ≥ 2048              |
| VM_DISK     | 20 GB                       | Yes          | Integer ≥ 10                |
| Kubeconfig  | web/.kube/config            | No           | Valid kubeconfig YAML       |
| Cloud Image | Ubuntu 22.04 LTS cloud img  | No           | Downloaded from Ubuntu      |
| K3s Version | latest stable               | No (future)  | Installed via get.k3s.io    |

## Data Persistence

### Across VM Stop/Start

- ✅ VM disk image persists (K3s cluster data intact)
- ✅ Kubeconfig persists (no regeneration needed)
- ✅ VM configuration persists (.k3s-vm/config unchanged)
- ✅ Deployments, pods, services persist (stored in VM disk)

### Across VM Reset

- ❌ VM disk image deleted
- ❌ Kubeconfig deleted
- ✅ VM configuration preserved (can recreate with same settings)
- ❌ All K3s cluster data lost (intentional - full reset)

### Across Host Reboot

- ✅ VM definition persists (libvirt autostart disabled by default)
- ✅ VM disk image persists
- ✅ Kubeconfig persists
- ⚠️ VM not started automatically (must run `bin/k3s-vm start`)

## Security Considerations

1. **Kubeconfig Isolation**: Stored in project directory, never merged into global ~/.kube/config
2. **SSH Keys**: Generated for VM access, stored in ~/.ssh/ with proper permissions (600)
3. **VM Network**: Uses NAT, VM not exposed to external network
4. **K3s API**: Accessible only from host via VM IP (not 0.0.0.0)
5. **Gitignore**: All sensitive files (.k3s-vm/config, web/.kube/config) excluded from version control

## Error States and Recovery

| Error State                | Detection                           | Recovery                                   |
| -------------------------- | ----------------------------------- | ------------------------------------------ |
| VM exists but stopped      | `virsh domstate` returns "shut off" | `bin/k3s-vm start`                         |
| VM exists but corrupted    | `virsh dominfo` fails               | `bin/k3s-vm reset` then `bin/k3s-vm setup` |
| Kubeconfig missing         | File doesn't exist                  | Regenerate via SSH from VM                 |
| Kubeconfig invalid         | `kubectl` fails to connect          | Regenerate via SSH from VM                 |
| Config file missing        | Defaults used                       | Recreate via `bin/k3s-vm setup` (saves)    |
| Libvirt daemon not running | `systemctl is-active libvirtd` no   | `sudo systemctl start libvirtd`            |
| Insufficient disk space    | `qemu-img create` fails             | Free up space, then retry                  |

## Future Enhancements (Out of Scope)

- Multi-node K3s clusters (current scope: single VM)
- Custom K3s versions (current scope: latest stable)
- VM snapshots/backups (rely on libvirt's snapshot feature)
- Resource monitoring dashboard (use k9s or kubectl top)
- Automatic VM startup on host boot (use libvirt autostart feature)

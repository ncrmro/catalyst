# Research: Local K3s Development VM

**Feature**: Local K3s Development VM (002-local-k3s-vm)
**Date**: 2025-11-14
**Purpose**: Resolve technical unknowns identified in implementation plan

## Research Topics

### 1. Shell Script Testing Strategy

**Decision**: Use **BATS (Bash Automated Testing System)** with function-based code organization

**Rationale**:

- BATS is the most mature and widely adopted bash testing framework (active community at bats-core)
- TAP-compliant output integrates well with CI/CD systems (GitHub Actions, Jenkins)
- Supports setup/teardown functions for test isolation
- Can achieve >80% coverage requirement by structuring scripts as testable functions
- Active development and good documentation (bats-core.readthedocs.io as of 2025)

**Alternatives Considered**:

- **shunit2**: xUnit-style but less active community, fewer modern features
- **shellspec**: BDD-style syntax but adds complexity for simple shell scripts
- **Manual testing**: Cannot provide measurable coverage metrics required by constitution

**Implementation Notes**:

- Structure scripts with small, testable functions (not monolithic main blocks)
- Use `source` to load script functions in test files
- Mock system commands (virsh, kubectl) using function stubs in tests
- Coverage strategy: Break bin/k3s-vm into functions like `vm_create()`, `vm_start()`, `vm_stop()`, `validate_dependencies()`
- Test file location: `tests/e2e/k3s-vm.test.sh` (or similar structure)
- CI integration: Add BATS tests to GitHub Actions/CI pipeline

**Coverage Achievement**:

- Recent 2025 guidance: "Move all code from main script body into functions"
- Each function becomes independently testable
- Setup/teardown functions create/cleanup test VMs in isolated environment
- Use `@test` blocks for each scenario from spec (setup, start, stop, status, reset)

### 2. libvirt VM Provisioning with K3s

**Decision**: Use **cloud-init with Ubuntu cloud images** for VM creation and K3s installation

**Rationale**:

- Cloud images are pre-built, minimal, and optimized for automation
- cloud-init is the standard for VM initialization (user accounts, SSH, packages, networking)
- Near-native performance with KVM/QEMU/libvirt stack
- Well-documented workflow: cloud image → qemu-img overlay → cloud-init config → virt-install
- Proven approach for K3s clusters (multiple production examples found)

**Alternatives Considered**:

- **Manual OS installation**: Too slow, violates <5 minute setup requirement
- **Pre-built K3s images**: Custom images harder to maintain, update, and trust
- **virt-customize**: Additional complexity, cloud-init more standard

**Implementation Notes**:

#### VM Image Creation

```bash
# Download Ubuntu cloud image (backing image)
wget https://cloud-images.ubuntu.com/releases/22.04/release/ubuntu-22.04-server-cloudimg-amd64.img

# Create overlay image (preserves backing image)
qemu-img create -f qcow2 -F qcow2 -b ubuntu-22.04-server-cloudimg-amd64.img k3s-vm.qcow2 20G
```

#### Network Configuration

- **Decision**: Use libvirt default NAT network
- Rationale: Simplest setup, VM gets DHCP IP, host can access via VM IP
- Find VM IP: `virsh net-dhcp-leases default`
- K3s API accessible at `https://<vm-ip>:6443`

#### K3s Installation via cloud-init

```yaml
#cloud-config
users:
  - name: ubuntu
    ssh_authorized_keys:
      - <ssh-pub-key>
    sudo: ALL=(ALL) NOPASSWD:ALL

packages:
  - curl

runcmd:
  - curl -sfL https://get.k3s.io | sh -
  - sleep 30 # Wait for K3s to be ready
  - sudo cat /etc/rancher/k3s/k3s.yaml > /tmp/kubeconfig
```

#### Kubeconfig Extraction

- **Decision**: Use SSH to retrieve kubeconfig from VM
- Method: `ssh ubuntu@<vm-ip> "sudo cat /etc/rancher/k3s/k3s.yaml" > web/.kube/config`
- Update server URL in kubeconfig to use VM IP instead of localhost
- Security: kubeconfig stored in project directory, never in global ~/.kube/config

#### VM Persistence

- **Decision**: Use persistent qcow2 disk images managed by libvirt
- Location: Libvirt default storage pool (usually /var/lib/libvirt/images/)
- VM definition persists via virsh (survives host reboots)
- Stop preserves all state; start resumes from stopped state

#### VM Naming/Identification

- **Decision**: Use project-specific VM names derived from directory path
- Pattern: `catalyst-k3s-<sanitized-project-name>`
- Example: `/home/user/code/catalyst` → `catalyst-k3s-catalyst`
- Prevents conflicts when multiple projects use local VMs
- Command: `virsh list --all` shows all VMs with unique names

**Useful Commands**:

```bash
# List all VMs
virsh list --all

# Get VM IP address
virsh net-dhcp-leases default

# Remove VM completely (with disk)
virsh destroy <vm-name>
virsh undefine <vm-name> --remove-all-storage

# Check VM status
virsh dominfo <vm-name>
```

### 3. Shell Script Best Practices

**Decision**: Use **strict mode, trap for cleanup, and git-style subcommands**

**Rationale**:

- Strict mode (`set -euo pipefail`) catches errors early, mandatory for production scripts
- `trap` ensures cleanup happens even on errors (remove temp files, stop VMs)
- Git-style subcommands familiar to developers, clean CLI pattern
- ShellCheck integration non-negotiable in 2025 DevOps workflows
- Google style guide recommends keeping scripts under 50 lines (encourages functions)

**Alternatives Considered**:

- **POSIX sh**: More portable but loses bash features (arrays, better error handling)
- **No strict mode**: Too error-prone for DevOps automation
- **Single monolithic script**: Fails testability and maintainability requirements

**Implementation Patterns**:

#### Error Handling

```bash
#!/usr/bin/env bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Trap for cleanup
cleanup() {
    echo "Error occurred, cleaning up..."
    # Remove temp files, stop VMs, etc.
}
trap cleanup ERR

# Custom error function
error() {
    echo "ERROR: $1" >&2
    exit 1
}

# Usage
command || error "Command failed with actionable suggestion"
```

#### Dependency Validation

```bash
validate_dependencies() {
    local deps=("virsh" "virt-install" "kubectl" "qemu-img")
    local missing=()

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Missing dependencies: ${missing[*]}\nInstall with: sudo apt install libvirt-daemon-system libvirt-clients qemu-kvm kubectl"
    fi

    # Check libvirt daemon running
    if ! systemctl is-active --quiet libvirtd; then
        error "libvirt daemon not running. Start with: sudo systemctl start libvirtd"
    fi
}
```

#### Subcommand Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

# Subcommand implementations as functions
cmd_setup() {
    echo "Setting up K3s VM..."
    # Implementation
}

cmd_start() {
    echo "Starting K3s VM..."
    virsh start "$VM_NAME" || error "Failed to start VM"
}

cmd_stop() {
    echo "Stopping K3s VM..."
    virsh shutdown "$VM_NAME" || error "Failed to stop VM"
}

cmd_status() {
    echo "K3s VM Status:"
    virsh dominfo "$VM_NAME" 2>/dev/null || echo "VM not found"
}

cmd_reset() {
    echo "Resetting K3s VM (this will delete all data)..."
    read -p "Are you sure? (yes/no): " confirm
    [[ "$confirm" == "yes" ]] || exit 0

    virsh destroy "$VM_NAME" 2>/dev/null || true
    virsh undefine "$VM_NAME" --remove-all-storage || error "Failed to remove VM"
}

# Main dispatcher
main() {
    case "${1:-}" in
        setup|start|stop|status|reset)
            "cmd_$1" "${@:2}"
            ;;
        *)
            echo "Usage: $0 {setup|start|stop|status|reset}"
            exit 1
            ;;
    esac
}

main "$@"
```

#### Configuration Management

```bash
# Store VM config in project directory
CONFIG_DIR="$(dirname "$0")/../.k3s-vm"
CONFIG_FILE="$CONFIG_DIR/config"

# Default configuration
VM_NAME="catalyst-k3s-$(basename "$(pwd)")"
VM_CPUS=2
VM_MEMORY=4096  # MB
VM_DISK=20      # GB

# Load config if exists
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Save config function
save_config() {
    mkdir -p "$CONFIG_DIR"
    cat > "$CONFIG_FILE" <<EOF
VM_NAME="$VM_NAME"
VM_CPUS=$VM_CPUS
VM_MEMORY=$VM_MEMORY
VM_DISK=$VM_DISK
EOF
}
```

#### Logging and Diagnostics

```bash
# Logging levels
LOG_FILE="${LOG_FILE:-/tmp/k3s-vm.log}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

debug() {
    [[ "${DEBUG:-}" == "1" ]] && log "DEBUG: $1"
}

info() {
    log "INFO: $1"
}

error() {
    log "ERROR: $1" >&2
    exit 1
}

# Usage
info "Starting VM setup..."
debug "VM name: $VM_NAME"
```

#### POSIX Compatibility

**Decision**: Use bash-specific features, document bash requirement

**Rationale**:

- Arrays and associative arrays essential for managing multiple values
- `[[ ]]` test syntax more robust than `[ ]`
- Process substitution useful for complex operations
- NixOS and modern Linux have bash by default
- Document `#!/usr/bin/env bash` shebang requirement

**Common Pitfalls to Avoid**:

- Using `set -e` without understanding trap behavior
- Forgetting to quote variables: `"$var"` not `$var`
- Not checking command success: use `|| error "message"`
- Hardcoding paths: use `$(dirname "$0")` for relative paths
- Missing ShellCheck validation in CI

## Summary

All technical unknowns resolved:

1. **Testing**: BATS with function-based organization achieves >80% coverage
2. **VM Provisioning**: cloud-init + Ubuntu cloud images + K3s installation script
3. **Best Practices**: Strict mode, trap cleanup, git-style subcommands, ShellCheck validation

Ready to proceed to Phase 1 (Design & Contracts).

# Feature Specification: Local K3s Development VM

**Feature Branch**: `002-local-k3s-vm`
**Created**: 2025-11-13
**Updated**: 2025-11-15
**Status**: ✅ Implemented and Tested
**Input**: User description: "During local developmet developers need a local virtual machine running k3s, the developer experence here should be dead simple."

**Implementation**: See `IMPLEMENTATION.md` for complete implementation details, test results, and resolved challenges.

## Clarifications

### Session 2025-11-14

- Q: What virtualization technology should be used for the K3s VM? → A: libvirt + virt-manager (NixOS-specific solution; kind in Docker doesn't work well on NixOS)
- Q: What command-line interface pattern should be used for VM management operations? → A: Centralized bin/k3s-vm script with subcommands
- Q: How should the system handle insufficient system resources when attempting to create or start the VM? → A: Attempt start and fail with error (let libvirt handle resource validation naturally)
- Q: How should kubectl access to the K3s cluster be configured automatically? → A: Provide bin/kubectl and bin/k9s wrapper scripts that use local kubeconfig (no modification of global ~/.kube/config)
- Q: What default resource allocations (CPU, memory, disk) should the K3s VM use? → A: 2 CPU cores, 4GB RAM, 20GB disk

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Initial VM Setup (Priority: P1)

A developer wants to start working on the Catalyst platform locally and needs a K3s environment running in a virtual machine with minimal configuration.

**Why this priority**: This is the foundation - without a simple setup process, developers cannot begin local development. This is the MVP that delivers immediate value by providing a working local Kubernetes environment.

**Independent Test**: Can be fully tested by running the setup command on a clean system and verifying that a developer can access the K3s cluster and deploy a simple application within minutes.

**Acceptance Scenarios**:

1. **Given** a developer has the required dependencies installed, **When** they run the VM setup command, **Then** a K3s VM is created and started automatically
2. **Given** the K3s VM is running, **When** the developer runs `bin/kubectl` commands, **Then** they can interact with the K3s cluster using the local kubeconfig without affecting their global kubectl configuration
3. **Given** a fresh system setup, **When** the developer completes the setup, **Then** they can deploy a test application to the local K3s cluster using `bin/kubectl` within 5 minutes

---

### User Story 2 - VM Lifecycle Management (Priority: P2)

A developer needs to start, stop, and restart their local K3s VM as they work on different tasks throughout the day without losing cluster state or configuration.

**Why this priority**: Developers need reliable lifecycle management to save system resources when not actively developing and resume work quickly. This builds on the P1 foundation by adding practical day-to-day operations.

**Independent Test**: Can be tested independently by starting a VM, deploying resources, stopping the VM, and verifying those resources persist after restart.

**Acceptance Scenarios**:

1. **Given** a running K3s VM, **When** the developer stops the VM, **Then** system resources are freed and the VM can be restarted later
2. **Given** a stopped K3s VM with existing deployments, **When** the developer starts the VM, **Then** all previous deployments and configurations are preserved
3. **Given** a running K3s VM, **When** the developer restarts their workstation, **Then** they can easily restart the VM without reconfiguration

---

### User Story 3 - VM Status and Health Monitoring (Priority: P3)

A developer wants to quickly check if their local K3s VM is running and healthy before beginning development work.

**Why this priority**: While useful, developers can work without this by attempting to use kubectl - it's a convenience feature that improves the developer experience but isn't blocking.

**Independent Test**: Can be tested independently by checking VM status from various states (running, stopped, error) and verifying accurate reporting.

**Acceptance Scenarios**:

1. **Given** a K3s VM in any state, **When** the developer checks status, **Then** they see clear information about whether the VM is running, stopped, or has errors
2. **Given** a running K3s VM, **When** the developer checks health, **Then** they see if K3s services are healthy and cluster is accessible
3. **Given** a VM experiencing issues, **When** the developer checks status, **Then** they receive helpful diagnostic information and suggested fixes

---

### User Story 4 - VM Cleanup and Reset (Priority: P3)

A developer needs to clean up or completely reset their local K3s VM when troubleshooting issues or starting fresh.

**Why this priority**: This is primarily for troubleshooting and cleanup scenarios - developers can work without it, but it's valuable for recovery situations.

**Independent Test**: Can be tested independently by creating a VM with deployed resources, running cleanup/reset commands, and verifying proper removal.

**Acceptance Scenarios**:

1. **Given** a running K3s VM with deployments, **When** the developer runs the reset command, **Then** the VM is completely removed and can be recreated fresh
2. **Given** a corrupted or non-functional VM, **When** the developer runs cleanup, **Then** all VM resources are removed and system is ready for a fresh setup
3. **Given** a reset confirmation prompt, **When** the developer confirms, **Then** the reset proceeds; if they cancel, nothing changes

---

### Edge Cases

- **Insufficient system resources**: libvirt will fail naturally during VM start with its native error messages; developers must interpret and resolve resource constraints
- How does the system handle network conflicts with existing services?
- What happens if the VM becomes corrupted or enters an error state?
- How are VM updates handled when K3s or VM software needs upgrading?
- What happens if multiple K3s VMs are attempted simultaneously?
- How does the system handle disk space limitations?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a centralized `bin/k3s-vm` script that manages all VM lifecycle operations
- **FR-002**: The `bin/k3s-vm` script MUST support subcommands: `start`, `stop`, `status`, `reset`, and `setup`
- **FR-003**: System MUST provide `bin/kubectl` and `bin/k9s` wrapper scripts that automatically use the local K3s cluster kubeconfig without modifying the developer's global ~/.kube/config
- **FR-004**: System MUST persist cluster state and deployments across VM stops and starts
- **FR-005**: Users MUST be able to start, stop, and restart the K3s VM with simple commands (e.g., `bin/k3s-vm start`)
- **FR-006**: System MUST provide clear status information about VM state (running, stopped, error) via `bin/k3s-vm status`
- **FR-007**: System MUST allow complete VM cleanup and removal for troubleshooting or reset scenarios via `bin/k3s-vm reset`
- **FR-008**: System MUST validate that required dependencies (libvirt, virt-manager, virsh) are installed before VM creation
- **FR-009**: System MUST provide clear error messages with actionable guidance when setup or operations fail
- **FR-010**: System MUST use default resource allocations of 2 CPU cores, 4GB RAM, and 20GB disk that work out-of-box, while allowing developers to optionally customize these settings for their specific needs or project requirements
- **FR-011**: System MUST handle VM naming to prevent conflicts if multiple projects use local VMs

### Key Entities

- **K3s VM**: A lightweight virtual machine running K3s Kubernetes distribution; tracks state (running/stopped/error), resource allocation, network configuration, and associated kubeconfig
- **VM Configuration**: Settings for the VM including CPU cores (default: 2), memory allocation (default: 4GB), disk size (default: 20GB), network settings, and K3s version
- **Local Kubeconfig**: Project-local kubeconfig file containing K3s cluster credentials and connection details; stored within project directory and never merged into global ~/.kube/config
- **Developer Workstation**: The host system where the VM runs; tracks available resources, existing VMs, and environment setup

## Technical Constraints & Platform Considerations

### Platform Support

- **Primary Target**: NixOS (kind in Docker has known compatibility issues on NixOS)
- **Note**: Other operating systems can use kind in Docker as a simpler alternative for local Kubernetes development

### Technology Stack

- **Virtualization**: libvirt + virt-manager for VM management
- **Kubernetes Distribution**: K3s (lightweight Kubernetes)
- **VM Control Interface**: virsh CLI for VM lifecycle operations

### Default VM Configuration

- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Disk**: 20GB
- **Rationale**: These defaults provide comfortable headroom for K3s cluster operation plus test workloads while remaining accessible on typical development machines. K3s is designed for minimal hardware, but these allocations ensure good performance without monopolizing workstation resources.

### CLI Interface Design

- **Primary Interface**: Centralized `bin/k3s-vm` shell script in project root
- **Command Pattern**: Subcommand-based (e.g., `bin/k3s-vm start`, `bin/k3s-vm stop`, `bin/k3s-vm status`)
- **Supported Subcommands**:
  - `setup`: Initial VM creation and K3s installation
  - `start`: Start an existing stopped VM
  - `stop`: Gracefully stop a running VM
  - `status`: Display VM and K3s cluster health status
  - `reset`: Destroy VM and all associated resources
- **Cluster Access Wrappers**:
  - `bin/kubectl`: Wrapper script that automatically sets KUBECONFIG to local K3s cluster config
  - `bin/k9s`: Wrapper script that automatically sets KUBECONFIG to local K3s cluster config
  - Local kubeconfig stored in project directory (e.g., `.kube/config` or `web/.kube/config`)
  - Global ~/.kube/config remains untouched and unaffected

## Integration & External Dependencies

### Required System Dependencies

- libvirt daemon (must be running)
- virt-manager (VM management library)
- virsh CLI tool (for VM control operations)
- kubectl (wrapped via bin/kubectl for local K3s cluster interaction)
- k9s (optional; wrapped via bin/k9s for terminal-based cluster management UI)

### Failure Modes

- libvirt daemon not running: Setup must detect and provide actionable error with start instructions
- Insufficient system resources: libvirt will fail naturally during VM creation/start; native error messages passed through to developer
- Network conflicts: Must detect port conflicts and suggest resolution

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Developers can create and access a working K3s cluster on their local machine in under 5 minutes from initial setup command
- **SC-002**: VM start and stop operations complete in under 30 seconds
- **SC-003**: 95% of developers successfully complete initial setup without manual intervention or troubleshooting
- **SC-004**: Cluster state and deployed applications persist across 100% of VM stop/start cycles under normal conditions
- **SC-005**: Status and error messages provide actionable guidance that resolves 80% of common issues without external documentation
- **SC-006**: VM resource consumption (2 CPU cores, 4GB RAM, 20GB disk) allows developers to run the K3s cluster alongside typical development tools on standard development hardware (8GB+ total RAM, 4+ CPU cores)

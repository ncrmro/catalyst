# Implementation Plan: Local K3s Development VM

**Branch**: `002-local-k3s-vm` | **Date**: 2025-11-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-local-k3s-vm/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a dead-simple local K3s development VM for NixOS developers using libvirt + virt-manager. The solution provides centralized shell scripts (`bin/k3s-vm` for VM lifecycle, `bin/kubectl` and `bin/k9s` as wrappers) that enable developers to create, manage, and interact with a local Kubernetes cluster in under 5 minutes without touching global kubectl configuration.

## Technical Context

**Language/Version**: Bash shell scripting (POSIX-compatible where possible)
**Primary Dependencies**: libvirt (KVM/QEMU), virt-manager, virsh, K3s, kubectl, k9s (optional)
**Storage**: VM disk images managed by libvirt (default 20GB per VM), local kubeconfig files in project directory
**Testing**: BATS (Bash Automated Testing System) with function-based code organization, >80% coverage via testable functions
**Target Platform**: NixOS (primary), Linux (secondary - must work on standard Linux distros with libvirt)
**Project Type**: Infrastructure/DevOps tooling (shell scripts in repository root `bin/` directory)
**Performance Goals**:

- VM creation/setup: <5 minutes total time
- VM start/stop: <30 seconds
- kubectl command execution: immediate (no noticeable overhead from wrapper)

**Constraints**:

- Must not modify global ~/.kube/config
- Must validate dependencies before operations
- Must provide clear error messages with actionable guidance
- Default VM resources: 2 CPU cores, 4GB RAM, 20GB disk

**Scale/Scope**:

- Single VM per project/repository
- Support concurrent VMs across different projects (unique VM naming)
- Local development only (not production infrastructure)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Principle 1: Agentic-First Design ✅ PASS

**Status**: Not applicable - this is infrastructure tooling for local development, not a platform feature requiring MCP integration.

**Rationale**: The K3s VM feature provides local development infrastructure. It creates the environment where the main Catalyst application runs, rather than being part of the application itself. The shell scripts (`bin/k3s-vm`, `bin/kubectl`, `bin/k9s`) are developer tools, not platform capabilities that agents would invoke through the MCP server.

### Principle 2: Fast Feedback Loops ✅ PASS

**Status**: Compliant - this feature enables fast feedback by providing local development infrastructure.

**Rationale**: By creating a local K3s cluster that developers can spin up in under 5 minutes, this feature supports the fast feedback principle. Developers can test preview environments and CI/CD workflows locally before pushing to remote clusters. VM start/stop times of <30 seconds ensure minimal friction during development.

### Principle 3: Deployment Portability ✅ PASS

**Status**: Compliant - uses open standards (libvirt, K3s, Kubernetes).

**Rationale**: The solution is based entirely on open standards: libvirt for virtualization, K3s for Kubernetes, standard Kubernetes APIs for cluster interaction. While initially targeting NixOS, the approach works on any Linux distribution with libvirt. No vendor lock-in exists.

### Principle 4: Security by Default ✅ PASS

**Status**: Compliant - kubeconfig isolation prevents credential leakage.

**Rationale**: The feature maintains security by:

- Storing kubeconfig locally in project directory (not in global ~/.kube/config)
- Using wrapper scripts that prevent accidental credential exposure
- Operating entirely in local development (no production credentials involved)
- Following least-privilege principle (VM only accessible from host)

### Principle 5: Test-Driven Quality ✅ PASS (Post-Design)

**Status**: Compliant - BATS testing strategy defined.

**Resolution**: Phase 0 research determined BATS (Bash Automated Testing System) with function-based code organization. This achieves >80% coverage by:

- Structuring scripts as testable functions (not monolithic blocks)
- Using BATS `@test` blocks for each scenario
- Mocking system commands (virsh, kubectl) via function stubs
- CI integration via GitHub Actions

**Implementation**: See `research.md` for full testing strategy details.

### Principle 6: Layered Architecture Discipline ✅ PASS

**Status**: Not applicable - this is infrastructure scripting, not application architecture.

**Rationale**: The layered architecture principle applies to the web application codebase (Actions/Models/Database separation). Shell scripts in `bin/` are infrastructure tooling and don't participate in the application's architectural layers.

### Gate Summary (Pre-Phase 0)

**Result**: ✅ CONDITIONAL PASS - proceed to Phase 0 with testing clarification requirement

**Violations**: None
**Clarifications Required**: Testing strategy (addressed in Phase 0)
**Notes**: Infrastructure tooling has different compliance profile than application features - most principles are not applicable or naturally satisfied.

### Gate Summary (Post-Phase 1)

**Result**: ✅ FULL PASS - all principles satisfied

**Violations**: None
**Outstanding Issues**: None
**Notes**:

- Testing strategy resolved via BATS with function-based organization
- All applicable constitutional principles met
- Ready to proceed to task decomposition (`/speckit.tasks`)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
bin/
├── k3s-vm              # Main VM lifecycle management script
├── kubectl             # Wrapper that sets KUBECONFIG to local cluster
└── k9s                 # Wrapper that sets KUBECONFIG to local cluster

web/.kube/              # Local kubeconfig storage (gitignored)
└── config              # K3s cluster credentials (created by bin/k3s-vm setup)

tests/
└── e2e/
    └── k3s-vm.test.sh  # Integration tests for VM scripts (if bats/shunit2 chosen)
```

**Structure Decision**: Infrastructure/DevOps tooling structure

This feature adds shell scripts to the repository root `bin/` directory, following the existing pattern for project-level tooling. The scripts are:

1. **bin/k3s-vm**: Primary orchestration script with subcommands (setup, start, stop, status, reset)
2. **bin/kubectl**: Thin wrapper that exports KUBECONFIG pointing to `web/.kube/config` before invoking system kubectl
3. **bin/k9s**: Thin wrapper that exports KUBECONFIG pointing to `web/.kube/config` before invoking system k9s

The local kubeconfig is stored in `web/.kube/config` (chosen over root `.kube/config` to keep K8s artifacts close to the web application code). This directory will be added to `.gitignore`.

No modifications to existing `src/`, `web/src/`, or application code required - this is purely infrastructure tooling.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

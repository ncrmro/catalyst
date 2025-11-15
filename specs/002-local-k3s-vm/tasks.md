# Tasks: Local K3s Development VM

**Input**: Design documents from `/specs/002-local-k3s-vm/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-interface.md, quickstart.md

**Tests**: Tests are OPTIONAL and not included (not explicitly requested in spec.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create bin/ directory structure in project root
- [x] T002 [P] Add web/.kube/ to .gitignore
- [x] T003 [P] Add .k3s-vm/ to .gitignore
- [x] T004 [P] Create tests/e2e/ directory for BATS tests
- [x] T005 Download Ubuntu 22.04 cloud image to /var/lib/libvirt/images/ (or configure download location)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create shared functions library in bin/k3s-vm-lib.sh for testability (validate_dependencies, error handling, logging)
- [x] T007 [P] Implement dependency validation function in bin/k3s-vm-lib.sh (check virsh, virt-install, kubectl, qemu-img, libvirtd)
- [x] T008 [P] Implement error handling and cleanup trap function in bin/k3s-vm-lib.sh
- [x] T009 [P] Implement logging functions in bin/k3s-vm-lib.sh (log, debug, info, error with /tmp/k3s-vm.log output)
- [x] T010 [P] Implement VM name generation function in bin/k3s-vm-lib.sh (generate unique name from project directory)
- [x] T011 [P] Implement VM state query functions in bin/k3s-vm-lib.sh (get_vm_state, is_vm_running, vm_exists)
- [x] T012 [P] Implement configuration management functions in bin/k3s-vm-lib.sh (load_config, save_config from/to .k3s-vm/config)
- [x] T013 Create main bin/k3s-vm script with strict mode, subcommand dispatcher, and help output

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initial VM Setup (Priority: P1) 🎯 MVP

**Goal**: Enable developers to create a K3s VM and access the cluster in under 5 minutes

**Independent Test**: Run `bin/k3s-vm setup` on a clean system, then verify `bin/kubectl get nodes` shows a ready node within 5 minutes

### Implementation for User Story 1

- [x] T014 [P] [US1] Implement VM image creation function in bin/k3s-vm-lib.sh (download cloud image if needed, create qcow2 overlay)
- [x] T015 [P] [US1] Implement SSH key generation function in bin/k3s-vm-lib.sh (generate ~/.ssh/id_rsa if missing)
- [x] T016 [P] [US1] Implement cloud-init configuration generation function in bin/k3s-vm-lib.sh (user setup, K3s installation, kubeconfig export)
- [x] T017 [US1] Implement cmd_setup function in bin/k3s-vm (orchestrates: validate deps → check VM doesn't exist → load/save config → create image → generate cloud-init → virt-install → wait for boot → extract kubeconfig)
- [x] T018 [US1] Implement VM creation via virt-install in cmd_setup function (use cloud-init, default 2 CPUs / 4GB RAM / 20GB disk)
- [x] T019 [US1] Implement VM boot waiting logic in cmd_setup function (poll VM until SSH accessible, timeout 5 minutes)
- [x] T020 [US1] Implement K3s readiness check in cmd_setup function (poll K3s API until responding, timeout 5 minutes)
- [x] T021 [US1] Implement kubeconfig extraction in cmd_setup function (SSH to VM, retrieve /etc/rancher/k3s/k3s.yaml, save to web/.kube/config)
- [x] T022 [US1] Implement kubeconfig server URL update in cmd_setup function (replace 127.0.0.1 with VM IP from virsh net-dhcp-leases)
- [x] T023 [P] [US1] Create bin/kubectl wrapper script (check web/.kube/config exists, export KUBECONFIG, exec kubectl with args)
- [x] T024 [P] [US1] Create bin/k9s wrapper script (check web/.kube/config exists, check k9s installed, export KUBECONFIG, exec k9s with args)
- [x] T025 [US1] Add setup subcommand help text and option parsing (--cpus, --memory, --disk) to bin/k3s-vm
- [x] T026 [US1] Make bin/k3s-vm, bin/kubectl, and bin/k9s executable (chmod +x)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - VM Lifecycle Management (Priority: P2)

**Goal**: Enable developers to start, stop, and restart their K3s VM reliably with persistent cluster state

**Independent Test**: Deploy a test application, stop VM, start VM, verify application still exists and is running

### Implementation for User Story 2

- [x] T027 [P] [US2] Implement cmd_start function in bin/k3s-vm (check VM exists → check not already running → virsh start → wait for VM accessible → verify K3s API responding)
- [x] T028 [P] [US2] Implement cmd_stop function in bin/k3s-vm (check VM exists → check is running → virsh shutdown with graceful timeout → handle --force flag for virsh destroy)
- [x] T029 [US2] Implement VM accessibility check function in bin/k3s-vm-lib.sh (poll SSH connection until successful, timeout 30 seconds)
- [x] T030 [US2] Implement K3s API health check function in bin/k3s-vm-lib.sh (kubectl cluster-info or direct API call, timeout 30 seconds)
- [x] T031 [US2] Add start subcommand help text to bin/k3s-vm
- [x] T032 [US2] Add stop subcommand help text and option parsing (--force) to bin/k3s-vm
- [x] T033 [US2] Add appropriate error messages for start/stop failure scenarios (VM not found, already running, already stopped, timeout)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - VM Status and Health Monitoring (Priority: P3)

**Goal**: Provide quick visibility into VM and K3s cluster status before development work

**Independent Test**: Check status from various VM states (running, stopped, not found) and verify accurate reporting in each case

### Implementation for User Story 3

- [x] T034 [US3] Implement cmd_status function in bin/k3s-vm (load config → query VM state → if running get IP and check K3s → format output)
- [x] T035 [P] [US3] Implement VM info retrieval function in bin/k3s-vm-lib.sh (virsh dominfo to get CPUs, memory, disk)
- [x] T036 [P] [US3] Implement K3s version check function in bin/k3s-vm-lib.sh (kubectl version --short to get K3s version)
- [x] T037 [P] [US3] Implement K3s node count function in bin/k3s-vm-lib.sh (kubectl get nodes and count ready nodes)
- [x] T038 [US3] Format status output for running state in cmd_status (VM name, state, IP, resources, K3s API status, version, nodes, kubeconfig path)
- [x] T039 [US3] Format status output for stopped state in cmd_status (VM name, state, resources, instruction to start)
- [x] T040 [US3] Format status output for not found state in cmd_status (state not found, instruction to run setup)
- [x] T041 [US3] Implement verbose status output in cmd_status (add UUID, created date, disk image path, disk usage, network details when --verbose flag set)
- [x] T042 [US3] Add status subcommand help text and option parsing (--verbose) to bin/k3s-vm

**Checkpoint**: All user stories 1-3 should now be independently functional

---

## Phase 6: User Story 4 - VM Cleanup and Reset (Priority: P3)

**Goal**: Enable developers to cleanly remove or reset their K3s VM for troubleshooting

**Independent Test**: Create VM with deployed resources, run reset command, verify complete removal, verify setup works again

### Implementation for User Story 4

- [x] T043 [US4] Implement cmd_reset function in bin/k3s-vm (prompt confirmation unless --yes → stop VM if running → virsh undefine with --remove-all-storage → remove kubeconfig → preserve .k3s-vm/config)
- [x] T044 [US4] Implement confirmation prompt in cmd_reset function (read user input, accept 'yes', reject anything else unless --yes flag)
- [x] T045 [US4] Implement VM destruction logic in cmd_reset (virsh destroy if running → virsh undefine --remove-all-storage)
- [x] T046 [US4] Implement kubeconfig cleanup in cmd_reset (remove web/.kube/config file)
- [x] T047 [US4] Add reset subcommand help text and option parsing (--yes) to bin/k3s-vm
- [x] T048 [US4] Add appropriate error messages and warnings for reset command (destructive warning, VM not found handling)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T049 [P] Add general CLI options to bin/k3s-vm (-h/--help, -v/--verbose, --debug, --version)
- [x] T050 [P] Implement ShellCheck validation in CI for all shell scripts (bin/k3s-vm, bin/k3s-vm-lib.sh, bin/kubectl, bin/k9s)
- [x] T051 [P] Add environment variable support (VM_NAME, DEBUG, LOG_FILE) to bin/k3s-vm
- [x] T052 [P] Create BATS test file tests/e2e/k3s-vm-lib.bats for shared library functions (dependency validation, VM state queries, config management)
- [x] T053 [P] Create BATS test file tests/e2e/k3s-vm-setup.bats for setup command (mock virt-install, verify all steps called correctly)
- [x] T054 [P] Create BATS test file tests/e2e/k3s-vm-lifecycle.bats for start/stop/status commands (mock virsh, verify state transitions)
- [x] T055 [P] Create BATS test file tests/e2e/k3s-vm-reset.bats for reset command (mock virsh undefine, verify cleanup)
- [x] T056 [P] Add log rotation or cleanup recommendations to documentation
- [x] T057 Validate quickstart.md scenarios end-to-end (run all commands from quickstart on clean system, verify expected outcomes)
- [x] T058 [P] Add error recovery guidance to common error scenarios (dependency installation commands, libvirt daemon start, resource allocation)
- [x] T059 Add VM naming conflict handling (detect if VM with same name exists from different project, suggest resolution)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Requires US1 for bin/k3s-vm structure but can be developed in parallel
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses VM state functions from Foundational phase, independent of US1/US2
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Uses VM state functions from Foundational phase, independent of US1/US2/US3

### Within Each User Story

**User Story 1 (Setup)**:

- T014, T015, T016 can run in parallel (different functions)
- T017 orchestrates and depends on completion of foundation + T014-T016
- T018-T022 must run sequentially (each step depends on previous)
- T023, T024 can run in parallel (different wrapper scripts)
- T025, T026 can run in parallel with wrappers

**User Story 2 (Lifecycle)**:

- T027, T028 can run in parallel (different subcommands)
- T029, T030 can run in parallel (different functions)
- T031, T032, T033 can run in parallel (documentation)

**User Story 3 (Status)**:

- T035, T036, T037 can run in parallel (different functions)
- T034 depends on T035-T037
- T038, T039, T040 must follow T034 (formatting output)
- T041, T042 can run after T034-T040

**User Story 4 (Reset)**:

- T043 implements main logic
- T044, T045, T046 are components of T043 (sequential within T043)
- T047, T048 can run in parallel after T043

### Parallel Opportunities

- All Setup tasks (T001-T005) marked [P] can run in parallel
- All Foundational tasks (T007-T012) marked [P] can run in parallel
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within User Story 1: T014, T015, T016 parallel; T023, T024 parallel
- Within User Story 2: T027, T028 parallel; T029, T030 parallel
- Within User Story 3: T035, T036, T037 parallel
- All Polish phase BATS test files (T052-T055) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational library functions together:
Task: "Implement dependency validation function in bin/k3s-vm-lib.sh"
Task: "Implement error handling and cleanup trap function in bin/k3s-vm-lib.sh"
Task: "Implement logging functions in bin/k3s-vm-lib.sh"
Task: "Implement VM name generation function in bin/k3s-vm-lib.sh"
Task: "Implement VM state query functions in bin/k3s-vm-lib.sh"
Task: "Implement configuration management functions in bin/k3s-vm-lib.sh"
```

## Parallel Example: User Story 1

```bash
# Launch all helper functions for setup together:
Task: "Implement VM image creation function in bin/k3s-vm-lib.sh"
Task: "Implement SSH key generation function in bin/k3s-vm-lib.sh"
Task: "Implement cloud-init configuration generation function in bin/k3s-vm-lib.sh"

# Launch wrapper scripts together:
Task: "Create bin/kubectl wrapper script"
Task: "Create bin/k9s wrapper script"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T013) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T014-T026)
4. **STOP and VALIDATE**: Test User Story 1 independently:
   - Run `bin/k3s-vm setup` on clean system
   - Verify VM created in under 5 minutes
   - Verify `bin/kubectl get nodes` works
   - Deploy test application
5. Deploy/demo if ready - **This is the MVP!**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Deploy/Demo (MVP!)**
3. Add User Story 2 → Test independently (stop/start VM, verify persistence) → Deploy/Demo
4. Add User Story 3 → Test independently (check status from various states) → Deploy/Demo
5. Add User Story 4 → Test independently (reset and recreate) → Deploy/Demo
6. Add Polish phase → Full feature complete
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (setup command)
   - Developer B: User Story 2 (lifecycle commands - start/stop)
   - Developer C: User Story 3 (status command)
   - Developer D: User Story 4 (reset command)
3. Stories complete and integrate independently through shared bin/k3s-vm-lib.sh library

---

## Task Summary

**Total Tasks**: 59
**MVP Tasks (Phase 1-3)**: 26 tasks
**Task Count by User Story**:

- Setup phase: 5 tasks
- Foundational phase: 8 tasks
- User Story 1 (Initial VM Setup): 13 tasks
- User Story 2 (VM Lifecycle Management): 7 tasks
- User Story 3 (VM Status and Health Monitoring): 9 tasks
- User Story 4 (VM Cleanup and Reset): 6 tasks
- Polish phase: 11 tasks

**Parallel Opportunities Identified**:

- 3 tasks in Setup phase
- 6 tasks in Foundational phase
- 5 tasks in User Story 1
- 4 tasks in User Story 2
- 3 tasks in User Story 3
- 8 tasks in Polish phase

**Independent Test Criteria**:

- US1: Run setup, verify cluster accessible in under 5 minutes
- US2: Deploy app, stop/start VM, verify app persists
- US3: Check status from various VM states, verify accurate reporting
- US4: Create VM, run reset, verify clean removal, verify setup works again

**Suggested MVP Scope**: Complete Phase 1, Phase 2, and Phase 3 (User Story 1 only) - this delivers a working local K3s VM that developers can create and access in under 5 minutes, which is the core value proposition.

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4)
- Each user story should be independently completable and testable
- Tests are OPTIONAL (not included per spec requirements)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All shell scripts must pass ShellCheck validation before PR
- Function-based organization enables BATS testing (>80% coverage target per constitution)

---

## ✅ Implementation Complete (2025-11-15)

**Status**: All 59 tasks completed and tested successfully

### Completion Summary

All phases completed successfully:

- ✅ Phase 1: Setup (5 tasks)
- ✅ Phase 2: Foundational (8 tasks)
- ✅ Phase 3: User Story 1 - Initial VM Setup (13 tasks)
- ✅ Phase 4: User Story 2 - VM Lifecycle Management (7 tasks)
- ✅ Phase 5: User Story 3 - VM Status and Health Monitoring (9 tasks)
- ✅ Phase 6: User Story 4 - VM Cleanup and Reset (6 tasks)
- ✅ Phase 7: Polish & Cross-Cutting Concerns (11 tasks)

### Implementation Challenges Resolved

During implementation, encountered and resolved 4 significant challenges:

1. **Logging Output Pollution** - Log messages were polluting command substitution variables
   - **Solution**: Redirected all logging to stderr to preserve return values

2. **Network Permissions** - qemu:///session lacked network access permissions
   - **Solution**: Switched to qemu:///system connection for network access

3. **Cloud-init Storage Pool** - virt-install --cloud-init required missing /var/lib/libvirt/boot
   - **Solution**: Created cloud-init ISO manually using genisoimage instead

4. **Dependency Management** - Added genisoimage/mkisofs requirement
   - **Solution**: Updated dependency validation and install instructions

### Test Results

Manual testing completed on 2025-11-15:

- ✅ VM setup time: ~54 seconds (excluding base image download)
- ✅ K3s cluster: v1.33.5+k3s1 running successfully
- ✅ All commands verified: setup, start, stop, status, reset
- ✅ kubectl connectivity confirmed
- ✅ Configuration persistence verified

See `IMPLEMENTATION.md` for detailed test results and challenge resolutions.

# Kind VM Startup Plan: Reuse Healthy VMs

## Problem

`make kind-vm-start` currently **always tries to restart the VM** even when a healthy one is already running. This causes:

1. Timeout waiting for VM to boot when it's already running
2. Disk lock conflicts when trying to start a new QEMU on an existing image
3. Unnecessary Nix rebuilds
4. Poor user experience - the command should be idempotent

**Current behavior:**
```
$ make kind-vm-start
  → Always runs: nix run .#vm (tries to start new VM)
  → Ignores: existing healthy VM already running
  → Result: Timeout or disk lock error
```

**Desired behavior:**
```
$ make kind-vm-start
  → Check: Is a healthy VM already running?
  → If yes: Reuse it, configure kubeconfig, done
  → If no: Start new VM, wait for boot, configure kubeconfig
  → Result: Always succeeds, idempotent
```

---

## Solution: Check Then Start Logic

### New Flow

```
make kind-vm-start
  ↓
[Check VM Health]
  ├─ Is QEMU process running?
  ├─ Does SSH respond?
  ├─ Is Kind cluster ready?
  └─ Does kubectl work?
  ↓
[Decision]
  ├─ If healthy: Skip to "Configure kubeconfig"
  └─ If not healthy: Kill old process, start new VM
  ↓
[Wait for Boot]
  └─ Only if we just started a new VM
  ↓
[Configure kubeconfig]
  └─ Extract from VM, save to .kube/config
  ↓
[Done]
```

---

## Implementation

### Part 1: Create Health Check Script

**File: `scripts/kind-vm-health-check`**

```bash
#!/bin/bash
# Check if Kind VM is healthy and ready

KIND_SSH_PORT=${KIND_SSH_PORT:-2222}
SSH_OPTS="-q -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=2"

# Quick SSH test (returns 0 if VM is accessible)
ssh $SSH_OPTS nixos@localhost -p "$KIND_SSH_PORT" exit 2>/dev/null
```

Returns: 0 (success) if VM is accessible, 1 (failure) otherwise.

### Part 2: Enhance `scripts/ensure-kind-vm`

**Update Python script to:**

1. **Check if healthy VM exists:**
   ```python
   def is_vm_healthy():
       """Quick check: is VM running and SSH accessible?"""
       # Run health check script
       result = subprocess.run(
           ["bash", "scripts/kind-vm-health-check"],
           capture_output=True
       )
       return result.returncode == 0
   ```

2. **Skip startup if healthy:**
   ```python
   if is_vm_healthy():
       print("✓ Kind VM already running and healthy")
       # Skip to kubeconfig configuration
   else:
       # Kill stale processes and start new VM
       kill_stale_qemu()
       start_vm()
       wait_for_boot()
   ```

3. **Always configure kubeconfig:**
   ```python
   configure_kubeconfig()
   set_environment_variables()
   ```

### Part 3: Update Makefile

**Simplify `kind-vm-start` target:**

```makefile
kind-vm-start: ## Start Kind VM or reuse if healthy
	@echo "Kind VM startup (reuses existing if healthy)..."
	@./scripts/ensure-kind-vm
	@echo "✓ Kind VM ready"
```

Remove the Nix cache deletion and port configuration from the Makefile - let the health check handle it.

### Part 4: Add Utility Targets

```makefile
kind-vm-force-restart: ## Force restart even if VM is running
	@echo "Force restarting Kind VM..."
	@pkill -9 -f "qemu-system-x86_64" || true
	@sleep 2
	@make kind-vm-start

kind-vm-health: ## Check if VM is healthy
	@./scripts/kind-vm-health-check && echo "✓ VM is healthy" || echo "✗ VM is not running/healthy"

kind-vm-cleanup: ## Kill all stale QEMU processes
	@echo "Cleaning up stale QEMU processes..."
	@pkill -9 -f "qemu-system-x86_64" || echo "No processes to kill"
	@sleep 1
	@echo "Done"
```

---

## Files to Modify

1. **`Makefile`**
   - Simplify `kind-vm-start` target
   - Remove Nix cache deletion
   - Add `kind-vm-force-restart`, `kind-vm-health`, `kind-vm-cleanup` targets

2. **`scripts/ensure-kind-vm`** (Python)
   - Add health check before starting VM
   - Only start if not healthy
   - Add `is_vm_healthy()` function
   - Add `kill_stale_qemu()` function

3. **`scripts/kind-vm-health-check`** (NEW)
   - Simple bash script that returns 0 if SSH works
   - Takes <3 seconds to run

---

## Expected Behavior

### First Time
```bash
$ make kind-vm-start
Kind VM startup (reuses existing if healthy)...
Kind VM not running, starting...
This may take 30-60 seconds...
Waiting for Kind VM to boot (max 90s)...
✓ Kind VM ready after 45s
Configuring kubeconfig...
✓ Kubeconfig saved to .kube/config
✓ Kind VM ready
```

### Already Running
```bash
$ make kind-vm-start
Kind VM startup (reuses existing if healthy)...
✓ Kind VM already running and healthy
Configuring kubeconfig...
✓ Kubeconfig saved to .kube/config
✓ Kind VM ready
```
*Takes <5 seconds, no restart needed*

### Stale Process
```bash
$ make kind-vm-start
# (VM crashed, old QEMU process still there)
Kind VM startup (reuses existing if healthy)...
Kind VM is unhealthy, cleaning up...
✓ Old processes killed
Starting new Kind VM...
This may take 30-60 seconds...
✓ Kind VM ready after 45s
Configuring kubeconfig...
✓ Kind VM ready
```

### Force Restart
```bash
$ make kind-vm-force-restart
Force restarting Kind VM...
✓ Old processes killed
Kind VM startup...
Starting new Kind VM...
This may take 30-60 seconds...
✓ Kind VM ready after 45s
Configuring kubeconfig...
✓ Kind VM ready
```

---

## Key Benefits

1. **Idempotent**: Running `kind-vm-start` twice works both times
2. **Fast**: If VM is healthy, takes <5 seconds
3. **Smart**: Only restarts when necessary
4. **Robust**: Auto-cleans stale processes
5. **Debuggable**: Can check health with `make kind-vm-health`
6. **Clear**: User always knows what's happening

---

## Success Criteria

- ✓ `make kind-vm-start` works if VM is already running (reuses it)
- ✓ `make kind-vm-start` works if VM is not running (starts it)
- ✓ `make kind-vm-start` works if VM is unhealthy (restarts it)
- ✓ No timeouts in any scenario
- ✓ Takes <5 seconds if VM is healthy
- ✓ Takes 45-60 seconds if starting fresh
- ✓ `make kind-vm-health` shows status quickly
- ✓ Can call `make kind-vm-start` multiple times safely

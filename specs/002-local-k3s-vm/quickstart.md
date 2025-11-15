# Quickstart: Local K3s Development VM

**Feature**: Local K3s Development VM (002-local-k3s-vm)
**Target Audience**: Developers setting up local K3s environment
**Time to Complete**: ~5 minutes

## Prerequisites

Before starting, ensure you have:

1. **Linux system with KVM support** (NixOS recommended, any Linux with libvirt works)
2. **libvirt and related tools installed**:

   ```bash
   # On NixOS, add to configuration.nix:
   virtualisation.libvirtd.enable = true;

   # On Ubuntu/Debian:
   sudo apt install libvirt-daemon-system libvirt-clients qemu-kvm virt-manager

   # On Fedora:
   sudo dnf install libvirt virt-install qemu-kvm
   ```

3. **kubectl installed**:

   ```bash
   # Check if installed:
   kubectl version --client

   # Install if missing (example for Linux):
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   chmod +x kubectl
   sudo mv kubectl /usr/local/bin/
   ```

4. **Sufficient system resources**:
   - Minimum: 4 CPU cores, 8GB RAM (for both host and VM)
   - Recommended: 8+ CPU cores, 16GB+ RAM
   - Disk space: 25GB+ available

5. **libvirt daemon running**:

   ```bash
   # Check status:
   sudo systemctl status libvirtd

   # Start if not running:
   sudo systemctl start libvirtd

   # Enable on boot (optional):
   sudo systemctl enable libvirtd
   ```

## Quick Start Steps

### 1. Create the K3s VM (5 minutes)

```bash
# From the project root directory:
bin/k3s-vm setup
```

**What it does**:

- Validates dependencies
- Downloads Ubuntu cloud image (~700MB - one time only)
- Creates a 20GB VM with 2 CPUs and 4GB RAM
- Installs K3s inside the VM
- Extracts kubeconfig to `web/.kube/config`

**Expected output**:

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

### 2. Verify K3s Cluster

```bash
# Check cluster nodes:
bin/kubectl get nodes

# Expected output:
# NAME    STATUS   ROLES                  AGE   VERSION
# k3s     Ready    control-plane,master   1m    v1.28.3+k3s1

# Check cluster info:
bin/kubectl cluster-info

# Check system pods:
bin/kubectl get pods -A
```

### 3. Deploy a Test Application

```bash
# Create a simple nginx deployment:
bin/kubectl create deployment nginx --image=nginx

# Expose it as a service:
bin/kubectl expose deployment nginx --port=80 --type=NodePort

# Get the service:
bin/kubectl get services

# Get the NodePort (e.g., 30123):
bin/kubectl get service nginx -o jsonpath='{.spec.ports[0].nodePort}'

# Access nginx from your host:
curl http://$(virsh net-dhcp-leases default | grep k3s | awk '{print $5}' | cut -d'/' -f1):<NodePort>
```

### 4. Use k9s for Cluster Management (Optional)

If you have k9s installed:

```bash
bin/k9s
```

This launches a terminal UI for managing your K3s cluster.

## Daily Workflow

### Starting Your Day

```bash
# Check VM status:
bin/k3s-vm status

# If VM is stopped, start it:
bin/k3s-vm start
```

### Ending Your Day

```bash
# Stop the VM to free resources:
bin/k3s-vm stop
```

### Checking Status Anytime

```bash
# Quick status:
bin/k3s-vm status

# Detailed status:
bin/k3s-vm status --verbose

# Check cluster health:
bin/kubectl get nodes
bin/kubectl get pods -A
```

## Common Commands

### VM Management

```bash
# Setup (first time only):
bin/k3s-vm setup

# Start VM:
bin/k3s-vm start

# Stop VM:
bin/k3s-vm stop

# Force stop (if graceful shutdown fails):
bin/k3s-vm stop --force

# Check status:
bin/k3s-vm status

# Reset (DELETE everything and start fresh):
bin/k3s-vm reset
```

### Kubernetes Operations

```bash
# All kubectl commands work via the wrapper:
bin/kubectl get nodes
bin/kubectl get pods
bin/kubectl apply -f manifest.yaml
bin/kubectl logs <pod-name>

# Use k9s for interactive management:
bin/k9s
```

## Troubleshooting

### VM Won't Start

**Symptom**: `bin/k3s-vm start` fails

**Solutions**:

```bash
# 1. Check libvirt daemon:
sudo systemctl status libvirtd
sudo systemctl start libvirtd

# 2. Check VM status:
virsh domstate catalyst-k3s-catalyst

# 3. Try force start:
virsh start catalyst-k3s-catalyst --force-boot

# 4. If corrupted, reset and recreate:
bin/k3s-vm reset
bin/k3s-vm setup
```

### Kubeconfig Issues

**Symptom**: `bin/kubectl` fails with connection error

**Solutions**:

```bash
# 1. Check kubeconfig exists:
ls -la web/.kube/config

# 2. Check VM is running:
bin/k3s-vm status

# 3. Get VM IP:
virsh net-dhcp-leases default

# 4. Regenerate kubeconfig:
VM_IP=$(virsh net-dhcp-leases default | grep k3s | awk '{print $5}' | cut -d'/' -f1)
ssh ubuntu@$VM_IP "sudo cat /etc/rancher/k3s/k3s.yaml" > web/.kube/config
sed -i "s/127.0.0.1/$VM_IP/g" web/.kube/config
```

### Out of Disk Space

**Symptom**: VM creation fails with disk error

**Solutions**:

```bash
# 1. Check available space:
df -h /var/lib/libvirt/images

# 2. Clean up old VMs:
virsh list --all
virsh undefine <old-vm-name> --remove-all-storage

# 3. Clean up backing images:
sudo rm /var/lib/libvirt/images/*.img (if safe)
```

### VM is Slow

**Symptom**: K3s operations are slow

**Solutions**:

```bash
# 1. Stop and increase resources:
bin/k3s-vm stop
# Edit .k3s-vm/config:
VM_CPUS=4
VM_MEMORY=8192

# Note: Changing resources requires recreating VM:
bin/k3s-vm reset
bin/k3s-vm setup

# 2. Check host resources:
htop  # or top

# 3. Check VM resources:
virsh dominfo catalyst-k3s-catalyst
```

### Can't Access Deployed Services

**Symptom**: curl to NodePort fails

**Solutions**:

```bash
# 1. Get VM IP:
VM_IP=$(virsh net-dhcp-leases default | grep k3s | awk '{print $5}' | cut -d'/' -f1)
echo $VM_IP

# 2. Get service NodePort:
bin/kubectl get services

# 3. Test from host:
curl http://$VM_IP:<NodePort>

# 4. Check firewall (if enabled):
sudo iptables -L -n | grep <NodePort>

# 5. Check service is running:
bin/kubectl get pods
bin/kubectl logs <pod-name>
```

## Next Steps

After completing this quickstart:

1. **Deploy the Catalyst application**: Use the K3s cluster to test preview environments
2. **Read the CLI reference**: See `contracts/cli-interface.md` for full command documentation
3. **Understand the architecture**: Read `data-model.md` for how VM state and config are managed
4. **Customize your setup**: Edit `.k3s-vm/config` and recreate VM with different resources

## Tips

- **Persist across reboots**: VM and kubeconfig persist, but VM won't auto-start. Run `bin/k3s-vm start` after reboot.
- **Multiple projects**: Each project gets its own VM (based on directory name). No conflicts.
- **Backup important data**: Before running `reset`, backup any important cluster data.
- **Use k9s**: Install k9s for a better kubectl experience (https://k9scli.io/).
- **SSH access**: VM has SSH enabled, default user `ubuntu`, SSH key in `~/.ssh/id_rsa`.

## Uninstall

To completely remove the K3s VM:

```bash
# 1. Reset VM (removes VM, disk, kubeconfig):
bin/k3s-vm reset

# 2. Optionally remove base cloud image:
sudo rm /var/lib/libvirt/images/ubuntu-*-cloudimg-*.img

# 3. Optionally remove config:
rm -rf .k3s-vm/
```

## Getting Help

- **CLI help**: `bin/k3s-vm --help`
- **Debug mode**: `bin/k3s-vm --debug <subcommand>`
- **Logs**: Check `/tmp/k3s-vm.log` for detailed logs
- **VM console**: `virsh console catalyst-k3s-catalyst` (Ctrl+] to exit)

## Summary

You now have a local K3s cluster running in a VM that:

- ✅ Starts in under 5 minutes
- ✅ Uses isolated kubeconfig (doesn't touch your global ~/.kube/config)
- ✅ Persists across VM restarts
- ✅ Provides full Kubernetes functionality
- ✅ Can be managed with simple `bin/k3s-vm` commands

Happy developing! 🚀

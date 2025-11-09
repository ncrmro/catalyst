# Kind with Rootless Docker on NixOS

This document provides guidance for running kind (Kubernetes in Docker) with rootless Docker on NixOS, including troubleshooting for ZFS-specific issues.

## Overview

Running kind with rootless Docker on NixOS requires specific system configuration due to:

- **cgroup delegation requirements** for rootless containers
- **Device mapper limitations** in rootless mode
- **ZFS filesystem considerations** when using overlay2 storage driver

## The Problem

When running `kind create cluster` with rootless Docker, you may encounter errors like:

```
ERROR: failed to create cluster: command "docker run..." failed with error: exit status 126
docker: Error response from daemon: failed to create task for container:
OCI runtime create failed: runc create failed: unable to start container process:
error during container init: error creating device nodes:
open /home/<user>/.local/share/docker/overlay2/.../merged/dev/mapper/control: permission denied
```

This occurs because:

1. Kind requires privileged operations (`--privileged` flag, device mounts like `/dev/mapper`)
2. Rootless Docker runs in user namespaces with restricted device access
3. The systemd cgroup delegation may not be properly configured

## Current Status (as of June 2025)

This is a **known compatibility issue** tracked in:

- [kubernetes-sigs/kind#3963](https://github.com/kubernetes-sigs/kind/issues/3963) - Unable to create cluster with rootless docker
- [kubernetes-sigs/kind#2916](https://github.com/kubernetes-sigs/kind/issues/2916) - Rootless podman delegation issues

The problem is environmental/configuration-related rather than a bug in kind itself. Rootless containers have fundamental limitations with device access and privileged operations.

## Solutions & Workarounds

### Option 1: Configure Systemd Delegation (Recommended First Step)

Kind requires proper cgroup delegation to work with rootless containers. On NixOS, configure this declaratively:

#### Configuration.nix

```nix
{
  # Enable rootless Docker
  virtualisation.docker = {
    enable = true;
    rootless = {
      enable = true;
      setSocketVariable = true;
    };
  };

  # Configure systemd delegation for user services
  systemd.services."user@" = {
    serviceConfig = {
      # Delegate all cgroup controllers to user sessions
      Delegate = "cpu cpuset io memory pids";
    };
  };

  # If using ZFS, ensure POSIX ACL is enabled (see ZFS section below)
}
```

After applying configuration:

```bash
sudo nixos-rebuild switch
systemctl daemon-reload
```

#### Verify Delegation

```bash
# Check if delegation is active
systemctl show user@$(id -u).service | grep Delegate

# Should show:
# Delegate=yes
# DelegateControllers=cpu cpuset io memory pids
```

### Option 2: Use systemd-run with Explicit Delegation

If declarative configuration doesn't work, wrap the kind command with systemd-run:

```bash
systemd-run --scope --user -p "Delegate=yes" kind create cluster
```

Or with more explicit parameters:

```bash
systemd-run --scope --user \
  --uid=$(id -u) \
  --gid=$(id -g) \
  -p "Delegate=yes" \
  kind create cluster
```

### Option 3: Switch to Rootful Docker (If Rootless Not Required)

If rootless mode is not a hard requirement, use standard (rootful) Docker:

```nix
{
  virtualisation.docker = {
    enable = true;
    rootless.enable = false;  # Disable rootless mode
  };

  # Add your user to docker group
  users.users.<your-username>.extraGroups = [ "docker" ];
}
```

Then:

```bash
sudo nixos-rebuild switch
# Log out and back in for group changes to take effect
kind create cluster
```

### Option 4: Alternative Tools

Consider alternatives that better support rootless environments:

#### Podman with kind

```bash
# Install podman
nix-shell -p podman

# Run kind with podman (experimental)
KIND_EXPERIMENTAL_PROVIDER=podman kind create cluster
```

#### k3d (k3s in Docker)

```bash
# Install k3d
nix-shell -p k3d

# Create cluster (better rootless support)
k3d cluster create mycluster
```

#### minikube

```bash
# Install minikube
nix-shell -p minikube

# Run with docker driver
minikube start --driver=docker
```

## ZFS-Specific Considerations

If your home directory (where rootless Docker stores data) is on a ZFS filesystem, additional configuration is required.

### The ZFS Issue

Rootless Docker cannot use the ZFS storage driver directly. Instead, it must use overlay2, which requires POSIX ACL support on the underlying ZFS filesystem.

### ZFS Configuration

#### 1. Enable POSIX ACL on ZFS Dataset

```bash
# For your home directory dataset
sudo zfs set acltype=posixacl <pool>/home

# Or for a specific Docker data directory
sudo zfs set acltype=posixacl <pool>/home/<user>

# Also recommended:
sudo zfs set xattr=sa <pool>/home
```

#### 2. Verify Storage Driver

```bash
docker info | grep "Storage Driver"
# Should show: overlay2
# NOT: zfs
```

#### 3. Force Overlay2 on Non-ZFS Location (Workaround)

If you cannot enable POSIX ACL on your ZFS dataset, move Docker's data directory to a non-ZFS filesystem:

```nix
{
  virtualisation.docker.rootless = {
    enable = true;
    setSocketVariable = true;
    # Point to a non-ZFS directory
    daemon.settings = {
      data-root = "/tmp/docker";  # Or any non-ZFS location
    };
  };
}
```

### OpenZFS 2.2.0+ Note

As of OpenZFS 2.2.0 (Proxmox 8.1+), overlay2 is officially supported with ZFS as the backing filesystem. Ensure you're running a recent OpenZFS version:

```bash
zfs --version
# Should be 2.2.0 or later for best compatibility
```

## Requirements Summary

For kind to work with rootless Docker on NixOS:

### System Requirements

- ✅ **cgroup v2** enabled (default on modern NixOS)
- ✅ **systemd 244+** for proper delegation (check: `systemd --version`)
- ✅ **OpenZFS 2.2.0+** if using ZFS (check: `zfs --version`)

### Configuration Requirements

- ✅ **Systemd delegation** configured: `Delegate=cpu cpuset io memory pids`
- ✅ **Rootless Docker** enabled via NixOS configuration
- ✅ **POSIX ACL** enabled on ZFS if applicable: `acltype=posixacl`

### Verification Commands

```bash
# 1. Check cgroup version (should be v2)
mount | grep cgroup

# 2. Check systemd delegation
systemctl show user@$(id -u).service | grep Delegate

# 3. Check Docker is rootless
docker context ls
# Should show "rootless" context

# 4. Check storage driver
docker info | grep "Storage Driver"
# Should show "overlay2" not "zfs"

# 5. If using ZFS, check ACL is enabled
zfs get acltype <your-dataset>
# Should show "posixacl"
```

## Complete NixOS Configuration Example

Here's a complete working configuration for rootless kind on NixOS with ZFS:

```nix
{ config, pkgs, ... }:

{
  # Enable rootless Docker
  virtualisation.docker = {
    enable = true;
    rootless = {
      enable = true;
      setSocketVariable = true;
    };
  };

  # Configure systemd cgroup delegation
  systemd.services."user@" = {
    serviceConfig = {
      Delegate = "cpu cpuset io memory pids";
    };
  };

  # If using ZFS, ensure ACL support
  # Note: This is a manual step, not in configuration.nix
  # Run: sudo zfs set acltype=posixacl <pool>/home

  # Install kind and kubectl
  environment.systemPackages = with pkgs; [
    kind
    kubectl
    docker
  ];

  # Add your user (if not already added)
  users.users.<your-username> = {
    isNormalUser = true;
    extraGroups = [ "docker" ];  # May still be needed for socket permissions
  };
}
```

After applying:

```bash
sudo nixos-rebuild switch
# Log out and back in
# Verify delegation: systemctl show user@$(id -u).service | grep Delegate
# If using ZFS: sudo zfs set acltype=posixacl <pool>/home
kind create cluster
```

## Testing Your Setup

Once configured, test your kind cluster:

```bash
# Create cluster
kind create cluster --name test

# Verify cluster
kubectl cluster-info --context kind-test
kubectl get nodes

# Test deployment
kubectl create deployment nginx --image=nginx
kubectl get pods

# Cleanup
kind delete cluster --name test
```

## Troubleshooting

### Issue: "permission denied: /dev/mapper/control"

**Cause**: Rootless Docker cannot access device mapper nodes.

**Solution**:

1. Verify systemd delegation is configured
2. Try `systemd-run --scope --user -p "Delegate=yes" kind create cluster`
3. Consider switching to rootful Docker if rootless is not required

### Issue: "Storage Driver: zfs" on rootless Docker

**Cause**: Home directory is on ZFS without POSIX ACL support.

**Solution**:

```bash
# Enable POSIX ACL on ZFS
sudo zfs set acltype=posixacl <pool>/home
sudo zfs set xattr=sa <pool>/home

# Verify
docker info | grep "Storage Driver"  # Should now show "overlay2"
```

### Issue: "Delegate=no" after configuration

**Cause**: systemd configuration not reloaded or user session not restarted.

**Solution**:

```bash
sudo systemctl daemon-reload
# Log out and back in, or:
sudo systemctl restart user@$(id -u).service
```

### Issue: cgroup v1 system

**Cause**: System using cgroup v1 (kind requires v2 for rootless).

**Solution**:

```nix
# In configuration.nix
systemd.enableUnifiedCgroupHierarchy = true;
```

Then rebuild and reboot:

```bash
sudo nixos-rebuild switch
sudo reboot
```

## Known Limitations

1. **Device Mounting**: Rootless containers cannot mount privileged devices like `/dev/mapper`
2. **Performance**: Rootless mode may have slight performance overhead due to user namespace remapping
3. **Filesystem Support**: Not all filesystem features work in rootless mode (e.g., some quota systems)
4. **Port Binding**: Binding to ports < 1024 requires additional configuration (not covered here)

## References

- [Kind Rootless Documentation](https://kind.sigs.k8s.io/docs/user/rootless/)
- [NixOS Docker Rootless Module](https://github.com/NixOS/nixpkgs/blob/master/nixos/modules/virtualisation/docker-rootless.nix)
- [Rootless Containers](https://rootlesscontaine.rs/)
- [NixOS ZFS Wiki](https://nixos.wiki/wiki/ZFS)
- [Kind Issue #3963](https://github.com/kubernetes-sigs/kind/issues/3963) - Rootless Docker permission denied

## Related Documentation

- [kind-cluster-testing.md](./kind-cluster-testing.md) - Testing guide for kind clusters
- [kubernetes-integration.md](./kubernetes-integration.md) - General Kubernetes integration docs

## Need Help?

If you continue experiencing issues:

1. Check the GitHub issues linked above for latest updates
2. Verify all requirements are met using the verification commands
3. Consider using rootful Docker or alternative tools (k3d, minikube) if rootless is not essential
4. Join the [NixOS Discourse](https://discourse.nixos.org/) for community support

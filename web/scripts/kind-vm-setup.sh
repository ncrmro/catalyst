#!/bin/bash

# Detect if being sourced vs executed
(return 0 2>/dev/null) && SOURCED=1 || SOURCED=0

# Only set -e if not being sourced (to avoid killing parent shell)
if [ $SOURCED -eq 0 ]; then
    set -e
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
KUBE_DIR="$PROJECT_ROOT/.kube"
KUBE_CONFIG="$KUBE_DIR/config"

# Load ports from .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep "^KIND_SSH_PORT=" "$PROJECT_ROOT/.env" | xargs)
    export $(grep "^KIND_K8S_PORT=" "$PROJECT_ROOT/.env" | xargs)
fi

# Use environment variables for ports with defaults
KIND_SSH_PORT=${KIND_SSH_PORT:-2222}
KIND_K8S_PORT=${KIND_K8S_PORT:-6443}

# SSH options for local VM (skip host key checking, force password auth with empty password)
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=2 -o PreferredAuthentications=password -o PasswordAuthentication=yes -o PubkeyAuthentication=no"

mkdir -p "$KUBE_DIR"

echo "Checking Kind VM status..."
if ! timeout 2 bash -c "</dev/tcp/localhost/$KIND_SSH_PORT" 2>/dev/null; then
  echo "✗ Kind VM not running (port $KIND_SSH_PORT not responding)"
  echo "  Start with: nix run .#vm"
  echo "  Or: make kind-vm-start"
  if [ $SOURCED -eq 0 ]; then
    exit 1
  else
    return 1
  fi
fi

echo "✓ Kind VM is running"

echo "Fetching kubeconfig from VM..."
# Fetch kubeconfig using sshpass with the known password "test"
# Use nix-shell to ensure sshpass is available
nix-shell -p sshpass --run "sshpass -p 'test' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null nixos@localhost -p $KIND_SSH_PORT 'kind get kubeconfig --name kind'" > "$KUBE_CONFIG" 2>/dev/null

# Verify kubeconfig was fetched
if [ ! -f "$KUBE_CONFIG" ] || [ ! -s "$KUBE_CONFIG" ]; then
  echo "✗ Failed to fetch kubeconfig via SSH"
  echo "  Ensure VM is running: make kind-vm-health"
  if [ $SOURCED -eq 0 ]; then
    exit 1
  else
    return 1
  fi
fi

# Update the server URL to use the host-accessible port
sed -i "s|server: https://0.0.0.0:6443|server: https://0.0.0.0:$KIND_K8S_PORT|g" "$KUBE_CONFIG"

echo "✓ Kubeconfig saved to .kube/config"

# Export KUBECONFIG for the current shell (when sourced)
export KUBECONFIG="$KUBE_CONFIG"

if [ $SOURCED -eq 1 ]; then
  echo "✓ KUBECONFIG exported to current shell"
  echo "  You can now use kubectl directly"
else
  echo ""
  echo "To use kubectl with Kind VM, run:"
  echo "  export KUBECONFIG=\$(pwd)/.kube/config"
  echo ""
  echo "Or add to your shell:"
  echo "  source scripts/kind-vm-setup.sh"
fi

echo ""
echo "Integration tests will automatically use this config via KUBECONFIG_PRIMARY"

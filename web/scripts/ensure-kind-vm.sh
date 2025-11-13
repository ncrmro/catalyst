#!/bin/bash
# Ensures Kind VM is running before tests

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Use environment variables for ports with defaults
KIND_SSH_PORT=${KIND_SSH_PORT:-2222}

# SSH options for local VM (skip host key checking)
SSH_OPTS="-q -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# Check if VM is already running
if ssh $SSH_OPTS -o ConnectTimeout=2 nixos@localhost -p "$KIND_SSH_PORT" exit 2>/dev/null; then
  echo "✓ Kind VM already running"
else
  echo "Kind VM not running, starting..."
  echo "This may take 30-60 seconds..."

  # Start VM in background
  cd "$PROJECT_ROOT"
  nix run .#vm &
  VM_PID=$!

  echo "Waiting for Kind VM to boot (max 90s)..."
  for i in {1..90}; do
    if ssh $SSH_OPTS -o ConnectTimeout=1 nixos@localhost -p "$KIND_SSH_PORT" exit 2>/dev/null; then
      echo "✓ Kind VM ready after ${i}s"
      break
    fi

    if [ $i -eq 90 ]; then
      echo "✗ Timeout waiting for Kind VM"
      echo "  VM process: $VM_PID"
      echo "  Try manually: nix run .#vm"
      exit 1
    fi

    # Show progress every 10 seconds
    if [ $((i % 10)) -eq 0 ]; then
      echo "  Still waiting... (${i}s elapsed)"
    fi

    sleep 1
  done
fi

# Configure kubeconfig
echo "Configuring kubeconfig..."
bash "$SCRIPT_DIR/kind-vm-setup.sh"

# Export for current shell and subprocesses
export KUBECONFIG="$PROJECT_ROOT/.kube/config"
export KUBECONFIG_PRIMARY=$(base64 -w 0 "$PROJECT_ROOT/.kube/config")

echo "✓ Environment configured"
echo "  KUBECONFIG=$KUBECONFIG"
echo "  KUBECONFIG_PRIMARY set (base64 encoded)"

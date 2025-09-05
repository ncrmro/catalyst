#!/bin/bash
# Run integration test for PR pod and verify results with kubectl

set -e

# Determine project root and web directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../" && pwd)"
WEB_DIR="${ROOT_DIR}/web"

# Use devbox kubeconfig for kubectl commands
if [ -f "${ROOT_DIR}/kubeconfig.devbox.yml" ]; then
  export KUBECONFIG="${ROOT_DIR}/kubeconfig.devbox.yml"
  echo "Using kubeconfig.devbox.yml for kubectl commands"
else
  echo "Warning: kubeconfig.devbox.yml not found. kubectl commands may not use the right cluster."
fi

# Check if we're already in the web directory
if [ -f "package.json" ] && [ "$(pwd)" != "${WEB_DIR}" ]; then
  # We're in some other directory with package.json, need to ensure it's the right one
  if grep -q "catalyst" "package.json"; then
    WEB_DIR="$(pwd)"
  fi
fi

# Change to web directory if needed
if [ "$(pwd)" != "${WEB_DIR}" ]; then
  echo "Changing to web directory..."
  cd "${WEB_DIR}"
fi

echo "Running from directory: $(pwd)"

# Run the test in background
echo "Running pull request pod integration test..."
npx vitest run __tests__/integration/k8s-pull-request-pod.test.ts -t "Job Creation and Execution" &

# Store test process ID
TEST_PID=$!

# Wait a bit for job creation
echo "Waiting for job creation..."
sleep 15

# Show created jobs and pods
echo -e "\nChecking for created jobs..."
kubectl get jobs -l "app=catalyst-pr-job"

echo -e "\nChecking for created pods..."
kubectl get pods -l "app=catalyst-pr-job"

# Wait for test to complete
echo -e "\nWaiting for test to complete..."
wait $TEST_PID

echo -e "\nTest completed."

# Show final status of jobs and pods
echo -e "\nFinal status of jobs:"
kubectl get jobs -l "app=catalyst-pr-job"

echo -e "\nFinal status of pods:"
kubectl get pods -l "app=catalyst-pr-job"

echo -e "\nTo see logs from a pod, run: kubectl logs <pod-name>"
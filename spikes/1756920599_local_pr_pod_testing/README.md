# Spike: Local Pull Request Pod Testing

This spike explores the simplest solution for quickly testing pull request pod jobs locally using the dev cluster.

## End Goal for Pull Request Pods

The ultimate goal of the pull request pod functionality is to provide a comprehensive CI/CD workflow for GitHub pull requests:

1. **Pull Request Awareness**: When created, the pod should be aware of the specific pull request it's building for, including the target branch.

2. **Artifact Building**: The pod should detect and build the relevant artifacts (Dockerfiles, etc.) from the pull request.

3. **Current Implementation**: Currently focused on using the buildx Kubernetes driver to build Dockerfiles.

4. **Future Enhancements**:
   - Use `buildx bake` to build all images using the Kubernetes driver
   - Deploy applications using Helm charts
   - Run CI tests on the deployed applications
   - Provide feedback on the GitHub pull request

## Problem Statement

Currently, testing pull request pod jobs requires a full GitHub webhook integration, which makes local development and testing challenging. We need a way to:

1. Test pull request pod job creation and execution locally
2. Use a development Kubernetes cluster (kind) instead of a production cluster
3. Verify job success without relying on GitHub webhooks

## Solution Approach

The simplest solution is to leverage the existing integration tests to simulate a GitHub webhook:

1. Run the existing integration test that creates pull request pods
2. The test uses the local Kubernetes config (KUBECONFIG_PRIMARY) to simulate the webhook process
3. The test automatically creates the service account and pull request pod job
4. We can use `kubectl` to verify the pod has succeeded
5. This approach simulates the entire GitHub webhook flow without requiring actual GitHub events

## Implementation

### 1. GitHub Personal Access Token (PAT) Setup

The PR pod needs a GitHub PAT to clone repositories. The token is automatically loaded from `web/.env`:

```bash
# The test script will automatically load GITHUB_PAT from web/.env
# Alternatively, you can set it manually:
export GITHUB_PAT=your_personal_access_token
```

### 2. PR Pod with GitHub Authentication

The PR pod is configured to:
1. Use a GitHub PAT stored as a Kubernetes secret
2. Clone a repository using the PAT for authentication
3. Access and read files from the cloned repository
4. Prepare the environment for buildx container builds

The pod YAML (`test-pr-pod.yaml`) creates a job that:
- Uses the `docker:24-git` image (includes git and docker tools)
- Configures git credential helper to use the PAT
- Clones the specified repository
- Verifies file access and checks for Dockerfile presence

### 3. Test Scripts

#### Running the PR Pod Test

```bash
# From the spike directory
cd spikes/1756920599_local_pr_pod_testing/

# Run the test (automatically loads PAT from web/.env)
./test-local-pr.sh
```

This script will:
1. Load the GitHub PAT from `web/.env`
2. Create a Kubernetes secret with the PAT
3. Deploy the PR pod job
4. Stream the pod logs showing the clone process
5. Display the final job status

#### Verifying Cloned Files

```bash
# Verify that the pod can access cloned files
./verify-cloned-files.sh
```

This script checks:
- If the repository was successfully cloned
- Access to specific files (package.json, README.md, Dockerfile, etc.)
- Readiness for buildx container integration

### 4. Manual kubectl Commands

For debugging and verification:

```bash
# Use the devbox kubeconfig
export KUBECONFIG=$(pwd)/kubeconfig.devbox.yml

# Check the job status
kubectl get job test-pr-pod-with-pat

# Get the pod name
kubectl get pods -l job-name=test-pr-pod-with-pat

# View pod logs
kubectl logs -f <pod-name>

# Execute commands in the pod (if still running)
kubectl exec <pod-name> -- ls -la /workspace

# Clean up resources
kubectl delete job test-pr-pod-with-pat
kubectl delete secret github-pat-secret
```

## Expected Outcome

- Verify that pull request pod jobs can be created and executed in a local development environment
- Provide a simple way to test without requiring GitHub webhook integration
- Enable developers to quickly iterate on pull request pod job functionality

## Implementation Steps

1. Configure KUBECONFIG_DEV environment variable with kind cluster configuration
2. Create the integration test file
3. Create the test script
4. Verify successful execution of pull request pod jobs locally

This approach follows the spike principles of finding the simplest solution to a well-defined problem, with minimal changes to the existing codebase.

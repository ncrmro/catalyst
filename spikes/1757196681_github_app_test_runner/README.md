# GitHub App Test Runner Spike

This spike demonstrates how to set up a GitHub Actions runner using GitHub App authentication for testing purposes only.

## Problem Statement

We need to create a test GitHub Actions runner that:
- Uses GitHub App authentication (not PAT)
- Sources configuration from web/.env
- Validates all required environment variables exist
- Creates Kubernetes secrets automatically
- Applies the runner scale set manifest

## Solution Overview

This solution provides:
1. A shell script that validates environment variables from web/.env
2. Automatic creation of Kubernetes secrets for GitHub App authentication
3. A runner scale set manifest configured for testing
4. Error handling for missing requirements

## Required Environment Variables

The following variables must be set in `web/.env`:

```bash
# GitHub App Configuration (required for runner authentication)
GITHUB_APP_ID=your_app_id_here
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your_private_key_here
-----END RSA PRIVATE KEY-----"

# Optional: Installation ID (will use app-level if not provided)
GITHUB_APP_INSTALLATION_ID=your_installation_id_here
```

## Prerequisites

- Kubernetes cluster with Actions Runner Controller installed
- kubectl configured and authenticated
- GitHub App created with Actions permissions
- cert-manager installed in the cluster

## Usage

1. Ensure your `web/.env` file contains the required GitHub App variables
2. Run the deployment script:

```bash
./deploy-test-runner.sh
```

The script will:
- Validate all required environment variables exist
- Create the `arc-runners` namespace if it doesn't exist
- Create Kubernetes secrets from your environment variables  
- Apply the runner scale set manifest
- Verify the deployment

## Testing

After deployment, you can verify the runner is working by:

1. Check the runner scale set status:
```bash
kubectl get runnerscaleset -n arc-runners
```

2. Check for available runners in your GitHub repository's Actions settings

3. Create a test workflow that uses the `test-runner` label

## Security Notes

- This is for **testing purposes only** - do not use in production
- The GitHub App private key is stored as a Kubernetes secret
- Ensure your `.env` file is not committed to version control
- The runner has minimal permissions for testing workflows only

## Cleanup

To remove the test runner:

```bash
kubectl delete runnerscaleset github-app-test-runner -n arc-runners
kubectl delete secret github-app-auth -n arc-runners
```
#!/bin/sh
# Git Clone Script for Catalyst Build Jobs
#
# This script sets up the git credential helper and clones a repository.
# It's designed to run as an init container in Kubernetes build jobs.
#
# Required environment variables:
#   GIT_REPO_URL       - Repository URL to clone
#   GIT_COMMIT         - Commit SHA to checkout
#   GIT_CLONE_ROOT     - Root directory for clone (e.g., /workspace)
#   GIT_CLONE_DEST     - Destination subdirectory (e.g., source)
#   INSTALLATION_ID    - GitHub App installation ID
#   CATALYST_WEB_URL   - URL of the Catalyst web server (optional)
#
# The credential helper script must be mounted at /scripts/git-credential-catalyst.sh

set -e

echo "=== Setting up Git Credential Helper ==="

# Verify credential helper exists
if [ ! -f /scripts/git-credential-catalyst.sh ]; then
    echo "Error: Credential helper not found at /scripts/git-credential-catalyst.sh" >&2
    exit 1
fi

# Configure git to use the credential helper
# Note: The script should already be executable via ConfigMap defaultMode
git config --global credential.helper /scripts/git-credential-catalyst.sh
echo "Git credential helper configured"

# Validate required environment variables
if [ -z "$GIT_REPO_URL" ]; then
    echo "Error: GIT_REPO_URL not set" >&2
    exit 1
fi

if [ -z "$GIT_COMMIT" ]; then
    echo "Error: GIT_COMMIT not set" >&2
    exit 1
fi

GIT_CLONE_ROOT="${GIT_CLONE_ROOT:-/workspace}"
GIT_CLONE_DEST="${GIT_CLONE_DEST:-source}"

CLONE_PATH="$GIT_CLONE_ROOT/$GIT_CLONE_DEST"

echo "=== Cloning Repository ==="
echo "URL: $GIT_REPO_URL"
echo "Commit: $GIT_COMMIT"
echo "Destination: $CLONE_PATH"

# Clone repository
git clone "$GIT_REPO_URL" "$CLONE_PATH"

# Checkout specific commit
cd "$CLONE_PATH"
git checkout "$GIT_COMMIT"

echo "=== Clone Complete ==="
echo "Repository cloned at commit $GIT_COMMIT"

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

# Handle existing directories
if [ -d "$CLONE_PATH/.git" ]; then
    # Already cloned — fetch to update refs only, preserving local changes
    echo "Existing git repository found at $CLONE_PATH, fetching updates..."
    cd "$CLONE_PATH"
    git fetch origin
    echo "Repository refs updated. Local working directory preserved."
elif [ -d "$CLONE_PATH" ] && [ "$(ls -A "$CLONE_PATH" 2>/dev/null || :)" ]; then
    # Non-empty but not a git repo — skip cloning to avoid data loss
    echo "Warning: Non-empty directory at $CLONE_PATH without .git directory" >&2
    echo "Skipping clone to preserve existing files. Please clean manually if needed." >&2
    exit 0
else
    # Empty or non-existent — normal clone
    git clone "$GIT_REPO_URL" "$CLONE_PATH"
    cd "$CLONE_PATH"
    git checkout "$GIT_COMMIT"
fi

echo "=== Clone Complete ==="
echo "Repository cloned at commit $GIT_COMMIT"

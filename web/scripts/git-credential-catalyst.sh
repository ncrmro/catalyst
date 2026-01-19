#!/bin/sh
# Git Credential Helper for Catalyst Environments
#
# This helper fetches fresh GitHub App installation tokens on-demand from the
# Catalyst web server, eliminating token expiration issues for git operations
# in environment pods.
#
# The helper authenticates using the pod's ServiceAccount token and fetches
# a fresh token for each git operation (clone, fetch, push).
#
# Usage: This script is configured via git config:
#   git config --global credential.helper /usr/local/bin/git-credential-catalyst

# Git credential helper protocol:
# - "get": Return credentials for a URL
# - "store": Store credentials (no-op for us)
# - "erase": Erase credentials (no-op for us)

# Read the operation from stdin
read operation

# Only handle "get" operations
if [ "$operation" != "get" ]; then
    exit 0
fi

# Read input until we get an empty line
# Git sends us key=value pairs like:
# protocol=https
# host=github.com
while IFS= read -r line; do
    [ -z "$line" ] && break
done

# Read pod's ServiceAccount token for authentication with web server
SA_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token 2>/dev/null)

if [ -z "$SA_TOKEN" ]; then
    echo "Error: Could not read ServiceAccount token" >&2
    exit 1
fi

# Get installation ID from environment variable (set by the operator)
if [ -z "$INSTALLATION_ID" ]; then
    echo "Error: INSTALLATION_ID environment variable not set" >&2
    exit 1
fi

# Get web server URL from environment or use default
WEB_SERVER_URL="${CATALYST_WEB_URL:-http://catalyst-web.catalyst-system.svc.cluster.local:3000}"

# Fetch fresh GitHub token from Catalyst web server
# The web server validates our ServiceAccount token and returns a fresh
# GitHub App installation token
TOKEN=$(curl -sf \
  -H "Authorization: Bearer $SA_TOKEN" \
  "$WEB_SERVER_URL/api/git-token/$INSTALLATION_ID")

if [ $? -ne 0 ] || [ -z "$TOKEN" ]; then
    echo "Error: Failed to get git credentials from catalyst-web" >&2
    exit 1
fi

# Output credentials in git credential helper format
echo "username=x-access-token"
echo "password=$TOKEN"

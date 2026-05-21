#!/bin/sh
# Git Credential Helper for Catalyst Build Jobs
#
# This helper fetches fresh GitHub App installation tokens on-demand from the
# Catalyst web server, eliminating token expiration issues for git operations.
#
# The helper authenticates using the pod's ServiceAccount token and fetches
# a fresh token for each git operation (clone, fetch, push).
#
# Required environment variables:
#   INSTALLATION_ID    - GitHub App installation ID
#   CATALYST_WEB_URL   - URL of the Catalyst web server (optional, has default)
#
# Usage: Configure via git config:
#   git config --global credential.helper /scripts/git-credential-catalyst.sh

set -e

# Git credential helper protocol:
# - "get": Return credentials for a URL
# - "store": Store credentials (no-op for us)
# - "erase": Erase credentials (no-op for us)

operation="$1"

# Only handle "get" operations
if [ "$operation" != "get" ]; then
    exit 0
fi

# Read input until we get an empty line (git sends key=value pairs)
while IFS= read -r line; do
    [ -z "$line" ] && break
done

# Read pod's ServiceAccount token for authentication
SA_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token 2>/dev/null)
if [ -z "$SA_TOKEN" ]; then
    echo "Error: Could not read ServiceAccount token" >&2
    exit 1
fi

# Get installation ID from environment variable (set by operator)
if [ -z "$INSTALLATION_ID" ]; then
    if [ "$ENABLE_PAT_FALLBACK" = "true" ]; then
        INSTALLATION_ID="pat"
    else
        echo "Error: INSTALLATION_ID environment variable not set" >&2
        exit 1
    fi
fi

# Get web server URL from environment or use default
WEB_URL="${CATALYST_WEB_URL:-http://catalyst-web.catalyst-system.svc.cluster.local:3000}"

# Fetch fresh GitHub token from Catalyst web server
# Use wget (available in Alpine) instead of curl
TOKEN_URL="$WEB_URL/api/git-token/$INSTALLATION_ID"
set +e
TOKEN=$(wget -q -O - --header="Authorization: Bearer $SA_TOKEN" "$TOKEN_URL" 2>/tmp/wget_err)
wget_status=$?
set -e

if [ $wget_status -ne 0 ]; then
    WGET_ERR=$(cat /tmp/wget_err 2>/dev/null)
    echo "Error: wget failed (exit $wget_status) connecting to $TOKEN_URL" >&2
    echo "wget error: $WGET_ERR" >&2
    exit 1
fi

if [ -z "$TOKEN" ]; then
    echo "Error: git-token endpoint returned empty token from $TOKEN_URL" >&2
    exit 1
fi

# Output credentials in git credential helper format
echo "username=x-access-token"
echo "password=$TOKEN"

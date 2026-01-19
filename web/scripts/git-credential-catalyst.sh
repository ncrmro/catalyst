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

# Read the operation from the first command-line argument (git passes: get, store, erase)
operation="$1"

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
RESPONSE=$(curl -sS -w '|%{http_code}' \
  -H "Authorization: Bearer $SA_TOKEN" \
  "$WEB_SERVER_URL/api/git-token/$INSTALLATION_ID")
curl_exit=$?

# Handle curl-level errors (DNS, connectivity, TLS, etc.)
if [ $curl_exit -ne 0 ]; then
    echo "Error: Failed to contact catalyst-web for git credentials (curl exit code: $curl_exit)" >&2
    exit 1
fi

# Split response into body (token) and HTTP status code
HTTP_STATUS=${RESPONSE##*|}
TOKEN=${RESPONSE%|*}

# Handle authentication/authorization failures explicitly
if [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
    echo "Error: Authentication failed when fetching git credentials from catalyst-web (HTTP status: $HTTP_STATUS)" >&2
    exit 1
fi

# Handle other non-success HTTP responses
case "$HTTP_STATUS" in
  2??) : ;;
  *)
    echo "Error: Failed to get git credentials from catalyst-web (HTTP status: $HTTP_STATUS)" >&2
    exit 1
    ;;
esac

# Verify token is not empty
if [ -z "$TOKEN" ]; then
    echo "Error: Received empty git token from catalyst-web" >&2
    exit 1
fi

# Output credentials in git credential helper format
echo "username=x-access-token"
echo "password=$TOKEN"

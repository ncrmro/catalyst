#!/bin/bash

# Script to trigger a pull request webhook event for testing PR pod creation
# This script simulates a GitHub webhook by calling the /api/github/webhook endpoint
# with a properly signed pull request payload.

set -e

# Color output for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values - optimized for 'opened' action to trigger PR pod creation
DEFAULT_ACTION="opened"
DEFAULT_REPO="ncrmro/catalyst"
DEFAULT_PR_NUMBER="123"
DEFAULT_BRANCH="main"
DEFAULT_BASE_BRANCH="main"
DEFAULT_TITLE="Test PR for webhook trigger"
DEFAULT_WEBHOOK_URL="http://localhost:3000/api/github/webhook"

# Initialize variables with defaults
ACTION="$DEFAULT_ACTION"
REPO="$DEFAULT_REPO"
PR_NUMBER="$DEFAULT_PR_NUMBER"
BRANCH="$DEFAULT_BRANCH" 
BASE_BRANCH="$DEFAULT_BASE_BRANCH"
TITLE="$DEFAULT_TITLE"
WEBHOOK_URL="$DEFAULT_WEBHOOK_URL"

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Trigger a GitHub webhook event to test PR pod creation."
    echo ""
    echo "OPTIONS:"
    echo "  --action ACTION        PR action: 'opened' or 'closed' (default: $DEFAULT_ACTION)"
    echo "  --repo REPO           Repository in owner/name format (default: $DEFAULT_REPO)"
    echo "  --pr-number NUMBER    Pull request number (default: $DEFAULT_PR_NUMBER)"
    echo "  --branch BRANCH       PR head branch (default: $DEFAULT_BRANCH)"
    echo "  --base-branch BRANCH  PR base branch (default: $DEFAULT_BASE_BRANCH)"
    echo "  --title TITLE         PR title (default: '$DEFAULT_TITLE')"
    echo "  --webhook-url URL     Webhook endpoint URL (default: $DEFAULT_WEBHOOK_URL)"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use all defaults (opens PR 123)"
    echo "  $0 --pr-number 456                   # Override PR number only"
    echo "  $0 --action closed --pr-number 123   # Close PR 123"
    echo "  $0 --repo myuser/myrepo               # Different repository"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --action)
            ACTION="$2"
            shift 2
            ;;
        --repo)
            REPO="$2"
            shift 2
            ;;
        --pr-number)
            PR_NUMBER="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --base-branch)
            BASE_BRANCH="$2"
            shift 2
            ;;
        --title)
            TITLE="$2"
            shift 2
            ;;
        --webhook-url)
            WEBHOOK_URL="$2"
            shift 2
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}=== GitHub PR Webhook Trigger ===${NC}"
echo ""

# Load environment variables from .env (now in web directory)
if [ -f "$ROOT_DIR/.env" ]; then
    export GITHUB_WEBHOOK_SECRET=$(grep "^GITHUB_WEBHOOK_SECRET=" "$ROOT_DIR/.env" | cut -d'=' -f2)
    export APP_PORT=$(grep "^APP_PORT=" "$ROOT_DIR/.env" | cut -d'=' -f2)
    echo -e "${GREEN}Loaded GITHUB_WEBHOOK_SECRET and APP_PORT from .env${NC}"
else
    echo -e "${RED}ERROR: Could not find .env file${NC}"
    echo "Please ensure .env exists with GITHUB_WEBHOOK_SECRET and APP_PORT set."
    exit 1
fi

# Set default port if not found in .env
if [ -z "$APP_PORT" ]; then
    APP_PORT="3000"
    echo -e "${YELLOW}APP_PORT not found in .env, using default: $APP_PORT${NC}"
fi

# Update webhook URL with dynamic port
WEBHOOK_URL="http://localhost:$APP_PORT/api/github/webhook"

if [ -z "$GITHUB_WEBHOOK_SECRET" ]; then
    echo -e "${RED}ERROR: GITHUB_WEBHOOK_SECRET not found in .env${NC}"
    echo "Please ensure .env contains GITHUB_WEBHOOK_SECRET=your_webhook_secret"
    exit 1
fi

# Extract owner and repo name from REPO
IFS='/' read -r OWNER REPO_NAME <<< "$REPO"

if [ -z "$OWNER" ] || [ -z "$REPO_NAME" ]; then
    echo -e "${RED}ERROR: Repository must be in 'owner/name' format${NC}"
    echo "Example: ncrmro/catalyst"
    exit 1
fi

# Validate action
if [[ "$ACTION" != "opened" && "$ACTION" != "closed" ]]; then
    echo -e "${RED}ERROR: Action must be 'opened' or 'closed'${NC}"
    exit 1
fi

echo "Configuration:"
echo "  Action: $ACTION"
echo "  Repository: $REPO"
echo "  PR Number: $PR_NUMBER"
echo "  Head Branch: $BRANCH"
echo "  Base Branch: $BASE_BRANCH"
echo "  Title: $TITLE"
echo "  Webhook URL: $WEBHOOK_URL"
echo ""

# Create the webhook payload
PAYLOAD=$(cat <<EOF
{
  "action": "$ACTION",
  "installation": {
    "id": 12345
  },
  "pull_request": {
    "id": $(date +%s),
    "number": $PR_NUMBER,
    "title": "$TITLE",
    "body": "This is a test pull request triggered via webhook script",
    "state": "$([ "$ACTION" = "opened" ] && echo "open" || echo "closed")",
    "draft": false,
    "html_url": "https://github.com/$REPO/pull/$PR_NUMBER",
    "user": {
      "login": "$OWNER",
      "avatar_url": "https://github.com/$OWNER.png"
    },
    "head": {
      "ref": "$BRANCH"
    },
    "base": {
      "ref": "$BASE_BRANCH"
    },
    "comments": 0,
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "repository": {
    "id": $(($(date +%s) % 1000000)),
    "full_name": "$REPO",
    "owner": {
      "login": "$OWNER"
    },
    "name": "$REPO_NAME"
  }
}
EOF
)

echo -e "${YELLOW}Generated payload:${NC}"
echo "$PAYLOAD" | jq . 2>/dev/null || echo "$PAYLOAD"
echo ""

# Generate HMAC signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$GITHUB_WEBHOOK_SECRET" | cut -d' ' -f2)
FULL_SIGNATURE="sha256=$SIGNATURE"

echo -e "${YELLOW}Generated signature: $FULL_SIGNATURE${NC}"
echo ""

# Generate delivery ID
DELIVERY_ID=$(uuidgen 2>/dev/null || date +%s)

echo -e "${BLUE}Sending webhook request...${NC}"

# Send the webhook request with timeout
echo "Sending POST request to: $WEBHOOK_URL"
echo "Headers:"
echo "  Content-Type: application/json"
echo "  x-github-event: pull_request"
echo "  x-github-delivery: $DELIVERY_ID"
echo "  x-hub-signature-256: $FULL_SIGNATURE"
echo ""

RESPONSE=$(curl -v -w "\nHTTP_STATUS:%{http_code}" \
  --max-time 30 \
  --connect-timeout 10 \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -H "x-github-delivery: $DELIVERY_ID" \
  -H "x-hub-signature-256: $FULL_SIGNATURE" \
  -d "$PAYLOAD" \
  "$WEBHOOK_URL" 2>&1)

CURL_EXIT_CODE=$?
if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}ERROR: curl failed with exit code $CURL_EXIT_CODE${NC}"
    case $CURL_EXIT_CODE in
        6) echo "Could not resolve host" ;;
        7) echo "Failed to connect to host" ;;
        28) echo "Operation timeout" ;;
        *) echo "Unknown curl error" ;;
    esac
    exit 1
fi

# Extract HTTP status code and response body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo ""
echo -e "${BLUE}Response:${NC}"
echo "HTTP Status: $HTTP_STATUS"
echo "Response Body:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

# Check if the request was successful
if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    if [ "$ACTION" = "opened" ]; then
        echo -e "${GREEN}✓ PR webhook sent successfully! PR pod should be created.${NC}"
        echo -e "${GREEN}Check your Kubernetes cluster for namespace 'gh-pr-$PR_NUMBER' and the PR pod job.${NC}"
    else
        echo -e "${GREEN}✓ PR webhook sent successfully! PR resources should be cleaned up.${NC}"
        echo -e "${GREEN}Check your Kubernetes cluster - namespace 'gh-pr-$PR_NUMBER' should be deleted.${NC}"
    fi
else
    echo ""
    echo -e "${RED}✗ Webhook request failed with HTTP status $HTTP_STATUS${NC}"
    exit 1
fi
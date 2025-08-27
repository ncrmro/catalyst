#!/bin/bash

# GitHub Webhook Sender for Pull Request Events
# --------------------------------------------
# Edit the values below to customize your webhook payload

# Webhook configuration
WEBHOOK_URL="https://catalyst.ncrmro.com/api/github/webhook"
WEBHOOK_SECRET="your-github-webhook-secret-here"

# Pull request details
PR_ACTION="opened" # Options: opened, closed, synchronize, reopened
PR_NUMBER=42
PR_TITLE="Test Pull Request"
PR_USER="testuser"
REPO_FULL_NAME="testorg/testrepo"

# Generate a unique delivery ID
DELIVERY_ID=$(uuidgen || date +%s)

# Create the payload
PAYLOAD=$(
  cat <<EOF
{
  "action": "$PR_ACTION",
  "pull_request": {
    "number": $PR_NUMBER,
    "title": "$PR_TITLE",
    "user": {
      "login": "$PR_USER"
    }
  },
  "repository": {
    "full_name": "$REPO_FULL_NAME"
  }
}
EOF
)

# Calculate the signature
#SIGNATURE=$(echo -n "$PAYLOAD" | openssl sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')
#SIGNATURE_HEADER="sha256=$SIGNATURE"

# Send the webhook
echo "Sending $PR_ACTION pull request webhook to $WEBHOOK_URL"
echo "Repository: $REPO_FULL_NAME, PR #$PR_NUMBER"

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: $DELIVERY_ID" \
  \
  -d "$PAYLOAD" \
  -v # -H "X-Hub-Signature-256: $SIGNATURE_HEADER" \

echo -e "\nWebhook sent!"


#!/bin/bash

# Simple webhook test script to test just the signature validation

set -e

# Get webhook secret from .env
WEBHOOK_SECRET=$(grep "^GITHUB_WEBHOOK_SECRET=" .env | cut -d'=' -f2)

if [ -z "$WEBHOOK_SECRET" ]; then
    echo "ERROR: GITHUB_WEBHOOK_SECRET not found in .env"
    exit 1
fi

# Simple test payload
PAYLOAD='{"test": "simple payload"}'

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)
FULL_SIGNATURE="sha256=$SIGNATURE"

echo "Testing webhook with simple payload..."
echo "Signature: $FULL_SIGNATURE"

# Test with a simple event type that shouldn't trigger complex operations
curl -v \
  --max-time 10 \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-github-event: ping" \
  -H "x-github-delivery: test-123" \
  -H "x-hub-signature-256: $FULL_SIGNATURE" \
  -d "$PAYLOAD" \
  "http://localhost:3000/api/github/webhook"
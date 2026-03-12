#!/usr/bin/env bash
set -euo pipefail

# Catalyst AWS Smoke Test: Cross-Account VPC Provisioning
#
# This script validates the Crossplane OIDC credential chain by provisioning
# a VPC in a target AWS account. No access keys are used.
#
# Prerequisites:
# 1. Catalyst's CloudFormation template has been run in the target AWS account.
# 2. A ProviderConfig named 'target-account-test' has been created in the cluster.
#    (Matches the output of the CloudFormation template).

PROVIDER_CONFIG="target-account-test"
VPC_NAME="smoke-test-vpc-$(date +%s)"
REGION="us-east-1"
CIDR="10.201.0.0/16"

echo "--- Catalyst AWS Smoke Test ---"
echo "Target ProviderConfig: $PROVIDER_CONFIG"
echo "VPC Name: $VPC_NAME"
echo "Region: $REGION"
echo "CIDR: $CIDR"

# 1. Create the VPC
echo -e "\n1. Applying VPC manifest..."
cat <<EOF | bin/kubectl apply -f -
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: $VPC_NAME
spec:
  forProvider:
    region: $REGION
    cidrBlock: $CIDR
    enableDnsHostnames: true
    enableDnsSupport: true
    tags:
      catalyst-managed: "true"
      catalyst-test: "smoke-test"
  providerConfigRef:
    name: $PROVIDER_CONFIG
EOF

# 2. Wait for READY status
echo -e "\n2. Waiting for VPC to be READY (this usually takes ~30-60s)..."
bin/kubectl wait --for=condition=READY=True vpc "$VPC_NAME" --timeout=120s

echo -e "\nSuccess! VPC $VPC_NAME is READY."

# 3. Instruction for manual AWS verification
echo -e "\n3. Manual Verification in AWS:"
echo "Run this command to confirm the VPC exists in the target account:"
echo "  aws ec2 describe-vpcs --filters \"Name=tag:catalyst-managed,Values=true\" --region $REGION --profile target-account"

# 4. Cleanup
echo -e "\n4. Cleaning up (deleting VPC)..."
bin/kubectl delete vpc "$VPC_NAME"

echo -e "\nSmoke test complete!"

# --- Expected Output ---
# --- Catalyst AWS Smoke Test ---
# Target ProviderConfig: target-account-test
# VPC Name: smoke-test-vpc-1710260000
# Region: us-east-1
# CIDR: 10.201.0.0/16
#
# 1. Applying VPC manifest...
# vpc.ec2.aws.upbound.io/smoke-test-vpc-1710260000 created
#
# 2. Waiting for VPC to be READY (this usually takes ~30-60s)...
# vpc.ec2.aws.upbound.io/smoke-test-vpc-1710260000 condition met
#
# Success! VPC smoke-test-vpc-1710260000 is READY.
#
# 3. Manual Verification in AWS:
# Run this command to confirm the VPC exists in the target account:
#   aws ec2 describe-vpcs --filters "Name=tag:catalyst-managed,Values=true" --region us-east-1 --profile target-account
#
# 4. Cleaning up (deleting VPC)...
# vpc.ec2.aws.upbound.io "smoke-test-vpc-1710260000" deleted
#
# Smoke test complete!

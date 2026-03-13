#!/usr/bin/env bash
set -euo pipefail

# Catalyst AWS Smoke Test: Cross-Account VPC Provisioning
#
# Validates the credential chain by provisioning a VPC in a target AWS account.
# Uses static key -> AssumeRole (with ExternalID) -> provision in customer account.
#
# Prerequisites:
# 1. Crossplane + provider-aws installed (run crossplane/dev-setup.sh)
# 2. Management credential secret created in crossplane-system namespace
# 3. A ProviderConfig named 'target-account-test' has been created

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

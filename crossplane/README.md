# Crossplane Dev Setup

Crossplane is used as a Kubernetes-native control plane to declaratively provision cloud infrastructure in customer accounts. This directory contains the dev environment setup and configuration templates.

## Prerequisites

- K3s VM running (`bin/k3s-vm`)
- `bin/kubectl` and `bin/helm` wrappers available (pre-configured with KUBECONFIG)

## Quick Start

```bash
# From the project root:
crossplane/dev-setup.sh
```

The script is idempotent — safe to run multiple times.

## What It Does

1. Adds the Crossplane Helm repo (`crossplane-stable`)
2. Installs/upgrades Crossplane core into the `crossplane-system` namespace
3. Installs `provider-aws` (Upbound official provider)
4. Waits for provider-aws to become healthy

## Verification

After running the setup script:

```bash
# Crossplane pods should be running
bin/kubectl get pods -n crossplane-system

# provider-aws should show as installed and healthy
bin/kubectl get providers
```

Expected output:

```
NAME           INSTALLED   HEALTHY   PACKAGE                                    AGE
provider-aws   True        True      xpkg.upbound.io/upbound/provider-aws:...   ...
```

## Directory Structure

```
crossplane/
├── README.md                          # This file
├── dev-setup.sh                       # Installs Crossplane + provider-aws into K3s
├── onboarding/
│   └── aws-cloudformation.yaml        # Customer onboarding CloudFormation template
├── provider-configs/
│   └── aws.yaml                       # ProviderConfig template (IRSA + AssumeRole)
└── validation/
    └── aws-smoke-test.sh              # VPC provisioning smoke test
```

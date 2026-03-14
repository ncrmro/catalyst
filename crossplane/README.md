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
3. Installs `provider-aws-ec2` (Upbound family provider) — also auto-installs `provider-family-aws`
4. Waits for providers to become healthy

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
NAME                  INSTALLED   HEALTHY   PACKAGE                                         AGE
provider-aws-ec2      True        True      xpkg.upbound.io/upbound/provider-aws-ec2:...    ...
provider-family-aws   True        True      xpkg.upbound.io/upbound/provider-family-aws:... ...
```

## Credential Chain (MVP)

```
Railway env vars (AWS_ACCESS_KEY_ID/SECRET)
  → IAM user scoped to sts:AssumeRole ONLY
    → K8s Secret (aws-mgmt-creds)
      → ProviderConfig (Secret source + assumeRoleChain)
        → sts:AssumeRole(customer role ARN, ExternalID)
          → short-lived temp creds (1hr)
            → provision infrastructure in customer account
```

See `provider-configs/aws.yaml` for the ProviderConfig template.

## Compositions and Definitions

Catalyst uses Crossplane Composite Resources (XRs) to define high-level infrastructure abstractions that can be fulfilled by different cloud providers.

### XKubernetesCluster XRD

The `XKubernetesCluster` CompositeResourceDefinition (XRD) at `crossplane/definitions/xkubernetescluster.yaml` defines the schema for a Kubernetes cluster.

**Key Fields:**
- `region`: The AWS region to provision the cluster in.
- `kubernetesVersion`: The desired Kubernetes version (default: `1.31`).
- `nodePools`: An array of node pool configurations (instance type, node counts).
- `providerConfigRef`: The name of the `ProviderConfig` to use (enables multi-tenant isolation).

### AWS Kubernetes Cluster Composition

The `aws-kubernetes-cluster` Composition at `crossplane/compositions/aws-kubernetes-cluster.yaml` fulfills the `XKubernetesCluster` abstraction using AWS resources.

**Provisions:**
- **Networking**: VPC, Public & Private subnets in 2 AZs, IGW, NAT GW, and Route Tables.
- **Security**: Security groups for the control plane and worker nodes with restrictive rules.
- **Identity**: IAM Roles and Instance Profiles for CP and workers, following the `Catalyst-K8s-*` naming convention and tagged with `catalyst-managed: true`.
- **Compute**: Control plane EC2 instance and a Launch Template for worker nodes.

**Multi-Tenancy:**
Multi-tenancy is enforced by patching the `spec.providerConfigRef` from the `KubernetesCluster` claim to all managed resources. This ensures that resources are created in the correct customer account and that credentials are never leaked between tenants.

## Testing

Three testing tiers validate the Crossplane configuration:

### Tier 1: Offline YAML Validation (CI — `unit` job)

Runs on every PR touching `crossplane/**`. No cluster required.

```bash
# Lint all YAML
pip install yamllint && yamllint -d relaxed crossplane/**/*.yaml

# Validate CloudFormation structure
pip install cfn-lint && cfn-lint crossplane/onboarding/aws-cloudformation.yaml
```

### Tier 2: LocalStack Integration (CI — `integration` job)

Spins up Kind + LocalStack to test VPC create/ready/delete lifecycle without real AWS credentials.

```bash
# Locally (requires Docker + Kind + Helm):
docker run -d -p 4566:4566 localstack/localstack:3.4
kind create cluster --name crossplane-test
# Then follow the CI steps in .github/workflows/crossplane.test.yml
```

The test fixtures in `tests/fixtures/` configure Crossplane to route API calls to LocalStack via the `endpoint.url` override in the ProviderConfig.

### Tier 3: Real AWS E2E (manual `workflow_dispatch`)

Triggered manually via `.github/workflows/crossplane.e2e.yml`. Requires:
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` GitHub Secrets (management IAM user)
- A target role ARN and ExternalID (from CloudFormation onboarding)

Tests the full credential chain: static key → AssumeRole → VPC lifecycle in a real AWS account.

## Directory Structure

```
crossplane/
├── README.md                          # This file
├── dev-setup.sh                       # Installs Crossplane + provider-aws-ec2 into K3s
├── onboarding/
│   └── aws-cloudformation.yaml        # Customer onboarding CloudFormation template
├── provider-configs/
│   └── aws.yaml                       # ProviderConfig template (Secret + AssumeRole)
├── tests/
│   └── fixtures/
│       ├── localstack-creds.yaml      # Dummy Secret for LocalStack
│       ├── localstack-provider-config.yaml  # ProviderConfig targeting LocalStack
│       └── test-vpc.yaml              # VPC CR for lifecycle tests
└── validation/
    └── aws-smoke-test.sh              # VPC provisioning smoke test (manual)
```

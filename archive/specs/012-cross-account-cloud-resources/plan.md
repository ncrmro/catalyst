# Implementation Plan: Cross-Account Cloud Resource Management

**Spec**: `012-cross-account-cloud-resources`
**Branch**: `spec/012-cross-account-cloud-resources`
**Created**: 2026-03-12

<!--
  This document defines HOW to implement the feature.
  WHAT the feature does is defined in spec.md.
-->

## Summary

Use Crossplane as a Kubernetes-native control plane to declaratively provision and manage cloud infrastructure (clusters, databases, observability stacks) in customer accounts. The web app data layer (schema, models, actions, billing metering) is already implemented; this plan covers the Crossplane integration that fulfills the spec's provisioning requirements on top of that data layer.

## Technical Context

**Language/Framework**: Go (Crossplane Compositions, Crossplane Functions), TypeScript (Next.js web app data layer)
**Primary Dependencies**: Crossplane core, provider-aws, provider-gcp, provider-azure, provider-helm, provider-kubernetes
**Storage**: PostgreSQL (web app state via Drizzle ORM), Kubernetes etcd (Crossplane state)
**Testing**: Vitest (data layer — already in place), Crossplane rendering tests (compositions)

## Architecture Overview

Two-tier architecture: Catalyst's control plane hosts Crossplane and the web app; managed clusters run in customer cloud accounts.

```
┌─────────────────────────────────────────────────────────────────┐
│  CATALYST CONTROL PLANE (Catalyst's own cluster)                │
│                                                                 │
│  ┌──────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│  │   Web App    │───▶│   PostgreSQL    │    │  Crossplane   │  │
│  │  (Next.js)   │    │  (app state)    │    │    Core       │  │
│  └──────┬───────┘    └─────────────────┘    └──────┬────────┘  │
│         │ creates DB record                        │            │
│         ▼                                          ▼            │
│  ┌──────────────┐                          ┌───────────────┐   │
│  │  Controller  │─── creates Claim ───────▶│  Compositions │   │
│  │  (bridge)    │                          │  & XRDs       │   │
│  └──────────────┘                          └──────┬────────┘   │
│                                                   │            │
│                          ┌────────────────────────┤            │
│                          ▼                        ▼            │
│                   ┌─────────────┐         ┌─────────────┐      │
│                   │ provider-aws│         │provider-gcp │ ...  │
│                   │ProviderCfg A│         │ProviderCfg B│      │
│                   └──────┬──────┘         └──────┬──────┘      │
└──────────────────────────┼───────────────────────┼─────────────┘
                           │ API calls             │ API calls
                           ▼                       ▼
              ┌────────────────────┐  ┌────────────────────┐
              │ CUSTOMER ACCOUNT A │  │ CUSTOMER ACCOUNT B │
              │  ┌──────────────┐  │  │  ┌──────────────┐  │
              │  │ Self-Managed │  │  │  │ Self-Managed │  │
              │  │ K8s (EC2+    │  │  │  │ K8s (GCE+    │  │
              │  │  kubeadm)    │  │  │  │  kubeadm)    │  │
              │  │  + VPC       │  │  │  │  + VPC       │  │
              │  │  + IAM Roles │  │  │  │  + SAs       │  │
              │  │  + Node Pools│  │  │  │  + Node Pools│  │
              │  └──────────────┘  │  │  └──────────────┘  │
              └────────────────────┘  └────────────────────┘
```

**Flow**: Web app creates `ManagedCluster` DB record → bridge controller creates Crossplane `XKubernetesCluster` Claim → Crossplane provisions self-managed K8s cluster (VMs + networking + IAM identities + kubeadm bootstrap) in customer's cloud account via their ProviderConfig → status synced back to DB.

## How Crossplane Fits

Crossplane concepts mapped to Catalyst's domain:

| Crossplane Concept | Catalyst Equivalent | Spec Section |
|---|---|---|
| **ProviderConfig** | One per linked cloud account (`cloudAccounts` table) | 3.1, 3.2 |
| **CompositeResourceDefinition (XRD)** | Schema for cluster/database/observability | 4.1, 5.1, 6.1 |
| **Composition** | Reusable templates for each cloud provider | 4.2, 5.2, 6.1 |
| **Claim (XRC)** | Namespaced resource developers request (maps to `managedClusters` table) | 4.1 |
| **Continuous Reconciliation** | Drift detection and auto-repair — no manual `terraform apply` | 4.1 |
| **Crossplane Functions** | Complex provisioning logic (KCL or Go) beyond simple patches | — |

### Why Crossplane Over Alternatives

- **vs Terraform**: No state file management, continuous reconciliation, native K8s integration
- **vs Pulumi**: No separate runtime, resources are K8s CRDs queryable via kubectl
- **vs direct cloud SDKs**: Declarative rather than imperative, built-in drift detection
- Crossplane runs where Catalyst already lives (Kubernetes), avoiding operational overhead of a second control plane

## Multi-Tenancy / Cross-Account Pattern

Maps to spec sections 3.2 (Credential Management) and 3.3 (Account Isolation).

### Per-Customer ProviderConfig

Each linked cloud account gets its own `ProviderConfig` with cross-account credential delegation.

**MVP Credential Chain (AWS)**:
```
Railway env vars (AWS_ACCESS_KEY_ID/SECRET)
  → IAM user scoped to sts:AssumeRole ONLY
    → sts:AssumeRole(customer role ARN, ExternalID)
      → short-lived temp creds (1hr)
        → provision infrastructure in customer account
```

- **AWS (MVP)**: Catalyst's management plane uses a static IAM access key (stored in Railway env vars, never in the database) scoped to `sts:AssumeRole` only. Crossplane's ProviderConfig uses `Secret`-based auth referencing a K8s Secret with the static key, combined with `assumeRoleChain` to assume the customer's cross-account role with ExternalID.
- **AWS (Future)**: When migrating off Railway to a platform supporting OIDC (e.g., self-hosted K8s), replace the static key with OIDC federation — projected service account tokens authenticate directly, no static credentials needed.
- **GCP**: Workload Identity Federation — customer creates a workload identity pool with Catalyst's identity as a trusted provider.
- **Azure**: Federated credentials — customer creates an App Registration with a federated identity credential.

Customer credentials (role ARN, ExternalID) are stored encrypted (AES-256-GCM) in the `cloudAccounts` table. Temporary credentials from AssumeRole are never persisted.

### Namespace Isolation

- Each customer organization gets a dedicated Kubernetes namespace in Catalyst's control plane
- Claims are created in the org's namespace, scoped by RBAC
- Crossplane's `ProviderConfigRef` on each Claim ensures resources land in the correct cloud account
- A compromised namespace cannot reference another org's ProviderConfig (enforced by admission webhook)

### Credential Flow

1. Customer runs onboarding CloudFormation template that creates a cross-account role trusting Catalyst's AWS account ID + ExternalID
2. Customer links cloud account in Catalyst UI → `cloudAccounts` row created with the role ARN + ExternalID (encrypted at rest, AES-256-GCM)
3. Bridge controller reads `cloudAccounts`, creates a `ProviderConfig` CR with `credentials.source: Secret` (referencing the management key) and `assumeRoleChain` (customer role ARN + ExternalID)
4. Crossplane provider pod authenticates with the static management key, then calls `sts:AssumeRole` to obtain temporary credentials scoped to the customer's account
5. Customer's target role is scoped to least-privilege for the resources Catalyst manages (spec §3.2), including identity-passing permissions with tag-based conditions

### Identity Passing (The Critical "Gotcha")

Self-managed Kubernetes clusters require Catalyst to not only create VMs, but also **create cloud identities and attach them to those VMs** so that the Kubernetes Cloud Controller Manager (CCM) and CSI storage drivers can function (provisioning load balancers, attaching block storage, managing DNS).

This identity-passing privilege is the most dangerous permission Catalyst requests. If unscoped, it enables full privilege escalation — Catalyst could attach an `AdministratorAccess` role to a VM, SSH into it, and take over the customer's entire account.

#### AWS: `iam:PassRole` + Instance Profiles

The cross-account role needs `iam:PassRole` to attach IAM Instance Profiles to EC2 instances and Auto Scaling Groups.

```json
{
  "Sid": "PassRoleToK8sNodes",
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::*:role/Catalyst-K8s-*",
  "Condition": {
    "StringEquals": {
      "iam:PassedToService": ["ec2.amazonaws.com", "autoscaling.amazonaws.com"],
      "aws:ResourceTag/catalyst-managed": "true"
    }
  }
}
```

**Security guardrails:**
- `iam:PassRole` is restricted to role ARNs matching `Catalyst-K8s-*`
- `iam:PassedToService` limits which AWS services can receive the role
- Tag condition ensures only Catalyst-created roles can be passed

#### GCP: `roles/iam.serviceAccountUser`

The impersonated Provisioner Service Account needs `serviceAccountUser` on the specific Service Accounts for control plane and worker VMs.

**Security guardrails:**
- Bind `serviceAccountUser` only to specific SA resources (e.g., `catalyst-k8s-cp@project.iam.gserviceaccount.com`), never at project level
- Use IAM Conditions to restrict to SAs with specific labels

#### Azure: `Managed Identity Operator`

The Service Principal needs `Managed Identity Operator` to create User-Assigned Managed Identities and attach them to Virtual Machine Scale Sets.

**Security guardrails:**
- Scope the role assignment to a dedicated Resource Group (e.g., `rg-catalyst-k8s`)
- The Service Principal cannot modify identities outside this Resource Group

## Data Model (already implemented)

The web app data layer exists on this branch. Key tables and their Crossplane mappings:

```typescript
// cloudAccounts — stores encrypted credentials, maps to ProviderConfigs
// Fields: id, organizationId, provider, accountId, credentials (encrypted), region, status

// managedClusters — tracks cluster state, maps to Crossplane Claims
// Fields: id, organizationId, cloudAccountId, name, provider, region, kubernetesVersion,
//         status, deletionProtection, deletedAt

// nodePools — node pool configuration, maps to Composition parameters
// Fields: id, managedClusterId, name, instanceType, minNodes, maxNodes, desiredNodes

// cloudResourceUsageRecords — billing metering (spec 9.2)
// Fields: id, organizationId, cloudAccountId, resourceType, quantity, recordedAt
```

## Composition Definitions

Three core Composite Resource Definitions (XRDs) and their Compositions.

### 1. XKubernetesCluster

Provisions a self-managed Kubernetes cluster with networking and node groups. Maps to spec sections 4.1–4.3.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xkubernetesclusters.catalyst.tetraship.app
spec:
  group: catalyst.tetraship.app
  names:
    kind: XKubernetesCluster
    plural: xkubernetesclusters
  claimNames:
    kind: KubernetesCluster
    plural: kubernetesclusters
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                region:
                  type: string
                kubernetesVersion:
                  type: string
                  default: "1.31"
                nodePools:
                  type: array
                  items:
                    type: object
                    properties:
                      name:
                        type: string
                      instanceType:
                        type: string
                      minNodes:
                        type: integer
                        default: 1
                      maxNodes:
                        type: integer
                        default: 5
                      desiredNodes:
                        type: integer
                        default: 2
                      spot:
                        type: boolean
                        default: false
                providerConfigRef:
                  type: string
              required: [region, nodePools, providerConfigRef]
```

Each cloud provider gets its own Composition selecting on `spec.providerConfigRef`. These provision self-managed K8s clusters, not managed services:

- **AWS Composition**: VPC + subnets + security groups + IAM roles (control plane + worker) + IAM instance profiles + EC2 instances (control plane) + ASG (workers) + kubeadm bootstrap + cluster autoscaler
- **GCP Composition**: VPC + subnets + firewall rules + Service Accounts (control plane + worker) + GCE instances (control plane) + MIG (workers) + kubeadm bootstrap + cluster autoscaler
- **Azure Composition**: VNet + subnets + NSGs + User-Assigned Managed Identities + VMSS (control plane + workers) + kubeadm bootstrap + cluster autoscaler

### 2. XDatabase

Provisions a database instance. Maps to spec sections 5.1–5.3.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.catalyst.tetraship.app
spec:
  group: catalyst.tetraship.app
  names:
    kind: XDatabase
    plural: xdatabases
  claimNames:
    kind: Database
    plural: databases
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engine:
                  type: string
                  enum: [postgresql, mysql, redis]
                  default: postgresql
                deploymentModel:
                  type: string
                  enum: [ha, single]
                  default: single
                version:
                  type: string
                storageGb:
                  type: integer
                  default: 20
                backupRetentionDays:
                  type: integer
                targetClusterRef:
                  type: string
              required: [engine, targetClusterRef]
```

- **In-cluster Composition**: Deploys CloudNativePG operator (PostgreSQL) or equivalent operator into the provisioned cluster via provider-helm

### 3. XObservabilityStack

Provisions the monitoring/logging/alerting stack. Maps to spec section 6.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xobservabilitystacks.catalyst.tetraship.app
spec:
  group: catalyst.tetraship.app
  names:
    kind: XObservabilityStack
    plural: xobservabilitystacks
  claimNames:
    kind: ObservabilityStack
    plural: observabilitystacks
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                metricsRetentionDays:
                  type: integer
                  default: 15
                logsRetentionDays:
                  type: integer
                  default: 7
                alerting:
                  type: object
                  properties:
                    defaultAlerts:
                      type: boolean
                      default: true
                    notificationChannels:
                      type: array
                      items:
                        type: object
                targetClusterRef:
                  type: string
              required: [targetClusterRef]
```

Composition deploys into the managed cluster via provider-helm:
- **kube-prometheus-stack** (Prometheus + Grafana + Alertmanager + default dashboards)
- **Loki** (log aggregation with LogQL)
- Default alert rules: node health, disk pressure, pod crash loops, certificate expiry (spec 6.3)

## Relationship to Existing Operator

| | Catalyst Operator | Crossplane |
|---|---|---|
| **Scope** | In-cluster resources (namespaces, deployments, builds, preview environments) | Out-of-cluster cloud infrastructure (clusters, databases, VPCs) |
| **Runs in** | Each managed cluster | Catalyst's control plane cluster |
| **Manages** | Workloads inside a cluster | The clusters themselves |
| **Pattern** | Declarative reconciliation (controller-runtime) | Declarative reconciliation (Crossplane runtime) |

They complement each other: Crossplane provisions the cluster → Catalyst operator is deployed inside it to manage workloads. Both use the same architectural philosophy (desired state → reconciliation loop).

## Spike Work

### Spike: Cross-Account Self-Managed K8s via Crossplane

**Goal**: Validate that Crossplane can provision a self-managed Kubernetes cluster (EC2 + kubeadm) in a separate AWS account using static key → AssumeRole credential chain.

**Approach**:
1. Install Crossplane + provider-aws in local K3s (using existing `bin/k3s-vm` + `crossplane/dev-setup.sh`)
2. Create management IAM user (scoped to `sts:AssumeRole` only) in Catalyst's AWS account
3. Deploy CloudFormation onboarding template in target AWS account (creates cross-account role with ExternalID)
4. Create ProviderConfig using `Secret`-based auth + `assumeRoleChain` with ExternalID
5. Smoke test: provision and delete a VPC in the target account
6. Write a minimal `XKubernetesCluster` Composition (VPC + IAM roles + instance profiles + EC2 control plane + ASG workers + kubeadm bootstrap)
7. Validate that `iam:PassRole` with tag conditions works for attaching instance profiles
8. Retrieve kubeconfig and verify `kubectl get nodes` works
9. Delete the Claim and verify all resources are cleaned up (VMs, VPC, IAM roles, instance profiles)

**Success Criteria**:
- Self-managed K8s cluster created in target AWS account
- Management credential scoped to `sts:AssumeRole` only — no infrastructure permissions
- ExternalID required on all cross-account role assumptions
- `iam:PassRole` restricted by tag conditions — untagged roles cannot be passed
- CCM can provision an AWS load balancer (proves identity passing works)
- Kubeconfig retrievable and nodes Ready
- Claim deletion removes all AWS resources including IAM roles and instance profiles
- ProviderConfig credential isolation verified (second ProviderConfig cannot access first account's resources)

**Findings**: _To be filled after spike is complete._

## Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| Cluster provisioning time (SC-001) | < 20 min (self-managed K8s) | Timestamp delta: Claim creation → Ready condition |
| Drift detection latency (SC-002) | < 5 min | Time from manual AWS Console change to Crossplane detecting drift |
| Cluster deletion completeness (SC-003) | 100% resource cleanup | Post-deletion AWS resource audit (no orphaned VPCs, SGs, etc.) |
| Credential isolation (SC-004) | Zero cross-account access | Penetration test: Claim in namespace A cannot use ProviderConfig from namespace B |
| Metering accuracy (SC-005) | < 1% error | Compare `cloudResourceUsageRecords` against cloud provider billing data |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Crossplane provider gaps for niche resources | Med | Fall back to provider-terraform or direct cloud SDK for unsupported resources |
| No `terraform plan` equivalent (changes apply immediately) | Med | Use Crossplane `managementPolicies: ["Observe"]` for dry-run; validate in staging first |
| Debugging multi-controller failures is harder than monolithic IaC | Med | Structured logging, Crossplane Dashboard, controller health monitoring via observability stack |
| YAML complexity for large Compositions | Low | Use Crossplane Functions (KCL or Go) for complex logic instead of raw patches |
| Long provisioning times blocking UX | Med | Async status polling in web UI; webhook notifications on completion; progress indicators via Crossplane conditions |
| Provider rate limiting during bulk provisioning | Low | Queue-based provisioning with backoff; limit concurrent Claims per org |

## Testing Strategy

Three-tier testing strategy for Crossplane infrastructure code, complementing the existing web (Vitest/Playwright) and operator (envtest) test suites.

### Tier 1: Unit Tests (Offline)

**No cluster required. Runs in ~30 seconds. Triggered on every PR.**

Validates YAML syntax and structure without any cloud interaction.

| Test | What it validates | Tool |
|------|-------------------|------|
| YAML lint | All `crossplane/**/*.yaml` files parse correctly | `yamllint` |
| CloudFormation structure | `aws-cloudformation.yaml` has required keys (Parameters, Resources, Outputs) | Python `yaml.safe_load` |
| Composition rendering | XRD + Composition + test input → expected managed resources | `crossplane beta render` (future, when compositions exist) |

### Tier 2: Integration Tests (Kind + LocalStack)

**Runs in ~5-8 minutes. No AWS costs. Triggered on every PR.**

Deploys Crossplane + provider-aws into an ephemeral Kind cluster and points it at LocalStack (fake AWS API). Validates the full reconciliation loop: ProviderConfig → provider authenticates → creates resources → status propagates.

**How it works:** The Upbound provider-aws supports custom endpoint URLs via `spec.endpoint` on ProviderConfig. A LocalStack-specific ProviderConfig overrides all AWS service endpoints:

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: localstack
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: localstack-creds
      key: creds
  endpoint:
    hostnameImmutable: true
    url:
      type: Static
      static: http://<docker-gateway-ip>:4566
```

LocalStack runs as a GitHub Actions `services` container (same pattern as Postgres in `web.test.yml`). Kind pods reach it via the Docker gateway IP.

| Test | What it validates |
|------|-------------------|
| ProviderConfig health | provider-aws connects to LocalStack, becomes Healthy |
| VPC lifecycle | Create VPC CR → READY=True → delete → confirm gone |
| Secret-based auth | K8s Secret with creds → ProviderConfig references it correctly |

### Tier 3: E2E Tests (Real AWS)

**Runs in ~5-10 minutes. Incurs AWS costs. Manual trigger only (`workflow_dispatch`).**

Uses a dedicated test AWS account to validate the real credential chain: static IAM key → AssumeRole with ExternalID → provision real VPC → verify in AWS → delete.

| Trigger | When |
|---------|------|
| `workflow_dispatch` | Manual trigger for on-demand validation |
| Merge to main | When `crossplane/**` files change (future, opt-in) |

**NOT triggered on PRs** to avoid cost and credential exposure.

**Credential source:** GitHub Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_TEST_TARGET_ROLE_ARN`, `AWS_TEST_EXTERNAL_ID`).

**Teardown guarantees:**
- All test resources tagged with `catalyst-ci-test: true` + run timestamp
- Cleanup step runs with `if: always()` — even on test failure
- Final step queries AWS for orphaned tagged resources and warns
- 30-minute workflow timeout as safety net
- Kind cluster is ephemeral (destroyed when GHA job ends)

### Provider Strategy: Family Providers

CI uses family providers (`provider-aws-ec2`, `provider-aws-iam`) instead of the monolithic `provider-aws`. The monolith installs 1000+ CRDs and takes 5+ minutes to become healthy. Family providers install only what's needed (~2 minutes).

## File Structure

```
crossplane/
├── README.md                             # Setup instructions + testing docs
├── dev-setup.sh                          # Install Crossplane + provider-aws in K3s
├── compositions/                         # (future) XRD Compositions
├── definitions/                          # (future) CompositeResourceDefinitions
├── functions/                            # (future) Crossplane Functions
├── onboarding/
│   └── aws-cloudformation.yaml           # Customer onboarding CloudFormation template
├── provider-configs/
│   └── aws.yaml                          # Production template (Secret + AssumeRole)
├── tests/
│   └── fixtures/
│       ├── localstack-creds.yaml         # Dummy Secret for LocalStack
│       ├── localstack-provider-config.yaml  # ProviderConfig with endpoint override
│       └── test-vpc.yaml                 # VPC manifest for smoke tests
└── validation/
    └── aws-smoke-test.sh                 # Manual VPC provisioning smoke test
web/
├── src/
│   ├── db/schema.ts                      # cloudAccounts, managedClusters, nodePools (done)
│   ├── models/cloud-accounts.ts          # CRUD + encryption (done)
│   ├── models/managed-clusters.ts        # CRUD + deletion protection (done)
│   ├── models/node-pools.ts              # CRUD (done)
│   ├── actions/cloud-accounts.ts         # Server actions (done)
│   └── actions/managed-clusters.ts       # Server actions (done)
└── packages/billing/src/
    ├── constants.ts                      # Cloud meters + pricing (done)
    ├── db/schema.ts                      # cloudResourceUsageRecords (done)
    ├── cloud-usage-job.ts                # Counting + recording (done)
    └── models.ts                         # Usage query (done)
```

## Validating with a Real AWS Account

Manual validation of the cross-account provisioning flow. Not part of CI — requires an AWS account to act as a customer's target account. Validates the full chain: static key → AssumeRole (with ExternalID) → self-managed K8s provisioning with identity passing.

### Prerequisites

- An AWS account to use as the target (simulated customer)
- AWS CLI configured (`aws configure --profile target-account`)
- A Kubernetes cluster with Crossplane + provider-aws installed (local K3s via `bin/k3s-vm` works fine)
- Catalyst's management AWS credentials (IAM user scoped to `sts:AssumeRole` only)

### Public S3 Bucket for Onboarding Assets

CloudFormation QuickCreate links require the template to be hosted on S3 — GitHub raw URLs are not supported by the `templateURL` parameter. Catalyst needs a public S3 bucket to host onboarding templates.

**Bucket setup:**

```bash
# Create the bucket (us-east-1 for global access)
aws s3api create-bucket \
  --bucket tetraship-public \
  --region us-east-1

# Enable public access (required for CloudFormation QuickCreate)
aws s3api delete-public-access-block --bucket tetraship-public

# Set bucket policy — read-only public access, scoped to onboarding/ prefix
aws s3api put-bucket-policy --bucket tetraship-public --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadOnboarding",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::tetraship-public/onboarding/*"
  }]
}'

# Upload the CloudFormation template
aws s3 cp crossplane/onboarding/aws-cloudformation.yaml \
  s3://tetraship-public/onboarding/aws-cloudformation.yaml
```

**Bucket properties:**
- **Name**: `tetraship-public` (or `catalyst-onboarding`)
- **Region**: `us-east-1`
- **Public access**: Read-only, restricted to `onboarding/` prefix
- **No write access**: Only CI/CD or admin can upload templates
- **Versioning**: Enabled (so customers on older QuickCreate links don't break)

**QuickCreate URL format:**
```
https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://tetraship-public.s3.amazonaws.com/onboarding/aws-cloudformation.yaml&param_ExternalID={externalId}&param_CatalystAccountId={catalystAccountId}
```

**CI/CD**: The template should be uploaded to S3 as part of the release pipeline whenever `crossplane/onboarding/aws-cloudformation.yaml` changes.

### Step 1: Create Management IAM User (One-Time Setup)

Catalyst's management plane needs a static IAM user with only `sts:AssumeRole` permission. This is stored in Railway env vars, never in the database or source code.

```bash
# Create the management IAM user in Catalyst's own AWS account
aws iam create-user --user-name catalyst-crossplane-mgmt

# Scope to sts:AssumeRole ONLY — no other permissions
aws iam put-user-policy \
  --user-name catalyst-crossplane-mgmt \
  --policy-name AssumeRoleOnly \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "*"
    }]
  }'

# Create access key — store these in Railway env vars
aws iam create-access-key --user-name catalyst-crossplane-mgmt
# Output: AccessKeyId + SecretAccessKey → set as Railway env vars
```

### Step 2: Set Up Customer Cross-Account Role

Run the CloudFormation template in the target (customer) AWS account. This creates the cross-account role trusting Catalyst's AWS account ID + ExternalID.

```bash
# Get Catalyst's AWS account ID
CATALYST_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
EXTERNAL_ID="catalyst-$(openssl rand -hex 16)"

# Deploy the onboarding template in the customer's account
aws cloudformation create-stack \
  --stack-name catalyst-onboarding \
  --template-body file://crossplane/onboarding/aws-cloudformation.yaml \
  --parameters \
    ParameterKey=CatalystAccountId,ParameterValue=$CATALYST_ACCOUNT_ID \
    ParameterKey=ExternalID,ParameterValue=$EXTERNAL_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --profile target-account

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name catalyst-onboarding --profile target-account

# Get the role ARN
TARGET_ROLE_ARN=$(aws cloudformation describe-stacks \
  --stack-name catalyst-onboarding --profile target-account \
  --query 'Stacks[0].Outputs[?OutputKey==`ProvisioningRoleArn`].OutputValue' --output text)
echo "Target Role ARN: $TARGET_ROLE_ARN"
```

### Step 3: Configure Crossplane ProviderConfig (Secret-Based)

Create a K8s Secret with the management credentials, then a ProviderConfig that uses it with AssumeRole.

```bash
# Create the management credential secret
bin/kubectl create secret generic aws-mgmt-creds \
  -n crossplane-system \
  --from-literal=creds="[default]
aws_access_key_id = $AWS_ACCESS_KEY_ID
aws_secret_access_key = $AWS_SECRET_ACCESS_KEY"

# Create the ProviderConfig using Secret auth + AssumeRole
cat <<EOF | bin/kubectl apply -f -
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: target-account-test
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-mgmt-creds
      key: creds
  assumeRoleChain:
    - roleARN: $TARGET_ROLE_ARN
      externalID: $EXTERNAL_ID
EOF
```

### Step 4: Smoke Test — Create a VPC

Verify the AssumeRole credential chain works before attempting a full cluster.

```bash
cat <<EOF | bin/kubectl apply -f -
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: cross-account-test-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: 10.200.0.0/16
    enableDnsHostnames: true
    enableDnsSupport: true
    tags:
      catalyst-managed: "true"
      catalyst-test: "cross-account-validation"
  providerConfigRef:
    name: target-account-test
EOF

# Watch until READY=True (~30s)
bin/kubectl get vpc cross-account-test-vpc -w

# Confirm in AWS
aws ec2 describe-vpcs \
  --filters "Name=tag:catalyst-test,Values=cross-account-validation" \
  --region us-east-1 --profile target-account
```

### Step 5: Provision a Self-Managed K8s Cluster

Full provisioning test (spec §4.1, §4.2, §3.2.1).

```bash
cat <<EOF | bin/kubectl apply -f -
apiVersion: catalyst.tetraship.app/v1alpha1
kind: KubernetesCluster
metadata:
  name: validation-cluster
  namespace: tenant-test
spec:
  region: us-east-1
  kubernetesVersion: "1.31"
  nodePools:
    - name: general
      instanceType: t3.medium
      minNodes: 1
      maxNodes: 3
      desiredNodes: 2
      spot: false
  providerConfigRef: target-account-test
EOF

# Monitor (~15-20 min for self-managed K8s: VPC + IAM + VMs + kubeadm bootstrap)
bin/kubectl get kubernetescluster validation-cluster -n tenant-test -w
```

### Step 6: Connect and Validate Identity Passing

```bash
bin/kubectl get secret validation-cluster-conn -n tenant-test \
  -o jsonpath='{.data.kubeconfig}' | base64 -d > /tmp/target-kubeconfig.yaml

# Basic connectivity
KUBECONFIG=/tmp/target-kubeconfig.yaml kubectl get nodes
KUBECONFIG=/tmp/target-kubeconfig.yaml kubectl get namespaces

# Validate identity passing — CCM should be able to create a LoadBalancer
# (proves IAM instance profile was attached correctly via iam:PassRole)
KUBECONFIG=/tmp/target-kubeconfig.yaml kubectl create deployment nginx --image=nginx
KUBECONFIG=/tmp/target-kubeconfig.yaml kubectl expose deployment nginx \
  --type=LoadBalancer --port=80
KUBECONFIG=/tmp/target-kubeconfig.yaml kubectl get svc nginx -w
# Wait for EXTERNAL-IP — this confirms the AWS Cloud Controller Manager
# on the worker nodes can call the ELB API using the attached IAM role.
```

Expected: 2 nodes `Ready`, LoadBalancer gets an EXTERNAL-IP.

### Step 7: Validate PassRole Tag Restriction (Spec §3.2.1)

Confirm that `iam:PassRole` is correctly restricted to Catalyst-tagged roles.

```bash
# Create an untagged IAM role (simulating a customer's existing admin role)
aws iam create-role \
  --role-name AdminRole-DO-NOT-PASS \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  --profile target-account

# Try to create an instance profile with this untagged role
# and attach it to an EC2 instance — this MUST fail
aws iam create-instance-profile --instance-profile-name bad-profile --profile target-account
aws iam add-role-to-instance-profile \
  --instance-profile-name bad-profile \
  --role-name AdminRole-DO-NOT-PASS --profile target-account

# This should fail with AccessDenied because AdminRole-DO-NOT-PASS
# doesn't have the catalyst-managed=true tag
aws ec2 associate-iam-instance-profile \
  --iam-instance-profile Name=bad-profile \
  --instance-id <ANY_CATALYST_INSTANCE_ID> \
  --region us-east-1 --profile target-account

# Clean up the test role
aws iam remove-role-from-instance-profile --instance-profile-name bad-profile \
  --role-name AdminRole-DO-NOT-PASS --profile target-account
aws iam delete-instance-profile --instance-profile-name bad-profile --profile target-account
aws iam delete-role --role-name AdminRole-DO-NOT-PASS --profile target-account
```

### Step 8: Validate Tenant Isolation (Spec §3.3)

A Claim in a different namespace must not be able to use another tenant's ProviderConfig.

```bash
cat <<EOF | bin/kubectl apply -f -
apiVersion: catalyst.tetraship.app/v1alpha1
kind: KubernetesCluster
metadata:
  name: isolation-test
  namespace: tenant-other
spec:
  region: us-east-1
  kubernetesVersion: "1.31"
  nodePools:
    - name: general
      instanceType: t3.small
      minNodes: 1
      maxNodes: 1
      desiredNodes: 1
      spot: false
  providerConfigRef: target-account-test
EOF

# Should be rejected or show an error — must NOT provision
bin/kubectl describe kubernetescluster isolation-test -n tenant-other
```

### Step 9: Validate Deletion (Spec §4.1)

```bash
bin/kubectl delete kubernetescluster validation-cluster -n tenant-test

# Watch Crossplane clean up all AWS resources (~5-10 min)
bin/kubectl get managed -l crossplane.io/claim-name=validation-cluster -w

# Confirm nothing remains in AWS
aws ec2 describe-instances \
  --filters "Name=tag:catalyst-managed,Values=true" "Name=instance-state-name,Values=running" \
  --region us-east-1 --profile target-account
aws ec2 describe-vpcs \
  --filters "Name=tag:catalyst-managed,Values=true" \
  --region us-east-1 --profile target-account
aws iam list-roles --profile target-account \
  --query "Roles[?starts_with(RoleName, 'Catalyst-K8s-')]"
```

### Step 10: Clean Up

```bash
# Remove the smoke-test VPC
bin/kubectl delete vpc cross-account-test-vpc

# Remove the cross-account role (or delete CloudFormation stack)
aws cloudformation delete-stack --stack-name catalyst-onboarding --profile target-account

# Or manually remove the cross-account role
aws iam delete-role-policy --role-name CatalystCrossAccountRole \
  --policy-name CatalystProvisioningPolicy --profile target-account
aws iam delete-role --role-name CatalystCrossAccountRole --profile target-account
```

### Validation Checklist

| # | Check | Spec Ref | Pass/Fail |
|---|-------|----------|-----------|
| 1 | ProviderConfig uses Secret + AssumeRole (management key scoped to sts:AssumeRole only) | §3.2 | |
| 2 | VPC created in target account (credential chain works) | §3.1 | |
| 3 | Self-managed K8s cluster provisioned and nodes Ready | §4.1, §4.2 | |
| 4 | Kubeconfig retrievable, `kubectl get nodes` works | §4.1 | |
| 5 | CCM creates LoadBalancer (identity passing via iam:PassRole works) | §3.2.1 | |
| 6 | PassRole restricted to tagged roles (untagged role fails) | §3.2.1, §10.2.1 | |
| 7 | Claim in different namespace cannot use another tenant's ProviderConfig | §3.3 | |
| 8 | Claim deletion removes all AWS resources (VMs, VPC, SG, IAM roles, instance profiles) | §4.1 | |
| 9 | ExternalID enforced on cross-account role assumption | §3.2 | |
| 10 | Provisioning time < 20 minutes | SC-001 | |

## Dependencies

- `crossplane` (Helm chart) — Core Crossplane control plane runtime
- `provider-aws` — AWS resource provisioning (EC2, VPC, IAM, ASG, ELB)
- `provider-gcp` — GCP resource provisioning (GCE, VPC, IAM, MIG)
- `provider-azure` — Azure resource provisioning (VM, VNet, VMSS, Managed Identity)
- `crossplane-contrib/provider-helm` — Deploy Helm charts into provisioned clusters (observability stack, database operators)
- `crossplane-contrib/provider-kubernetes` — Create K8s resources in provisioned clusters (namespaces, RBAC, network policies)

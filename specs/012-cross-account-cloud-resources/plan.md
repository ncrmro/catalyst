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
              │  │  EKS Cluster │  │  │  │  GKE Cluster │  │
              │  │  + VPC       │  │  │  │  + VPC       │  │
              │  │  + Node Pools│  │  │  │  + Node Pools│  │
              │  └──────────────┘  │  │  └──────────────┘  │
              └────────────────────┘  └────────────────────┘
```

**Flow**: Web app creates `ManagedCluster` DB record → bridge controller creates Crossplane `XKubernetesCluster` Claim → Crossplane provisions EKS/GKE/AKS in customer's cloud account via their ProviderConfig → status synced back to DB.

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

Each linked cloud account gets its own `ProviderConfig` with provider-native identity federation:

- **AWS**: IAM role assumption via `assumeRoleArn` (customer creates role with trust policy for Catalyst's OIDC provider)
- **GCP**: Workload Identity Federation (customer creates workload identity pool with Catalyst's service account)
- **Azure**: Federated service principal with OIDC (customer creates app registration with federated credential)

### Namespace Isolation

- Each customer organization gets a dedicated Kubernetes namespace in Catalyst's control plane
- Claims are created in the org's namespace, scoped by RBAC
- Crossplane's `ProviderConfigRef` on each Claim ensures resources land in the correct cloud account
- A compromised namespace cannot reference another org's ProviderConfig (enforced by admission webhook)

### Credential Flow

1. Customer links cloud account in Catalyst UI → `cloudAccounts` row created with encrypted IAM role ARN / workload identity config
2. Bridge controller reads `cloudAccounts`, creates `ProviderConfig` CR with the credential reference
3. Crossplane provider authenticates using base credentials (stored as a K8s Secret), then calls `sts:AssumeRole` into the customer's target role
4. Customer's target role is scoped to least-privilege for the resources Catalyst manages (spec §3.2)
5. Base credentials are encrypted at rest in the K8s Secret and rotated on a schedule not exceeding 90 days (spec §3.2)

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

Provisions a managed Kubernetes cluster with networking and node groups. Maps to spec sections 4.1–4.3.

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

Each cloud provider gets its own Composition selecting on `spec.providerConfigRef`:

- **AWS Composition**: VPC + subnets + security groups + EKS cluster + managed node groups + cluster autoscaler
- **GCP Composition**: VPC + subnets + GKE cluster + node pools + cluster autoscaler
- **Azure Composition**: VNet + subnets + AKS cluster + agent pools + cluster autoscaler

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

- **In-cluster Composition** (default): Deploys CloudNativePG operator (PostgreSQL) or equivalent operator into the managed cluster via provider-helm
- **Cloud-managed Composition** (optional): Provisions RDS/Cloud SQL/Azure Database in the target account

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

### Spike: Cross-Account EKS Provisioning via Crossplane

**Goal**: Validate that Crossplane can provision an EKS cluster in a separate AWS account from a central control plane cluster.

**Approach**:
1. Install Crossplane + provider-aws in local K3s (using existing `bin/k3s-vm`)
2. Create a ProviderConfig with `assumeRoleArn` pointing to an IAM role in a separate AWS account
3. Write a minimal `XKubernetesCluster` Composition (EKS + VPC + 1 node group)
4. Apply the Claim and observe provisioning
5. Retrieve kubeconfig from the provisioned cluster
6. Delete the Claim and verify all resources are cleaned up

**Success Criteria**:
- EKS cluster created in target AWS account within 15 minutes
- Kubeconfig retrievable and `kubectl get nodes` works
- Claim deletion removes all AWS resources (VPC, subnets, security groups, EKS cluster, node group)
- ProviderConfig credential isolation verified (second ProviderConfig cannot access first account's resources)

**Findings**: _To be filled after spike is complete._

## Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| Cluster provisioning time (SC-001) | < 15 min (EKS/GKE/AKS) | Timestamp delta: Claim creation → Ready condition |
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

## File Structure

```
operator/
├── crossplane/
│   ├── compositions/
│   │   ├── kubernetes-cluster-aws.yaml
│   │   ├── kubernetes-cluster-gcp.yaml
│   │   ├── kubernetes-cluster-azure.yaml
│   │   ├── database.yaml
│   │   └── observability-stack.yaml
│   ├── definitions/                      # CompositeResourceDefinitions (XRDs)
│   │   ├── xkubernetescluster.yaml
│   │   ├── xdatabase.yaml
│   │   └── xobservabilitystack.yaml
│   ├── functions/                        # Crossplane Functions for complex logic
│   │   └── cluster-post-provision/       # Post-provision: install operator, create kubeconfig secret
│   └── provider-configs/                 # Templates for per-account ProviderConfigs
│       ├── aws.yaml
│       ├── gcp.yaml
│       └── azure.yaml
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

Manual validation of the cross-account provisioning flow. Not part of CI — requires an AWS account to act as a customer's target account. It doesn't matter where Catalyst's control plane runs; what matters is that Crossplane can authenticate to AWS and provision a complete Kubernetes cluster in the target account.

### Prerequisites

- An AWS account to use as the target (simulated customer)
- AWS CLI configured (`aws configure --profile target-account`)
- A Kubernetes cluster with Crossplane + provider-aws installed (local K3s via `bin/k3s-vm` works fine)
- AWS credentials that Crossplane can use as a base secret (IAM user access key or any credential that can call `sts:AssumeRole`)

### Step 1: Set Up AWS IAM

Create the IAM resources that model the production flow: Crossplane authenticates with base credentials, then assumes a role in the customer's account. For testing, everything can live in a single AWS account.

```bash
# 1a. Create an IAM user whose credentials Crossplane will use.
#     This user can ONLY assume roles — no direct resource access.
aws iam create-user --user-name catalyst-crossplane --profile target-account
aws iam create-access-key --user-name catalyst-crossplane --profile target-account
# Save the AccessKeyId and SecretAccessKey for Step 2.

aws iam put-user-policy \
  --user-name catalyst-crossplane \
  --policy-name AssumeRoleOnly \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/CatalystCrossAccountRole"
    }]
  }' \
  --profile target-account

# 1b. Create the target role that Crossplane assumes into.
#     In production, customers create this via CloudFormation onboarding template.
CATALYST_USER_ARN=$(aws iam get-user --user-name catalyst-crossplane \
  --profile target-account --query 'User.Arn' --output text)

aws iam create-role \
  --role-name CatalystCrossAccountRole \
  --assume-role-policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Principal\": { \"AWS\": \"$CATALYST_USER_ARN\" },
      \"Action\": \"sts:AssumeRole\",
      \"Condition\": {
        \"StringEquals\": { \"sts:ExternalId\": \"catalyst-test-external-id\" }
      }
    }]
  }" \
  --profile target-account

# 1c. Attach least-privilege permissions (spec §3.2).
#     Scoped to EKS + VPC + IAM in a single region.
aws iam put-role-policy \
  --role-name CatalystCrossAccountRole \
  --policy-name CatalystProvisioningPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "EKSAndNetworking",
        "Effect": "Allow",
        "Action": [
          "eks:*",
          "ec2:*Vpc*", "ec2:*Subnet*", "ec2:*SecurityGroup*",
          "ec2:*InternetGateway*", "ec2:*RouteTable*", "ec2:*Route",
          "ec2:*NatGateway*", "ec2:*Address*",
          "ec2:*Tags*", "ec2:DescribeAvailabilityZones"
        ],
        "Resource": "*",
        "Condition": { "StringEquals": { "aws:RequestedRegion": "us-east-1" } }
      },
      {
        "Sid": "IAMForEKS",
        "Effect": "Allow",
        "Action": [
          "iam:CreateRole", "iam:DeleteRole", "iam:GetRole",
          "iam:AttachRolePolicy", "iam:DetachRolePolicy",
          "iam:CreateOpenIDConnectProvider", "iam:DeleteOpenIDConnectProvider",
          "iam:TagRole", "iam:PassRole", "iam:CreateServiceLinkedRole"
        ],
        "Resource": "*"
      }
    ]
  }' \
  --profile target-account

# Save the role ARN
TARGET_ROLE_ARN=$(aws iam get-role --role-name CatalystCrossAccountRole \
  --profile target-account --query 'Role.Arn' --output text)
```

### Step 2: Configure Crossplane ProviderConfig

Give Crossplane the base credentials and tell it to assume into the target role.

```bash
# Create K8s Secret with the IAM user's credentials from Step 1a
bin/kubectl create secret generic aws-catalyst-creds \
  -n crossplane-system \
  --from-literal=credentials="[default]
aws_access_key_id = <ACCESS_KEY_FROM_STEP_1a>
aws_secret_access_key = <SECRET_KEY_FROM_STEP_1a>"

# Create the ProviderConfig
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
      name: aws-catalyst-creds
      key: credentials
  assumeRoleChain:
    - roleARN: $TARGET_ROLE_ARN
      externalID: catalyst-test-external-id
EOF
```

### Step 3: Smoke Test — Create a VPC

Verify the credential chain works before attempting a full cluster.

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

### Step 4: Provision an EKS Cluster

Full provisioning test (spec §4.1).

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

# Monitor (~12-15 min for EKS)
bin/kubectl get kubernetescluster validation-cluster -n tenant-test -w
```

### Step 5: Connect to the Provisioned Cluster

```bash
bin/kubectl get secret validation-cluster-conn -n tenant-test \
  -o jsonpath='{.data.kubeconfig}' | base64 -d > /tmp/target-kubeconfig.yaml

KUBECONFIG=/tmp/target-kubeconfig.yaml kubectl get nodes
KUBECONFIG=/tmp/target-kubeconfig.yaml kubectl get namespaces
```

Expected: 2 nodes `Ready`, default namespaces present.

### Step 6: Validate Tenant Isolation (Spec §3.3)

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

### Step 7: Validate Deletion (Spec §4.1)

```bash
bin/kubectl delete kubernetescluster validation-cluster -n tenant-test

# Watch Crossplane clean up all AWS resources (~5-10 min)
bin/kubectl get managed -l crossplane.io/claim-name=validation-cluster -w

# Confirm nothing remains in AWS
aws eks list-clusters --region us-east-1 --profile target-account
aws ec2 describe-vpcs \
  --filters "Name=tag:catalyst-managed,Values=true" \
  --region us-east-1 --profile target-account
```

### Step 8: Clean Up

```bash
# Remove the smoke-test VPC
bin/kubectl delete vpc cross-account-test-vpc

# Remove AWS IAM resources
aws iam delete-role-policy --role-name CatalystCrossAccountRole \
  --policy-name CatalystProvisioningPolicy --profile target-account
aws iam delete-role --role-name CatalystCrossAccountRole --profile target-account

ACCESS_KEY_ID=$(aws iam list-access-keys --user-name catalyst-crossplane \
  --profile target-account --query 'AccessKeyMetadata[0].AccessKeyId' --output text)
aws iam delete-access-key --user-name catalyst-crossplane \
  --access-key-id $ACCESS_KEY_ID --profile target-account
aws iam delete-user-policy --user-name catalyst-crossplane \
  --policy-name AssumeRoleOnly --profile target-account
aws iam delete-user --user-name catalyst-crossplane --profile target-account
```

### Validation Checklist

| # | Check | Spec Ref | Pass/Fail |
|---|-------|----------|-----------|
| 1 | ProviderConfig created with AssumeRole + ExternalID | §3.2 | |
| 2 | VPC created in target account (credential chain works) | §3.1 | |
| 3 | EKS cluster provisioned and nodes Ready | §4.1 | |
| 4 | Kubeconfig retrievable, `kubectl get nodes` works | §4.1 | |
| 5 | Claim in different namespace cannot use another tenant's ProviderConfig | §3.3 | |
| 6 | Claim deletion removes all AWS resources (VPC, SG, EKS, node groups) | §4.1 | |
| 7 | IAM role uses least-privilege permissions | §3.2 | |
| 8 | Provisioning time < 15 minutes | SC-001 | |

## Dependencies

- `crossplane` (Helm chart) — Core Crossplane control plane runtime
- `provider-aws` — AWS resource provisioning (EKS, VPC, IAM, etc.)
- `provider-gcp` — GCP resource provisioning (GKE, VPC, IAM, etc.)
- `provider-azure` — Azure resource provisioning (AKS, VNet, etc.)
- `crossplane-contrib/provider-helm` — Deploy Helm charts into managed clusters (observability stack, database operators)
- `crossplane-contrib/provider-kubernetes` — Create K8s resources in managed clusters (namespaces, RBAC, network policies)

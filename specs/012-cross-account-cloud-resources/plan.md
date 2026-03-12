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

Each linked cloud account gets its own `ProviderConfig` with provider-native identity federation. No access keys, service account JSON keys, or client secrets are used at any point.

- **AWS**: OIDC federation — customer's IAM role trust policy trusts Catalyst's K8s OIDC issuer URL. Crossplane pods use projected service account tokens to obtain temporary STS credentials, then `sts:AssumeRole` into the customer's target role.
- **GCP**: Workload Identity Federation — customer creates a workload identity pool with Catalyst's OIDC issuer as a trusted provider. Crossplane impersonates a Provisioner Service Account in the customer's project.
- **Azure**: Federated credentials — customer creates an App Registration with a federated identity credential trusting Catalyst's K8s OIDC issuer. Crossplane authenticates as the Service Principal without client secrets.

### Namespace Isolation

- Each customer organization gets a dedicated Kubernetes namespace in Catalyst's control plane
- Claims are created in the org's namespace, scoped by RBAC
- Crossplane's `ProviderConfigRef` on each Claim ensures resources land in the correct cloud account
- A compromised namespace cannot reference another org's ProviderConfig (enforced by admission webhook)

### Credential Flow

1. Customer runs onboarding template (CloudFormation / Terraform / Deployment Manager) that creates a cross-account role trusting Catalyst's OIDC issuer URL + ExternalID
2. Customer links cloud account in Catalyst UI → `cloudAccounts` row created with the role ARN / identity pool config (no secrets — just references)
3. Bridge controller reads `cloudAccounts`, creates `ProviderConfig` CR referencing the OIDC-based authentication
4. Crossplane provider pod uses its projected service account token to authenticate via OIDC federation, then assumes the customer's cross-account role
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

### Spike: Cross-Account Self-Managed K8s via Crossplane

**Goal**: Validate that Crossplane can provision a self-managed Kubernetes cluster (EC2 + kubeadm) in a separate AWS account using OIDC federation — no access keys.

**Approach**:
1. Install Crossplane + provider-aws in local K3s (using existing `bin/k3s-vm`)
2. Expose the K3s OIDC issuer endpoint (or use a projected service account token approach)
3. Create IAM role in target AWS account trusting the OIDC issuer
4. Create a ProviderConfig using OIDC-based authentication + `assumeRoleArn`
5. Write a minimal `XKubernetesCluster` Composition (VPC + IAM roles + instance profiles + EC2 control plane + ASG workers + kubeadm bootstrap)
6. Validate that `iam:PassRole` with tag conditions works for attaching instance profiles
7. Retrieve kubeconfig and verify `kubectl get nodes` works
8. Delete the Claim and verify all resources are cleaned up (VMs, VPC, IAM roles, instance profiles)

**Success Criteria**:
- Self-managed K8s cluster created in target AWS account
- Zero access keys used anywhere in the credential chain
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

Manual validation of the cross-account provisioning flow. Not part of CI — requires an AWS account to act as a customer's target account. Validates the full chain: OIDC federation → AssumeRole → self-managed K8s provisioning with identity passing.

### Prerequisites

- An AWS account to use as the target (simulated customer)
- AWS CLI configured (`aws configure --profile target-account`)
- A Kubernetes cluster with Crossplane + provider-aws installed (local K3s via `bin/k3s-vm` works fine)
- The K3s cluster's OIDC issuer URL accessible (for OIDC federation with AWS IAM)

### Step 1: Expose the Cluster OIDC Issuer

Crossplane needs to authenticate to AWS using OIDC federation — no access keys. The K8s cluster's service account token issuer must be accessible as an OIDC provider.

```bash
# Get the K8s OIDC issuer URL
OIDC_ISSUER=$(bin/kubectl get --raw /.well-known/openid-configuration | jq -r '.issuer')
echo "OIDC Issuer: $OIDC_ISSUER"

# For local K3s, you may need to expose the OIDC discovery endpoint publicly
# (e.g., via ngrok or by uploading .well-known/openid-configuration + JWKS to S3)
# See: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
#      (the self-managed variant — create your own OIDC provider in IAM)
```

### Step 2: Set Up AWS IAM with OIDC Trust

Create the IAM resources that model the production flow. The cross-account role trusts the K8s OIDC issuer — no IAM users or access keys anywhere.

```bash
# 2a. Register the OIDC provider in AWS IAM
#     Get the OIDC thumbprint (required by AWS)
OIDC_THUMBPRINT=$(echo | openssl s_client -servername "$OIDC_ISSUER_HOST" \
  -connect "$OIDC_ISSUER_HOST:443" 2>/dev/null | \
  openssl x509 -fingerprint -noout | sed 's/://g' | cut -d= -f2 | tr '[:upper:]' '[:lower:]')

aws iam create-open-id-connect-provider \
  --url "$OIDC_ISSUER" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "$OIDC_THUMBPRINT" \
  --profile target-account

OIDC_PROVIDER_ARN=$(aws iam list-open-id-connect-providers --profile target-account \
  --query "OpenIDConnectProviderList[?ends_with(Arn, '$(echo $OIDC_ISSUER | sed 's|https://||')')].Arn" \
  --output text)

# 2b. Create the cross-account role trusting the OIDC provider
#     Only the Crossplane provider service account can assume this role.
aws iam create-role \
  --role-name CatalystCrossAccountRole \
  --assume-role-policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Principal\": { \"Federated\": \"$OIDC_PROVIDER_ARN\" },
      \"Action\": \"sts:AssumeRoleWithWebIdentity\",
      \"Condition\": {
        \"StringEquals\": {
          \"$(echo $OIDC_ISSUER | sed 's|https://||'):sub\": \"system:serviceaccount:crossplane-system:provider-aws\",
          \"$(echo $OIDC_ISSUER | sed 's|https://||'):aud\": \"sts.amazonaws.com\"
        }
      }
    }]
  }" \
  --profile target-account

# 2c. Attach permissions for self-managed K8s provisioning (spec §3.2, §3.2.1)
#     Includes: EC2 (VMs, networking), IAM (roles, instance profiles, PassRole), ASG
aws iam put-role-policy \
  --role-name CatalystCrossAccountRole \
  --policy-name CatalystProvisioningPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "NetworkingAndCompute",
        "Effect": "Allow",
        "Action": [
          "ec2:RunInstances", "ec2:TerminateInstances", "ec2:DescribeInstances",
          "ec2:*Vpc*", "ec2:*Subnet*", "ec2:*SecurityGroup*",
          "ec2:*InternetGateway*", "ec2:*RouteTable*", "ec2:*Route",
          "ec2:*NatGateway*", "ec2:*Address*",
          "ec2:*Tags*", "ec2:DescribeAvailabilityZones",
          "ec2:DescribeImages", "ec2:DescribeKeyPairs",
          "ec2:CreateKeyPair", "ec2:DeleteKeyPair",
          "ec2:*Volume*", "ec2:AttachVolume", "ec2:DetachVolume",
          "elasticloadbalancing:*"
        ],
        "Resource": "*",
        "Condition": { "StringEquals": { "aws:RequestedRegion": "us-east-1" } }
      },
      {
        "Sid": "AutoScaling",
        "Effect": "Allow",
        "Action": [
          "autoscaling:*AutoScalingGroup*", "autoscaling:*LaunchConfiguration*",
          "autoscaling:*Tags*", "autoscaling:SetDesiredCapacity",
          "autoscaling:DescribeLaunchConfigurations"
        ],
        "Resource": "*",
        "Condition": { "StringEquals": { "aws:RequestedRegion": "us-east-1" } }
      },
      {
        "Sid": "IAMRolesAndProfiles",
        "Effect": "Allow",
        "Action": [
          "iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:TagRole",
          "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:PutRolePolicy",
          "iam:DeleteRolePolicy", "iam:GetRolePolicy",
          "iam:CreateInstanceProfile", "iam:DeleteInstanceProfile",
          "iam:AddRoleToInstanceProfile", "iam:RemoveRoleFromInstanceProfile",
          "iam:GetInstanceProfile", "iam:ListInstanceProfilesForRole"
        ],
        "Resource": [
          "arn:aws:iam::*:role/Catalyst-K8s-*",
          "arn:aws:iam::*:instance-profile/Catalyst-K8s-*"
        ]
      },
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
    ]
  }' \
  --profile target-account

TARGET_ROLE_ARN=$(aws iam get-role --role-name CatalystCrossAccountRole \
  --profile target-account --query 'Role.Arn' --output text)
```

### Step 3: Configure Crossplane ProviderConfig (OIDC)

No secrets created — Crossplane authenticates via projected service account token.

```bash
# Annotate the Crossplane provider service account for OIDC
bin/kubectl annotate serviceaccount provider-aws \
  -n crossplane-system \
  eks.amazonaws.com/role-arn="$TARGET_ROLE_ARN" \
  --overwrite

# Create the ProviderConfig using IRSA/OIDC authentication
cat <<EOF | bin/kubectl apply -f -
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: target-account-test
spec:
  credentials:
    source: IRSA
  assumeRoleChain:
    - roleARN: $TARGET_ROLE_ARN
EOF
```

### Step 4: Smoke Test — Create a VPC

Verify the OIDC credential chain works before attempting a full cluster.

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

# Remove the OIDC provider from AWS IAM
aws iam delete-open-id-connect-provider \
  --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" --profile target-account

# Remove the cross-account role
aws iam delete-role-policy --role-name CatalystCrossAccountRole \
  --policy-name CatalystProvisioningPolicy --profile target-account
aws iam delete-role --role-name CatalystCrossAccountRole --profile target-account
```

### Validation Checklist

| # | Check | Spec Ref | Pass/Fail |
|---|-------|----------|-----------|
| 1 | OIDC provider registered, ProviderConfig uses IRSA (no access keys) | §3.2 | |
| 2 | VPC created in target account (OIDC credential chain works) | §3.1 | |
| 3 | Self-managed K8s cluster provisioned and nodes Ready | §4.1, §4.2 | |
| 4 | Kubeconfig retrievable, `kubectl get nodes` works | §4.1 | |
| 5 | CCM creates LoadBalancer (identity passing via iam:PassRole works) | §3.2.1 | |
| 6 | PassRole restricted to tagged roles (untagged role fails) | §3.2.1, §10.2.1 | |
| 7 | Claim in different namespace cannot use another tenant's ProviderConfig | §3.3 | |
| 8 | Claim deletion removes all AWS resources (VMs, VPC, SG, IAM roles, instance profiles) | §4.1 | |
| 9 | Zero access keys used in the entire flow | §3.2 | |
| 10 | Provisioning time < 20 minutes | SC-001 | |

## Dependencies

- `crossplane` (Helm chart) — Core Crossplane control plane runtime
- `provider-aws` — AWS resource provisioning (EKS, VPC, IAM, etc.)
- `provider-gcp` — GCP resource provisioning (GKE, VPC, IAM, etc.)
- `provider-azure` — Azure resource provisioning (AKS, VNet, etc.)
- `crossplane-contrib/provider-helm` — Deploy Helm charts into managed clusters (observability stack, database operators)
- `crossplane-contrib/provider-kubernetes` — Create K8s resources in managed clusters (namespaces, RBAC, network policies)

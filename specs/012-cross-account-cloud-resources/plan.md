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
3. Crossplane provider uses ProviderConfig to authenticate API calls to customer's cloud
4. No long-lived cloud credentials stored in Crossplane — ProviderConfig references federated identity (spec 3.2)
5. If federation unavailable, encrypted keys stored in K8s Secret with 90-day rotation (spec 3.2 fallback)

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

## Dependencies

- `crossplane` (Helm chart) — Core Crossplane control plane runtime
- `provider-aws` — AWS resource provisioning (EKS, VPC, IAM, etc.)
- `provider-gcp` — GCP resource provisioning (GKE, VPC, IAM, etc.)
- `provider-azure` — Azure resource provisioning (AKS, VNet, etc.)
- `crossplane-contrib/provider-helm` — Deploy Helm charts into managed clusters (observability stack, database operators)
- `crossplane-contrib/provider-kubernetes` — Create K8s resources in managed clusters (namespaces, RBAC, network policies)

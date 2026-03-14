# Cross-Account Cloud Resource Management

**Spec**: `012-cross-account-cloud-resources`
**Created**: 2026-03-11
**Status**: Draft

## 1. Introduction

### 1.1 Purpose

This document specifies requirements for Catalyst's cross-account cloud resource management capability — the ability for a Catalyst installation to provision and manage Kubernetes clusters, databases, and observability stacks in customer cloud accounts or on bare metal infrastructure.

### 1.2 Scope

This spec covers cloud account integration, cluster lifecycle management, database provisioning, observability stack deployment, cost optimization strategy, the hybrid/bare-metal migration path, billing and metering, and security requirements.

Out of scope: Catalyst's own internal deployment, the preview environment system, VCS integrations, and CI/CD pipelines (covered by existing specs).

### 1.3 RFC 2119 Keywords

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Catalyst installation** | A running instance of the Catalyst platform, operated by the platform owner. |
| **Target account** | A cloud provider account (AWS, GCP, Azure, etc.) owned by a customer where Catalyst provisions resources on their behalf. |
| **Managed cluster** | A Kubernetes cluster provisioned and maintained by Catalyst inside a target account. |
| **Management fee** | The recurring charge Catalyst applies for provisioning, monitoring, and maintaining resources in a target account. |
| **Resource manifest** | The declarative description of desired infrastructure state that Catalyst reconciles against a target account. |
| **Credential delegate** | The mechanism by which a target account grants Catalyst limited access to provision and manage resources. |

## 3. Cloud Account Integration

### 3.1 Account Linking

- A Catalyst installation MUST support linking one or more target accounts from multiple cloud providers.
- The system MUST support AWS, GCP, and Azure as target account providers.
- The system MAY support additional cloud providers (e.g., Hetzner, DigitalOcean, OVH).
- Each target account MUST be associated with exactly one customer organization within Catalyst.
- A customer organization MAY have multiple target accounts, including accounts across different cloud providers.

### 3.2 Credential Management

- Catalyst MUST use `sts:AssumeRole` (AWS), Workload Identity (GCP), or Federated Credentials (Azure) to obtain short-lived credentials for target accounts.
- Catalyst's management credential MUST be scoped to assume-role permissions only — all infrastructure permissions come from customer-side IAM roles.
- For MVP, Catalyst MAY use a static IAM access key for its management credential, stored in the deployment environment (not in source code or database).
- Catalyst SHOULD migrate to OIDC-based identity for its management credential when the deployment platform supports it.
- Customer credentials (role ARN, ExternalID) MUST be stored encrypted at rest using AES-256-GCM.
- Temporary credentials obtained via AssumeRole MUST NOT be persisted.
- Credential delegates MUST follow least-privilege principles — Catalyst SHALL request only the permissions necessary for the resources it manages.
- Customer onboarding templates MUST require an ExternalID to prevent confused deputy attacks.

### 3.2.1 Identity Passing (Self-Managed Clusters)

Because Catalyst provisions self-managed Kubernetes clusters, the VMs running the control plane and worker nodes need their own cloud identities so that the Kubernetes Cloud Controller Manager (CCM) and CSI storage drivers can function (e.g., provisioning load balancers, attaching block storage volumes).

This means Catalyst's cross-account role MUST be able to create identities and attach them to compute resources:

- **AWS**: The cross-account role MUST have `iam:PassRole` permission. This allows Catalyst to create an IAM Instance Profile and attach it to EC2 instances / Auto Scaling Groups. `iam:PassRole` MUST be restricted to specific resource ARNs (e.g., `arn:aws:iam::*:role/Catalyst-K8s-*`) and SHOULD use tag-based conditions to prevent privilege escalation.
- **GCP**: The impersonated Service Account MUST have `roles/iam.serviceAccountUser` on the specific Service Accounts designated for control plane and worker node VMs. This role MUST NOT be granted at the project level.
- **Azure**: The Service Principal MUST have the `Managed Identity Operator` role to create and assign User-Assigned Managed Identities to Virtual Machine Scale Sets. The Service Principal MUST be scoped to a dedicated Resource Group.

The identity-passing permission is inherently dangerous — if unscoped, it enables privilege escalation (e.g., attaching an `AdministratorAccess` role to an EC2 instance). All onboarding templates MUST use Attribute-Based Access Control (ABAC) / tag-based conditions to restrict identity-passing to Catalyst-managed resources only.

### 3.3 Cluster Access

- The system MUST support VPN-based cluster access via Tailscale or Headscale.
- The system MUST provide downloadable kubeconfig files configured with Catalyst as the OIDC identity provider.
- The system MUST display cluster access credentials and connection instructions.

### 3.4 Account Isolation

- Resources provisioned in one target account MUST NOT be accessible from another target account through Catalyst's control plane.
- Catalyst MUST maintain separate authentication contexts per target account — a credential compromise in one target account MUST NOT grant access to another.
- The system SHOULD support customer-defined resource naming prefixes or tags to distinguish Catalyst-managed resources from customer-managed resources.

## 4. Kubernetes Cluster Provisioning

### 4.1 Cluster Lifecycle

- Catalyst MUST support the full cluster lifecycle: create, update (in-place upgrades), and delete.
- Cluster creation MUST be declarative — the customer specifies desired state (region, node count, instance types, Kubernetes version) and Catalyst reconciles.
- Cluster deletion MUST remove all Catalyst-provisioned resources in the target account associated with that cluster, including load balancers, persistent volumes, and DNS records.
- Cluster deletion MUST require explicit confirmation and SHOULD support a soft-delete grace period.

### 4.2 Cluster Configuration

- Catalyst MUST provision self-managed Kubernetes clusters (e.g., kubeadm, Cluster API) as the primary deployment model.
- Catalyst MUST support configuring node pools with heterogeneous instance types within a single cluster.
- The system MUST support autoscaling of node pools based on resource utilization.
- The system MUST provision clusters with a baseline security configuration including network policies, RBAC, and pod security standards.
- Catalyst MUST attach provider-native identities to cluster VMs so that the Kubernetes Cloud Controller Manager (CCM) and CSI drivers can manage cloud resources (load balancers, persistent volumes, DNS).

### 4.3 Cluster Provisioning UI

- The system MUST provide a UI for users to provision a new cluster specifying region, Kubernetes version, and instance type.
- The system MUST display cluster provisioning status (pending, provisioning, running, error).
- The system MUST provide a UI for adding and configuring autoscaling node groups.

### 4.4 Kubernetes Version Management

- Catalyst MUST track supported Kubernetes versions and SHOULD alert customers when their cluster version approaches end-of-life.
- Version upgrades MUST be performed as rolling updates with zero downtime for stateless workloads.
- The system MUST NOT perform automatic major version upgrades without customer approval.

## 5. Database Conventions

### 5.1 Deployment Models

- Catalyst MUST support two database deployment models:
  - **High-Availability (HA):** Multi-replica with automated failover, suitable for production workloads.
  - **Single-server:** Single replica, suitable for development and staging environments.
- The deployment model MUST be selectable per database instance.

### 5.2 Database Engines

- Catalyst MUST support PostgreSQL.
- Catalyst SHOULD support additional engines (MySQL, Redis, MongoDB) based on customer demand.
- Database instances MUST be provisioned using standard Kubernetes operators for the chosen engine.

### 5.3 Operations

- Catalyst MUST provide automated backups with configurable retention (default: 7 days for single-server, 30 days for HA).
- The system MUST support point-in-time recovery for HA deployments.
- Catalyst SHOULD support automated minor version upgrades for database engines.
- Connection credentials MUST be provisioned as Kubernetes secrets within the target cluster and MUST NOT be stored in Catalyst's control plane.

## 6. Observability Stack

### 6.1 Metrics

- Catalyst MUST deploy a metrics collection and storage system in each managed cluster.
- The metrics system MUST support Prometheus-compatible scrape targets and PromQL queries.
- Metrics retention MUST be configurable per cluster (default: 15 days local, with OPTIONAL long-term remote storage).

### 6.2 Logging

- Catalyst MUST deploy a log aggregation system in each managed cluster.
- The logging system MUST support LogQL-compatible queries.
- Log retention MUST be configurable per cluster (default: 7 days).

### 6.3 Alerting

- Catalyst MUST deploy an alerting system integrated with the metrics stack.
- The system MUST include a default set of infrastructure alerts (node health, disk pressure, pod crash loops, certificate expiry).
- Customers MUST be able to define custom alert rules and notification channels.
- The alerting system SHOULD support routing alerts to external systems (PagerDuty, Slack, email, webhooks).

### 6.4 Observability UI

- The system MUST provide a UI toggle to enable or disable the observability stack per cluster.
- The system MUST allow independent configuration of metrics collection, log aggregation, and alerting components.
- The system MUST display observability stack deployment status.

### 6.5 Dashboards

- Catalyst SHOULD provide pre-built dashboards for cluster health, workload metrics, and database performance.
- Dashboards MUST be accessible from the Catalyst UI without requiring direct access to the target cluster.

## 7. Cost Optimization

### 7.1 Value Proposition

- Catalyst's managed infrastructure MUST be priced below equivalent managed services from cloud providers (e.g., managed Kubernetes, managed databases) for equivalent configurations.
- The system SHOULD provide cost comparison estimates showing the difference between Catalyst-managed resources and provider-managed equivalents.

### 7.2 Resource Right-Sizing

- Catalyst SHOULD collect resource utilization data and provide recommendations for right-sizing node pools and database instances.
- The system MAY support automated right-sizing with customer-defined constraints (minimum/maximum instance sizes, budget caps).

### 7.3 Spot/Preemptible Instances

- Catalyst SHOULD support provisioning non-critical workloads on spot or preemptible instances where the target provider supports them.
- Spot instance usage MUST be opt-in per node pool and MUST NOT be applied to stateful workloads unless explicitly configured.

## 8. Hybrid and Bare Metal Ramp

### 8.1 Progressive Migration Path

- Catalyst MUST support a progressive migration path:
  1. **Cloud-only:** All resources in cloud provider accounts.
  2. **Hybrid:** Some workloads on cloud, some on customer-owned bare metal or colocation.
  3. **Bare metal:** All workloads on customer-owned hardware.
- Customers MUST be able to operate in any of these modes or a mix, without re-architecting their workloads.

### 8.2 Bare Metal Requirements

- For bare metal targets, Catalyst MUST support cluster bootstrapping given SSH access to provisioned servers.
- The system MUST support heterogeneous hardware configurations within a single bare metal cluster.
- Catalyst SHOULD provide a hardware inventory and health monitoring capability for bare metal nodes.

### 8.3 Workload Portability

- Workloads deployed through Catalyst MUST be portable between cloud and bare metal targets without application-level changes.
- The system MUST abstract storage, networking, and load balancing differences between cloud and bare metal behind consistent interfaces.

## 9. Billing and Metering

### 9.1 Management Fee Model

- Catalyst MUST charge a management fee for resources provisioned in target accounts.
- The management fee MUST be based on the resources under management (e.g., per node, per database instance, per cluster).
- Cloud infrastructure costs (compute, storage, network) are paid directly by the customer to their cloud provider — Catalyst MUST NOT intermediate these charges.

### 9.2 Billing UI

- The system MUST display the management fee associated with each managed resource before provisioning.
- The system MUST meter managed cluster and observability stack usage independently.

### 9.3 Metering

- Catalyst MUST meter resource usage per target account with at least hourly granularity.
- Usage records MUST include resource type, quantity, duration, and the target account they belong to.
- Metering data MUST be available to customers via the Catalyst UI and an API.

### 9.4 Billing Integration

- Catalyst MUST integrate with the existing billing system (spec `011-billing`).
- The system SHOULD support per-organization billing with itemized statements showing managed resources and their associated fees.
- Catalyst MAY support custom pricing tiers based on volume commitments.

## 10. Security

### 10.1 Network Isolation

- Catalyst's control plane communication with target accounts MUST occur over encrypted channels (TLS 1.2+).
- Managed clusters MUST be provisioned with network policies that deny all ingress by default.
- The system MUST support customer-defined network policies and firewall rules for managed resources.

### 10.2 Access Control

- Catalyst MUST enforce role-based access control (RBAC) for all operations on target account resources.
- Customers MUST be able to define which team members can provision, modify, or delete resources in each target account.
- All resource provisioning and modification actions MUST be logged in an immutable audit trail.

### 10.2.1 Cross-Account Privilege Escalation Prevention

- Customer onboarding templates (CloudFormation, Terraform modules, Deployment Manager templates) MUST use tag-based conditions on all identity-passing permissions (`iam:PassRole`, `serviceAccountUser`, `Managed Identity Operator`).
- Catalyst-provisioned resources MUST be tagged with a consistent identifier (e.g., `catalyst-managed: true`) and identity-passing permissions MUST be conditioned on these tags.
- Catalyst MUST NOT be able to pass arbitrary IAM roles, Service Accounts, or Managed Identities to compute resources — only those created and tagged by Catalyst's own provisioning pipeline.

### 10.3 Secrets Management

- Secrets (database credentials, TLS certificates, API keys) generated during provisioning MUST be stored exclusively in the target cluster's secret store.
- Catalyst's control plane MUST NOT retain copies of generated secrets after initial provisioning.
- The system SHOULD support integration with external secret management systems in target accounts.

### 10.4 Compliance

- Catalyst SHOULD support deploying resources in customer-specified regions to meet data residency requirements.
- The system SHOULD provide an inventory of all resources managed per target account for audit purposes.
- Catalyst MAY support compliance frameworks (SOC 2, HIPAA) as a configuration profile applied to managed clusters.

---
repo: ncrmro/catalyst
branch: spec/012-cross-account-cloud-resources
agent: gemini
priority: 1
status: ready
created: 2026-03-13
---

# Create XKubernetesCluster XRD and AWS Composition

## Description

Create the Crossplane CompositeResourceDefinition (XRD) for `XKubernetesCluster` and the AWS-specific Composition that provisions a VPC + subnets + security groups + IAM roles + EC2 instances via Crossplane managed resources.

This is the core infrastructure-as-code that makes cluster provisioning work. The XRD defines the schema (region, kubernetesVersion, nodePools), and the Composition maps that schema to concrete AWS resources.

**Important context:**
- The plan.md at `specs/012-cross-account-cloud-resources/plan.md` has the full XRD schema and Composition structure — follow it closely
- Start with AWS only (GCP/Azure are future work)
- The XRD group is `catalyst.tetraship.app`, claim kind is `KubernetesCluster`
- Use Upbound family providers (`provider-aws-ec2`, `provider-aws-iam`) not the monolithic `provider-aws`
- Compositions should use `spec.providerConfigRef` to select the target account's ProviderConfig
- Files go in `crossplane/definitions/` and `crossplane/compositions/`

**Existing worktree:** The branch already has `crossplane/dev-setup.sh`, `crossplane/README.md`, onboarding template, provider config template, test fixtures, and CI workflows. Build on top of this.

Tech stack: Crossplane XRDs (YAML CRDs), Crossplane Compositions (YAML patches), Upbound provider-aws family providers.

Read `specs/012-cross-account-cloud-resources/plan.md` section "Composition Definitions" for the full XRD schema. Read `crossplane/README.md` for existing setup. Read `AGENTS.md` for project conventions.

## Acceptance Criteria

- [x] XRD at `crossplane/definitions/xkubernetescluster.yaml` with v1alpha1 schema matching plan.md
- [x] AWS Composition at `crossplane/compositions/aws-kubernetes-cluster.yaml` that provisions:
  - [x] VPC with DNS support enabled
  - [x] Public + private subnets (at least 2 AZs)
  - [x] Internet gateway + NAT gateway
  - [x] Security groups (control plane, workers)
  - [x] IAM roles + instance profiles (control plane, workers) with `catalyst-managed: true` tag
  - [x] Launch template for worker nodes
- [x] All YAML passes `yamllint -d relaxed`
- [x] Compositions use `spec.providerConfigRef` for multi-tenant isolation
- [x] Comments explain security-critical fields (IAM, security groups, tag conditions)
- [x] `crossplane/README.md` updated with section on compositions
- [x] Existing CI (yamllint step in `crossplane.test.yml`) passes with new files

## Agent Notes

- Created `XKubernetesCluster` XRD with the required schema.
- Created `aws-kubernetes-cluster` Composition with 2 AZ support (a and b).
- Added VPC, 4 subnets, IGW, NAT GW, Route Tables, and associations.
- Added Security Groups for CP and Workers with basic ingress rules (6443 for CP, all from CP for Workers).
- Added IAM Roles and Instance Profiles for CP and Workers, with `catalyst-managed: true` tags and required naming convention `Catalyst-K8s-*`.
- Added a Control Plane EC2 instance and a Launch Template for worker nodes.
- Updated `dev-setup.sh` to include `provider-aws-iam` and `provider-aws-autoscaling` family providers.
- Verified all YAML files with `yamllint -d relaxed` (offline via `nix-shell`).

## Results

```bash
nix-shell -p yamllint --run "yamllint -d relaxed crossplane/definitions/xkubernetescluster.yaml crossplane/compositions/aws-kubernetes-cluster.yaml" && echo "SUCCESS"
warning: Nix search path entry '/nix/var/nix/profiles/per-user/root/channels' does not exist, ignoring
SUCCESS
```

# Tasks: Cross-Account Cloud Resource Management

**Spec**: `012-cross-account-cloud-resources`
**Prerequisites**: spec.md, plan.md

## Phase 1: Cross-Account Credential Chain (Spike)

**Goal**: Validate that Crossplane can provision resources in a separate AWS account using OIDC federation — no access keys anywhere in the chain.

**Why this first**: Everything in the spec depends on this credential chain working. The data layer (schema, models, actions, tests) is already implemented. This phase de-risks the architecture before building Compositions, controllers, or UI.

### Infrastructure Setup

- [ ] T001 Install Crossplane core + provider-aws in K3s dev environment
  - Update `.k3s-vm/manifests/base.json` or add Helm values
  - Verify Crossplane pods running: `bin/kubectl get pods -n crossplane-system`
  - Verify provider-aws installed: `bin/kubectl get providers`

- [ ] T002 Expose K3s OIDC issuer endpoint for AWS IAM federation
  - Extract OIDC issuer URL from K3s API server
  - Make `.well-known/openid-configuration` + JWKS accessible (S3 bucket or ngrok)
  - See plan.md "Step 1: Expose the Cluster OIDC Issuer"

### Customer-Side Onboarding

- [ ] T003 Create AWS CloudFormation onboarding template
  - File: `operator/crossplane/onboarding/aws-cloudformation.yaml`
  - Parameters: OIDCIssuerURL, ExternalID, ResourcePrefix
  - Creates: OIDC provider registration, cross-account IAM role with trust policy
  - Permissions: EC2, VPC, ASG, ELB, IAM (scoped to `Catalyst-K8s-*`), `iam:PassRole` with tag conditions (spec §3.2, §3.2.1)
  - Output: Role ARN for use in ProviderConfig

### Crossplane Configuration

- [ ] T004 Create ProviderConfig template for AWS using OIDC/IRSA
  - File: `operator/crossplane/provider-configs/aws.yaml`
  - Authentication: IRSA (projected service account token), no secrets
  - AssumeRoleChain referencing customer's cross-account role ARN
  - See plan.md "Step 3: Configure Crossplane ProviderConfig"

### Validation

- [ ] T005 Smoke test: create and delete a VPC in target AWS account
  - Apply a VPC manifest referencing the target-account ProviderConfig
  - Verify VPC appears in target account (`aws ec2 describe-vpcs`)
  - Delete the VPC CR and verify cleanup in AWS
  - Document: OIDC credential chain works / doesn't work
  - See plan.md "Step 4: Smoke Test"

- [ ] T006 Document spike findings in plan.md
  - Fill in "Findings" section of the spike in plan.md
  - Note any deviations from the planned approach
  - Record provisioning time, issues encountered, workarounds

**Checkpoint**: Crossplane can create and delete an AWS VPC in a separate account using only OIDC federation. Zero access keys used.

---

## Dependencies

```
T001 ─► T002 ─► T003 ─► T004 ─► T005 ─► T006
                  │                 │
                  │  (T003 can run  │
                  │   in parallel   │
                  │   with T002)    │
                  └─────────────────┘
```

T003 (CloudFormation template) can be authored in parallel with T002 (OIDC endpoint), since it only needs the OIDC URL as a parameter, not the actual endpoint running.

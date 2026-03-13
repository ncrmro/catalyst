# Tasks: Cross-Account Cloud Resource Management

**Spec**: `012-cross-account-cloud-resources`
**Prerequisites**: spec.md, plan.md

## Phase 1: Cross-Account Credential Chain (Spike)

**Goal**: Validate that Crossplane can provision resources in a separate AWS account using static key → AssumeRole — no infrastructure permissions on the management credential.

**Why this first**: Everything in the spec depends on this credential chain working. The data layer (schema, models, actions, tests) is already implemented. This phase de-risks the architecture before building Compositions, controllers, or UI.

### Infrastructure Setup

- [ ] T001 Install Crossplane core + provider-aws in K3s dev environment
  - Run `crossplane/dev-setup.sh` (idempotent)
  - Verify Crossplane pods running: `bin/kubectl get pods -n crossplane-system`
  - Verify provider-aws installed: `bin/kubectl get providers`

### Customer-Side Onboarding

- [ ] T002b [P] Create public S3 bucket for onboarding assets
  - Bucket: `tetraship-public` (us-east-1)
  - Public read-only access scoped to `onboarding/` prefix
  - Versioning enabled for template stability
  - See plan.md "Public S3 Bucket for Onboarding Assets"
  - CloudFormation QuickCreate `templateURL` requires S3 (GitHub raw URLs not supported)

- [ ] T003 Create AWS CloudFormation onboarding template
  - File: `crossplane/onboarding/aws-cloudformation.yaml`
  - Parameters: CatalystAccountId, ExternalID, ResourcePrefix
  - Creates: Cross-account IAM role with trust policy (AWS account principal + ExternalID condition)
  - Permissions: EC2, VPC, ASG, ELB, IAM (scoped to `Catalyst-K8s-*`), `iam:PassRole` with tag conditions (spec §3.2, §3.2.1)
  - Output: Role ARN for use in ProviderConfig

### Crossplane Configuration

- [ ] T004 Create ProviderConfig template for AWS using Secret + AssumeRole
  - File: `crossplane/provider-configs/aws.yaml`
  - Authentication: `credentials.source: Secret` referencing K8s Secret with management key
  - AssumeRoleChain with customer's cross-account role ARN + ExternalID
  - See plan.md "Step 3: Configure Crossplane ProviderConfig"

### Validation

- [ ] T005 Smoke test: create and delete a VPC in target AWS account
  - Run `crossplane/validation/aws-smoke-test.sh`
  - Verify VPC appears in target account (`aws ec2 describe-vpcs`)
  - Delete the VPC CR and verify cleanup in AWS
  - Document: AssumeRole credential chain works / doesn't work
  - See plan.md "Step 4: Smoke Test"

- [ ] T006 Document spike findings in plan.md
  - Fill in "Findings" section of the spike in plan.md
  - Note any deviations from the planned approach
  - Record provisioning time, issues encountered, workarounds

**Checkpoint**: Crossplane can create and delete an AWS VPC in a separate account using static key → AssumeRole. Management credential has zero infrastructure permissions.

---

## Dependencies

```
T001 ─► T003 ─► T004 ─► T005 ─► T006
          │                │
          │  (T003 can run │
          │   in parallel  │
          │   with T002b)  │
          └────────────────┘
```

T003 (CloudFormation template) can be authored in parallel with T002b (S3 bucket), since the template file is independent of the bucket.

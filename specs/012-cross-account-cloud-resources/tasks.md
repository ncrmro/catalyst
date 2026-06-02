# Tasks: Cross-Account Cloud Resource Management

**Spec**: `012-cross-account-cloud-resources`
**Prerequisites**: spec.md, plan.md

## Phase 1: Cross-Account Credential Chain (Spike)

**Goal**: Validate that Crossplane can provision resources in a separate AWS account using static key → AssumeRole — no infrastructure permissions on the management credential.

**Why this first**: Everything in the spec depends on this credential chain working. The data layer (schema, models, actions, tests) is already implemented. This phase de-risks the architecture before building Compositions, controllers, or UI.

### Infrastructure Setup

- [x] T001 Install Crossplane core + provider-aws in K3s dev environment
  - Run `crossplane/dev-setup.sh` (idempotent)
  - Verify Crossplane pods running: `bin/kubectl get pods -n crossplane-system`
  - Verify provider-aws installed: `bin/kubectl get providers`

### Customer-Side Onboarding

- [x] T002b [P] Create public S3 bucket for onboarding assets
  - Bucket: `tetraship-public` (us-east-1) — already exists

- [x] T003 Create AWS CloudFormation onboarding template
  - File: `crossplane/onboarding/aws-cloudformation.yaml`

### Crossplane Configuration

- [x] T004 Create ProviderConfig template for AWS using Secret + AssumeRole
  - File: `crossplane/provider-configs/aws.yaml`

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
T001 ─► T005 ─► T006
```

T001 (install Crossplane) is the only remaining blocker before the smoke test.

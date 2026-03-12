---
repo: ncrmro/catalyst
branch: spike/crossplane-k3s-setup
agent: claude
priority: 1
status: pending
created: 2026-03-12
---

# Install Crossplane + provider-aws in K3s Dev Environment

## Description

Add Crossplane core and provider-aws to the local K3s development environment so that cross-account provisioning can be tested locally. This is part of the Phase 1 spike for spec 012 (cross-account cloud resources).

The K3s dev environment is managed by `bin/k3s-vm` (Python script, NixOS + QEMU). It applies manifests from `.k3s-vm/manifests/base.json` on startup. Helm charts are installed via `bin/helm` wrapper (pre-configured with KUBECONFIG and namespace).

Read `specs/012-cross-account-cloud-resources/plan.md` for full architectural context. Read `.k3s-vm/AGENTS.md` for K3s VM details.

Tech stack: NixOS VM with K3s, QEMU, Helm, `bin/kubectl` / `bin/helm` wrappers.

## Acceptance Criteria

- [x] Crossplane core Helm chart added to K3s dev environment setup
- [x] provider-aws installed and configured as a Crossplane Provider CR
- [x] A setup script or documentation exists at `crossplane/dev-setup.sh` that installs Crossplane + provider-aws into the running K3s VM using `bin/helm`
- [x] Script is idempotent (safe to run multiple times)
- [ ] After running the script: `bin/kubectl get pods -n crossplane-system` shows Crossplane pods running, `bin/kubectl get providers` shows provider-aws installed
- [x] README at `crossplane/README.md` documents the dev setup steps

## Agent Notes

- `dev-setup.sh` uses `helm upgrade --install` which is idempotent by design
- Uses `bin/helm` and `bin/kubectl` wrappers as required by the project conventions
- provider-aws uses Upbound's official package (`xpkg.upbound.io/upbound/provider-aws:v1.14.0`)
- Kubectl verification criteria left unchecked — requires running K3s VM to validate (not available in sandbox)
- README includes directory structure showing relationship to onboarding artifacts from crossplane-aws-onboarding task

# VCS Provider Specification

This specification defines the functional requirements for Version Control System (VCS) providers in Catalyst.

## Overview

Catalyst integrates with VCS providers to:

- Authenticate users and access their repositories
- List and manage repositories
- Handle pull/merge requests and preview deployments
- Process webhooks for CI/CD automation
- Fetch file content (specs, configs)

---

## Functional Requirements

### Authentication

| ID       | Requirement                 | Status        | Notes                          |
| -------- | --------------------------- | ------------- | ------------------------------ |
| AUTH-001 | OAuth Login                 | ✓ Implemented | NextAuth.js provider           |
| AUTH-002 | Personal Access Token       | ✓ Implemented | Dev mode, env var fallback     |
| AUTH-003 | App Token Authentication    | ✓ Implemented | 8-hour token lifetime          |
| AUTH-004 | Automatic Token Refresh     | ✓ Implemented | Auto-refresh with 5-min buffer |
| AUTH-005 | Token Encryption at Rest    | ✓ Implemented | AES-256-GCM in database        |
| AUTH-006 | Installation Authentication | ✓ Implemented | For webhook operations         |
| AUTH-007 | Connection Status Check     | ✓ Implemented | Verify provider connectivity   |

### Repository Operations

| ID       | Requirement             | Status        | Notes                  |
| -------- | ----------------------- | ------------- | ---------------------- |
| REPO-001 | List User Repositories  | ✓ Implemented |                        |
| REPO-002 | List Organization Repos | ✓ Implemented |                        |
| REPO-003 | Get Repository Details  | ✓ Implemented |                        |
| REPO-004 | Get File Content        | ✓ Implemented | Decode base64 content  |
| REPO-005 | Get Directory Listing   | ✓ Implemented | List directory entries |
| REPO-006 | List User Organizations | ✓ Implemented |                        |

### Pull Request Operations

| ID     | Requirement               | Status            | Notes               |
| ------ | ------------------------- | ----------------- | ------------------- |
| PR-001 | List Pull Requests        | ✓ Implemented     |                     |
| PR-002 | Get Pull Request Details  | ✓ Implemented     | Via webhook payload |
| PR-003 | List Pull Request Reviews | ✓ Implemented     |                     |
| PR-004 | Create Pull Request       | ✗ Not implemented |                     |
| PR-005 | Update Pull Request       | ✗ Not implemented |                     |
| PR-006 | Merge Pull Request        | ✗ Not implemented |                     |

### PR Comments

| ID      | Requirement                | Status        | Notes                       |
| ------- | -------------------------- | ------------- | --------------------------- |
| CMT-001 | List PR Comments           | ✓ Implemented |                             |
| CMT-002 | Create PR Comment          | ✓ Implemented |                             |
| CMT-003 | Update PR Comment          | ✓ Implemented |                             |
| CMT-004 | Delete PR Comment          | ✓ Implemented |                             |
| CMT-005 | Find Bot Comment by Marker | ✓ Implemented | Pattern matching for marker |

### Issue Operations

| ID      | Requirement              | Status            | Notes                   |
| ------- | ------------------------ | ----------------- | ----------------------- |
| ISS-001 | List Repository Issues   | ✓ Implemented     |                         |
| ISS-002 | Filter Out Pull Requests | ✓ Implemented     | Exclude PRs from issues |
| ISS-003 | Get Issue Details        | ⚠ Partial         | Via list only           |
| ISS-004 | Create Issue             | ✗ Not implemented |                         |
| ISS-005 | Update Issue             | ✗ Not implemented |                         |

### Webhook Handling

| ID     | Requirement               | Status        | Notes                     |
| ------ | ------------------------- | ------------- | ------------------------- |
| WH-001 | Verify Webhook Signature  | ✓ Implemented | HMAC-SHA256               |
| WH-002 | Parse Webhook Event       | ✓ Implemented |                           |
| WH-003 | Handle Installation Event | ✓ Implemented | Log activity              |
| WH-004 | Handle Repository Changes | ✓ Implemented | Log repo changes          |
| WH-005 | Handle Push Event         | ✓ Implemented | Log activity              |
| WH-006 | Handle PR Opened          | ✓ Implemented | Create preview deployment |
| WH-007 | Handle PR Synchronized    | ✓ Implemented | Update preview deployment |
| WH-008 | Handle PR Reopened        | ✓ Implemented | Create preview deployment |
| WH-009 | Handle PR Closed          | ✓ Implemented | Delete preview deployment |

### Data Storage

| ID     | Requirement                | Status        | Notes                          |
| ------ | -------------------------- | ------------- | ------------------------------ |
| DB-001 | Store OAuth Accounts       | ✓ Implemented | Provider-agnostic via NextAuth |
| DB-002 | Store Provider Tokens      | ✓ Implemented | Encrypted storage              |
| DB-003 | Store Repository Records   | ✓ Implemented |                                |
| DB-004 | Store Pull Request Records | ✓ Implemented | Includes provider field        |

---

## Provider Support

### Target Providers

| ID       | Provider     | Status            |
| -------- | ------------ | ----------------- |
| PROV-001 | GitHub       | ✓ Implemented     |
| PROV-002 | GitLab       | ✗ Not implemented |
| PROV-003 | Bitbucket    | ✗ Not implemented |
| PROV-004 | Azure DevOps | ✗ Not implemented |

### Provider-Specific Constraints

| ID      | Constraint                         | Providers |
| ------- | ---------------------------------- | --------- |
| CON-001 | App Installation (org-level perms) | GitHub    |
| CON-002 | Installation Tokens (short-lived)  | GitHub    |
| CON-003 | Actions OIDC for K8s auth          | GitHub    |

### Cross-Provider Terminology

| Concept     | GitHub       | GitLab        | Bitbucket    | Azure DevOps  |
| ----------- | ------------ | ------------- | ------------ | ------------- |
| Code Review | Pull Request | Merge Request | Pull Request | Pull Request  |
| App Auth    | GitHub App   | Access Token  | App Password | Svc Principal |
| CI/CD       | Actions      | Pipelines     | Pipelines    | Pipelines     |
| Events      | Webhooks     | Webhooks      | Webhooks     | Service Hooks |

---

## Configuration

### Required Configuration

| ID      | Variable                 | Purpose                  |
| ------- | ------------------------ | ------------------------ |
| CFG-001 | Provider App ID          | App identification       |
| CFG-002 | Provider App Private Key | App authentication       |
| CFG-003 | Provider Client ID       | OAuth client ID          |
| CFG-004 | Provider Client Secret   | OAuth client secret      |
| CFG-005 | Webhook Secret           | Webhook signature verify |
| CFG-006 | Token Encryption Key     | Encrypt tokens at rest   |

### Optional Configuration

| ID      | Variable               | Purpose                 |
| ------- | ---------------------- | ----------------------- |
| CFG-007 | Personal Access Token  | Fallback authentication |
| CFG-008 | Container Registry PAT | Registry authentication |
| CFG-009 | Repos Mode             | Mock mode for testing   |
| CFG-010 | Base URL               | Self-hosted instances   |

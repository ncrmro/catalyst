# Branch Fast Forward Workflow

A reusable GitHub Actions workflow for promoting branches with fast-forward merges, typically used to promote staging branches to main.

## Overview

This workflow ensures that Git history is always fast-forwarded when promoting branches. If branches have diverged due to hotfixes or other changes, the workflow will automatically reconcile them before performing the fast-forward merge.

## Typical Use Case

The most common scenario is promoting a `staging` branch to `main`:

```
staging ──→ main (fast-forward)
```

If hotfixes have been applied directly to `main` and the branches have diverged:

```
staging ──┐
          ├──→ reconcile ──→ main (fast-forward)
main ─────┘
```

The workflow will:
1. Merge `main` into `staging` to reconcile differences
2. Then fast-forward `main` to match `staging`

## Usage

### Basic Usage

```yaml
jobs:
  promote:
    uses: ./.github/workflows/branch-fast-forward.yml
    with:
      head_branch: staging
      target_branch: main
```

### Full Configuration

```yaml
jobs:
  promote:
    uses: ./.github/workflows/branch-fast-forward.yml
    with:
      head_branch: staging              # Source branch to promote from
      target_branch: main               # Target branch to promote to
      git_user_name: "GitHub Actions"   # Git commit author name
      git_user_email: "actions@github.com"  # Git commit author email
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `head_branch` | Source branch to promote from (e.g., staging) | No | `staging` |
| `target_branch` | Target branch to promote to (e.g., main) | No | `main` |
| `git_user_name` | Git user name for commits | No | `GitHub Actions` |
| `git_user_email` | Git user email for commits | No | `actions@github.com` |

## Outputs

The workflow provides step outputs that can be used by subsequent jobs:

- `fast_forward_successful`: `true` if the fast-forward was successful
- `reconciliation_required`: `true` if branch reconciliation was needed

## Permissions Required

The workflow requires the following permissions:

```yaml
permissions:
  contents: write        # To push changes to branches
  pull-requests: write   # For potential PR operations
```

## How It Works

1. **Checkout**: Fetches the full repository history
2. **Configure Git**: Sets up Git user credentials for commits
3. **Update Branches**: Ensures both head and target branches are up-to-date
4. **Check Fast-Forward**: Determines if a direct fast-forward is possible
5. **Reconcile if Needed**: If branches have diverged:
   - Merges target branch into head branch (preferring head branch changes)
   - Pushes the reconciled head branch
6. **Fast-Forward**: Performs the fast-forward merge to the target branch
7. **Push**: Updates the target branch with the new commits

## Example Workflows

### Manual Promotion

```yaml
name: Promote Staging to Main
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "promote" to confirm'
        required: true

jobs:
  promote:
    if: github.event.inputs.confirm == 'promote'
    uses: ./.github/workflows/branch-fast-forward.yml
    with:
      head_branch: staging
      target_branch: main
```

### Automatic Promotion

```yaml
name: Auto Promote on Staging
on:
  push:
    branches:
      - staging

jobs:
  promote:
    uses: ./.github/workflows/branch-fast-forward.yml
    with:
      head_branch: staging
      target_branch: main
```

## Best Practices

1. **Branching Strategy**: This workflow works best with a gitflow-like strategy where:
   - Development happens on feature branches
   - Features are merged into `staging` for testing
   - `staging` is promoted to `main` for production

2. **Hotfixes**: When hotfixes are applied directly to `main`:
   - The workflow will automatically reconcile the branches
   - Consider merging `main` back to `staging` manually to keep them in sync

3. **Testing**: Always ensure your staging branch is thoroughly tested before promotion

4. **Permissions**: Make sure the GitHub token has sufficient permissions to push to protected branches

## Troubleshooting

### Fast-Forward Failed

If the workflow fails during fast-forward, it usually means:
- The branches have diverged in a way that can't be automatically reconciled
- There are merge conflicts that require manual resolution

### Permission Denied

Ensure that:
- The workflow has `contents: write` permissions
- Branch protection rules allow the GitHub Actions bot to push
- Required status checks are satisfied

### Branch Not Found

Verify that:
- Both head and target branches exist
- Branch names are spelled correctly in the workflow inputs
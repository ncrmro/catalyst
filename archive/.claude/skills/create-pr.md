# Create Pull Request

Create a GitHub pull request with proper semantic formatting and three-section body structure.

## Format Requirements

### Title

Use semantic commit format:

```
<type>(<scope>): <subject>
```

- **type**: feat, fix, chore, docs, refactor, test, etc.
- **scope**: The spec ID if available (e.g., "001-environments"), otherwise the component name (e.g., "operator", "web")
- **subject**: Brief description of the change

Examples:

- `feat(001-environments): display real Kubernetes resources in environment detail page`
- `fix(operator): handle pod restart failures gracefully`
- `chore(ci): update GitHub Actions workflows`

### Body Structure

The PR body MUST have exactly three sections with markdown headers:

```markdown
## Goal

[One paragraph explaining the purpose and "why" of this change]

## Changes

- [Bullet point list of specific changes made]
- [Include files modified, features added, bugs fixed]
- [Focus on "what" was done]

## Demo

[How to see/test the changes]

- [URL paths to visit]
- [Commands to run]
- [Expected behavior to observe]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Usage

When the user asks to create a PR:

1. **Check for spec**: Look in `specs/` directory for related spec (e.g., `specs/001-environments/`)
2. **Analyze the changes**: Review git diff and commit messages
3. **Determine scope**: Use spec ID if available (001-environments), otherwise component name (operator, web)
4. **Write the title**: `<type>(<scope>): <brief subject>`
5. **Write Goal section**: One paragraph on purpose
6. **Write Changes section**: Bulleted list of specific changes
7. **Write Demo section**: How to see the changes in action
8. **Create PR**: Use `gh pr create --title "..." --body "..."`

## Examples

### Example 1: Spec-based PR

```
Title: feat(001-environments): display real Kubernetes resources in environment detail page

Body:
## Goal
Display real Kubernetes pod and container data in the environment detail page instead of mock data, showing hierarchical pod structure with init containers and proper status indicators.

## Changes
- Fix namespace calculation to match operator logic (projectName-envName)
- Add init container support with exit code tracking to k8s-pods.ts
- Display pods hierarchically with init and regular containers
- Show init containers with proper status (completed/failed) and colors
- Remove mock container data and fetch real pods from K8s

## Demo
Navigate to `/projects/catalyst/env/dev-solar-pine-75` to see:
- Real pod data from namespace `catalyst-dev-solar-pine-75`
- Init containers (npm-install, db-migrate) showing completed status
- Regular containers (web) with live status and shell access

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Example 2: Component-based PR (no spec)

```
Title: fix(operator): handle pod restart failures gracefully

Body:
## Goal
Prevent operator crashes when pods fail to restart by adding proper error handling and retry logic with exponential backoff.

## Changes
- Add exponential backoff retry logic to pod restart handler
- Improve error logging for pod restart failures
- Add unit tests for retry mechanism
- Update operator documentation with troubleshooting guide

## Demo
1. Deploy an environment with a failing pod configuration
2. Watch operator logs: `kubectl logs -n catalyst-system operator-xxx -f`
3. Observe graceful retry behavior instead of crash
4. Verify pod eventually reaches running state or fails with clear error

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Scope Priority

1. **Spec ID** (preferred): `001-environments`, `002-local-k3s`, `003-vcs-providers`
2. **Component**: `operator`, `web`, `api`, `db`, `ci`, `docs`, `test`

Check `specs/` directory for spec IDs:

```bash
ls -d specs/[0-9]*
```

Common specs:

- `001-environments` - Environment management and detection
- `002-local-k3s-vm` - Local K3s development VM
- `003-vcs-providers` - VCS provider abstraction
- `006-agent-harness` - Agent execution framework
- `009-projects` - Project configuration and management
- `010-platform` - Platform-level features

## Tips

- Keep title under 72 characters
- Goal should explain "why", not "what"
- Changes should be specific and actionable
- Demo should provide exact steps to verify the change
- Always include the Claude Code footer
- Prefer spec IDs over generic component names when available

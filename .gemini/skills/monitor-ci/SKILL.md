---
name: monitor-ci
description: Monitor and diagnose CI failures for GitHub PRs. Checks workflow status, downloads cluster-logs and playwright-artifacts, and performs targeted analysis of E2E test failures including Kubernetes pod events, operator logs, and container logs. Use when the user asks to check CI, monitor E2E tests, or diagnose a failing PR.
---

## Monitor CI Skill

You are an expert at diagnosing CI failures for the Catalyst platform, which runs E2E tests involving Kubernetes (Kind clusters), Playwright, and a Go operator.

## Workflow

### 1. Identify the PR and latest run

```bash
# Get the current branch's PR, or use the PR number the user provides
gh pr checks <PR_NUMBER> --json name,state,bucket,workflow

# Get the specific Run ID for the web tests (avoiding ambiguity by using filename)
gh run list --workflow web.test.yml --branch <BRANCH_NAME> --limit 1 --json databaseId,conclusion

# If E2E is still IN_PROGRESS, poll with sleep intervals
# E2E tests typically take 10-15 minutes
```

### 2. On failure, get the high-level error first

```bash
# Get the E2E job ID
gh run view <RUN_ID> --json jobs --jq '.jobs[] | select(.name == "E2E Tests") | .databaseId'

# Get just the failed log lines — DO NOT dump the full log
gh run view --job <JOB_ID> --log-failed 2>&1 | grep -i -e "error" -e "failed" -e "timeout" -e "did not reach" | head -20
```

### 3. Download and analyze cluster-logs artifact

This is where the real debugging info lives.

```bash
# List artifacts
gh api repos/ncrmro/catalyst/actions/runs/<RUN_ID>/artifacts --jq '.artifacts[] | "\(.name) - \(.id)"'

# Download cluster-logs (NOT playwright-artifacts unless screenshots are needed)
cd /tmp && rm -rf cluster-logs cluster-logs.zip
gh api repos/ncrmro/catalyst/actions/artifacts/<ARTIFACT_ID>/zip > cluster-logs.zip
unzip -o cluster-logs.zip -d cluster-logs
```

### 4. Targeted analysis — never read full files

Always grep first, read specific sections only when needed.

**Step A: Find the test namespace and pod status**

```bash
# The test namespace contains a unique timestamp — find it
grep "pod/web-" /tmp/cluster-logs/cluster-state.log | head -5
```

**Step B: Check for common failure patterns in order**

```bash
NS="<test-namespace-from-step-A>"

# 1. ResourceQuota errors (init containers missing resources)
grep -i "failed quota\|must specify" /tmp/cluster-logs/cluster-state.log

# 2. Volume mount failures (ConfigMap/Secret not found)
grep "$NS" /tmp/cluster-logs/cluster-state.log | grep -i "FailedMount\|configmap\|secret"

# 3. Image pull errors
grep "$NS" /tmp/cluster-logs/cluster-state.log | grep -i "ErrImage\|ImagePull\|BackOff"

# 4. Pod events (scheduling, probes, OOM)
grep "$NS" /tmp/cluster-logs/cluster-state.log | grep -i "Warning\|Error\|Unhealthy\|OOMKill\|CrashLoop\|Killing"

# 5. Operator errors
grep -i "error\|fail\|warn" /tmp/cluster-logs/operator.log | head -20
```

**Step C: Read specific container logs only when needed**

```bash
# List available container logs for the test namespace
ls /tmp/cluster-logs/kind/preview-cluster-control-plane/containers/ | grep "<partial-namespace>"

# Read only the relevant container (git-clone, npm-install, db-migrate, or app)
cat /tmp/cluster-logs/kind/preview-cluster-control-plane/containers/<specific-container-log>
```

## Common E2E Failure Patterns

| Symptom                                     | Likely Cause                                        | Where to Look                                         |
| ------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `Init:0/3` stuck, no events                 | ResourceQuota — init containers missing `resources` | cluster-state.log for "failed quota"                  |
| `Init:0/3` with FailedMount                 | ConfigMap/Secret name mismatch                      | cluster-state.log for "FailedMount"                   |
| `Init:0/3` with PodInitializing for minutes | Init container hanging (git-clone, npm-install)     | Container logs for the stuck init container           |
| `CrashLoopBackOff`                          | App crash or probe failure                          | App container log + cluster-state.log for "Unhealthy" |
| `Startup probe failed: 404`                 | Health endpoint doesn't exist                       | App container log, verify route exists in code        |
| `Startup probe failed: 503`                 | App dependency not ready (DB)                       | App container log + postgres container log            |
| Pod never scheduled                         | Resource limits exceed node capacity                | cluster-state.log for "FailedScheduling"              |

## Context Management Rules

- **NEVER** read full operator.log (it repeats reconciliation every 5s for ~10 min)
- **NEVER** read full cluster-state.log without filtering by namespace
- **ALWAYS** grep for errors first, then read specific sections
- **ALWAYS** filter operator.log by error/warning level, not info
- Container logs in `containers/` directory are usually small and safe to read fully
- The `cluster-state.log` has sections: "All Resources", "Events", then pod descriptions — events section is most useful

## Reporting

When reporting findings to the user, include:

1. Which check failed and the run URL
2. The specific error (quote the relevant log line)
3. Root cause analysis
4. Which file(s) need to change and what the fix is

## Git Operations

- When performing git operations that might open an editor (commit, rebase, merge), always prepend `EDITOR=none` to avoid hanging the process.
  - Example: `EDITOR=none git commit --amend`
  - Example: `EDITOR=none git rebase main`


# Wait for CI

## Objective

Monitor GitHub Actions for the pushed commit and wait for CI to complete, capturing the results.

## Task

Poll GitHub Actions to track the CI workflow status until it completes (success or failure).

### Process

1. **Read commit info**
   - Load `tasks/commit_info.json` from the previous step
   - Get commit SHA and branch name

2. **Find the CI workflow run**

   ```bash
   # List recent workflow runs for the branch
   gh run list --branch <branch> --limit 5

   # Get the specific run for our commit
   gh run list --commit <sha> --json databaseId,status,conclusion,name
   ```

3. **Wait for workflow to start**
   - If no run found immediately, wait up to 60 seconds
   - Poll every 10 seconds until run appears
   - Timeout if no run starts within 2 minutes

4. **Monitor workflow progress**

   ```bash
   # Watch the run (updates every 3 seconds)
   gh run watch <run-id>

   # Or poll manually
   gh run view <run-id> --json status,conclusion,jobs
   ```

   - Track overall status: queued → in_progress → completed
   - Note individual job statuses
   - Capture timing information

5. **Handle completion**

   **On success**:
   - Record successful completion
   - Workflow complete - task is done!

   **On failure**:
   - Record failure details
   - Identify which job(s) failed
   - Prepare for debug_ci step

6. **Report status to user**
   - Show real-time progress updates
   - Display final status clearly
   - If failed, indicate next steps (debug_ci)

## Output Format

### tasks/ci_result.json

A JSON file containing CI workflow results.

**Structure**:

```json
{
  "checked_at": "2024-01-15T11:15:00Z",
  "commit_sha": "abc123def456",
  "workflow": {
    "name": "CI",
    "run_id": 12345678,
    "run_url": "https://github.com/owner/repo/actions/runs/12345678",
    "status": "completed",
    "conclusion": "success|failure|cancelled",
    "started_at": "2024-01-15T11:00:10Z",
    "completed_at": "2024-01-15T11:12:45Z",
    "duration_seconds": 755
  },
  "jobs": [
    {
      "name": "build",
      "status": "completed",
      "conclusion": "success",
      "duration_seconds": 120
    },
    {
      "name": "test",
      "status": "completed",
      "conclusion": "success",
      "duration_seconds": 450
    },
    {
      "name": "e2e",
      "status": "completed",
      "conclusion": "failure",
      "duration_seconds": 185,
      "failed_step": "Run Playwright tests"
    }
  ],
  "failed_jobs": [
    {
      "name": "e2e",
      "failed_step": "Run Playwright tests",
      "has_artifacts": true,
      "artifact_names": ["playwright-report", "test-screenshots"]
    }
  ],
  "overall_success": false,
  "needs_debug": true
}
```

**Example display - success**:

```
## CI Results

**Workflow**: CI
**Status**: ✅ Success
**Duration**: 12m 35s

| Job | Status | Duration |
|-----|--------|----------|
| build | ✅ Pass | 2m 0s |
| test | ✅ Pass | 7m 30s |
| lint | ✅ Pass | 1m 5s |
| e2e | ✅ Pass | 2m 0s |

### Summary
All CI checks passed! Task complete.
```

**Example display - failure**:

```
## CI Results

**Workflow**: CI
**Status**: ❌ Failed
**Duration**: 10m 15s

| Job | Status | Duration |
|-----|--------|----------|
| build | ✅ Pass | 2m 0s |
| test | ✅ Pass | 7m 30s |
| lint | ✅ Pass | 1m 5s |
| e2e | ❌ Fail | 3m 5s |

### Failed Job: e2e
**Failed Step**: Run Playwright tests
**Artifacts Available**: playwright-report, test-screenshots

### Next Steps
Run debug_ci step to analyze the failure and download artifacts.
```

## Quality Criteria

- Correct workflow run identified for the commit
- Polling continues until workflow completes
- All job statuses captured
- Failed jobs and steps clearly identified
- Artifacts noted for failed jobs
- Duration and timing information captured
- Clear next steps provided based on result
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

CI validation is the final quality gate. Even if local validation passes, CI may catch issues in different environments or with integration tests. This step provides the feedback loop to know if the implementation is truly complete or needs debugging.

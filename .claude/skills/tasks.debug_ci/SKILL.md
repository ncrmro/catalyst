---
name: tasks.debug_ci
description: "Fetch failed step logs and E2E screenshots for debugging"
hooks:
  Stop:
    - hooks:
        - type: prompt
          prompt: |
            Verify debug analysis is actionable:
            1. Root cause of failure is identified
            2. Specific fix recommendations are provided
            3. If E2E failure, screenshots were analyzed
            4. Next steps are clear and actionable
            If ALL criteria are met, include `<promise>✓ Quality Criteria Met</promise>`.

  SubagentStop:
    - hooks:
        - type: prompt
          prompt: |
            Verify debug analysis is actionable:
            1. Root cause of failure is identified
            2. Specific fix recommendations are provided
            3. If E2E failure, screenshots were analyzed
            4. Next steps are clear and actionable
            If ALL criteria are met, include `<promise>✓ Quality Criteria Met</promise>`.

---

# tasks.debug_ci

**Step 8/8** in **tasks** workflow

> Execute implementation tasks from specs, PRs, or branches to completion

## Prerequisites (Verify First)

Before proceeding, confirm these steps are complete:
- `/tasks.wait_ci`

## Instructions

**Goal**: Fetch failed step logs and E2E screenshots for debugging

# Debug CI Failures

## Objective

Analyze CI failures by fetching logs from failed steps and downloading E2E test artifacts (screenshots) to identify root causes and recommend fixes.

## Task

Download and analyze CI failure information to produce actionable debugging insights.

### Process

1. **Read CI results**
   - Load `tasks/ci_result.json` from the previous step
   - Identify failed jobs and steps
   - Note available artifacts

2. **Fetch failed step logs**

   For each failed job:

   ```bash
   # Get the run logs
   gh run view <run-id> --log-failed

   # Or download logs for specific job
   gh run view <run-id> --job <job-id> --log
   ```

   **Smart log extraction**:
   - Focus on the failed step only (not entire job log)
   - Look for error messages, stack traces, assertions
   - Extract 50-100 lines around the failure point
   - Avoid downloading megabytes of passing step logs

3. **Download E2E artifacts (if applicable)**

   ```bash
   # List artifacts
   gh run view <run-id> --json artifacts

   # Download specific artifacts
   gh run download <run-id> -n playwright-report
   gh run download <run-id> -n test-screenshots
   ```

   For Playwright failures:
   - Download screenshot artifacts automatically
   - Look in `test-results/` for failure screenshots
   - Read the HTML report if available

4. **Analyze the failure**

   **For test failures**:
   - Identify which test(s) failed
   - Extract the assertion error
   - Find the expected vs actual values
   - Locate the test file and line number

   **For E2E failures**:
   - Review failure screenshots
   - Check for UI differences
   - Look for timeout issues
   - Identify flaky test patterns

   **For build failures**:
   - Find compilation errors
   - Check for missing dependencies
   - Look for environment issues

5. **Determine root cause**
   - Categorize the failure type
   - Identify the specific code causing the issue
   - Determine if it's a code bug, test bug, or environment issue

6. **Generate fix recommendations**
   - Provide specific, actionable fixes
   - Reference exact files and line numbers
   - Include code snippets where helpful
   - Prioritize fixes by impact

## Output Format

### tasks/debug_report.md

A markdown report with failure analysis and recommendations.

**Structure**:

```markdown
# CI Debug Report

## Failure Summary

- **Workflow**: CI
- **Run**: #12345678
- **Failed Job**: e2e
- **Failed Step**: Run Playwright tests

## Root Cause Analysis

### Failed Test

**Test**: `login.spec.ts` > "should show error on invalid credentials"
**File**: `__tests__/e2e/login.spec.ts:45`

### Error Details
```

Error: Timed out waiting for selector "[data-testid=error-message]"
at login.spec.ts:52:15

Expected: Error message to appear within 5 seconds
Actual: Element never appeared

````

### Screenshot Analysis
![Login page at failure](test-results/login-should-show-error-1.png)

The screenshot shows:
- Login form is visible
- Submit button was clicked (loading state visible)
- No error message rendered
- Form appears to be stuck in loading state

### Root Cause
The authentication API call is timing out in CI environment. The API endpoint `/api/auth/login` is not returning within the expected timeout.

Likely causes:
1. Database connection is slow in CI
2. API endpoint has a bug that causes hang on invalid credentials
3. Network latency in CI environment

## Recommendations

### Fix 1: Check API endpoint (Recommended)
**File**: `src/app/api/auth/login/route.ts`

The login endpoint may not be handling invalid credentials correctly. Add logging to trace the request:

```typescript
// Add at line 15
console.log('Login attempt:', { email, timestamp: Date.now() });
````

### Fix 2: Increase test timeout

**File**: `__tests__/e2e/login.spec.ts:45`

As a temporary fix, increase the timeout:

```typescript
await expect(page.locator("[data-testid=error-message]")).toBeVisible({
  timeout: 10000,
}); // Was 5000
```

### Fix 3: Add API timeout handling

**File**: `src/lib/auth.ts`

Add explicit timeout to the auth API call:

```typescript
const response = await fetch("/api/auth/login", {
  signal: AbortSignal.timeout(5000),
  // ...
});
```

## Next Steps

1. Apply Fix 1 to diagnose the issue
2. Re-run the failing test locally: `npm run test:e2e -- login.spec.ts`
3. If it passes locally, the issue may be CI-specific (environment)
4. Consider Fix 3 for production resilience

## Artifacts Downloaded

- `playwright-report/index.html` - Full test report
- `test-results/login-should-show-error-1.png` - Failure screenshot

```

## Quality Criteria

- Root cause of failure is identified
- Specific fix recommendations are provided
- If E2E failure, screenshots were analyzed
- Next steps are clear and actionable
- Relevant log excerpts are included
- File paths and line numbers are specific
- Recommendations are prioritized
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

This step closes the feedback loop on CI failures. Rather than just reporting "CI failed", it provides deep analysis and actionable fixes. The goal is to minimize the time from failure to fix by doing the detective work of reading logs, analyzing screenshots, and correlating failures to specific code.
```


### Job Context

A comprehensive workflow for driving implementation tasks to completion. Takes tasks
from multiple sources (tasks.md specs, PR descriptions, or branch context) and
executes them one at a time through the full development cycle.

The workflow:
1. Detects or accepts explicit task source (branch, PR, or spec file)
2. Parses and displays available tasks
3. Selects a task (smart selection or user-specified)
4. Implements the code changes
5. Validates locally (tests + typecheck)
6. Commits changes and marks task complete
7. Monitors CI for success
8. Debugs failures by fetching logs and E2E screenshots

Key features:
- Supports tasks.md, PR descriptions, and GitHub issues as task sources
- One task at a time execution for careful review
- Full CI validation with smart log extraction
- Auto-downloads E2E failure screenshots for debugging
- In-place task tracking (updates source directly)

Target users: Developers working with spec-driven or PR-based task workflows.


## Required Inputs


**Files from Previous Steps** - Read these first:
- `tasks/ci_result.json` (from `wait_ci`)

## Work Branch

Use branch format: `deepwork/tasks-[instance]-YYYYMMDD`

- If on a matching work branch: continue using it
- If on main/master: create new branch with `git checkout -b deepwork/tasks-[instance]-$(date +%Y%m%d)`

## Outputs

**Required outputs**:
- `tasks/debug_report.md`

## Guardrails

- Do NOT skip prerequisite verification if this step has dependencies
- Do NOT produce partial outputs; complete all required outputs before finishing
- Do NOT proceed without required inputs; ask the user if any are missing
- Do NOT modify files outside the scope of this step's defined outputs

## Quality Validation

Stop hooks will automatically validate your work. The loop continues until all criteria pass.



**To complete**: Include `<promise>✓ Quality Criteria Met</promise>` in your final response only after verifying ALL criteria are satisfied.

## On Completion

1. Verify outputs are created
2. Inform user: "Step 8/8 complete, outputs: tasks/debug_report.md"
3. **Workflow complete**: All steps finished. Consider creating a PR to merge the work branch.

---

**Reference files**: `.deepwork/jobs/tasks/job.yml`, `.deepwork/jobs/tasks/steps/debug_ci.md`
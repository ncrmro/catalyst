---
name: tasks.validate_task
description: "Run tests and typecheck to verify implementation"
---

# tasks.validate_task

**Step 5/8** in **tasks** workflow

> Execute implementation tasks from specs, PRs, or branches to completion

## Prerequisites (Verify First)

Before proceeding, confirm these steps are complete:
- `/tasks.implement_task`

## Instructions

**Goal**: Run tests and typecheck to verify implementation

# Validate Task

## Objective

Run tests and type checking to verify the implementation is correct and doesn't introduce regressions.

## Task

Execute the project's test suite and type checker to validate that the implemented changes work correctly and maintain code quality.

### Process

1. **Read implementation summary**
   - Load `tasks/implementation_summary.md` from the previous step
   - Identify which files were changed
   - Determine relevant test files

2. **Run type checking**

   ```bash
   # For TypeScript projects
   npm run typecheck
   # or
   npx tsc --noEmit
   ```

   - Capture any type errors
   - Note affected files and line numbers

3. **Run linting**

   ```bash
   npm run lint
   ```

   - Capture any linting errors or warnings
   - Distinguish between errors (must fix) and warnings (should review)

4. **Run relevant tests**

   ```bash
   # Run all tests
   npm test

   # Or run specific tests related to changes
   npm test -- --testPathPattern="auth"
   ```

   - Focus on tests related to changed files
   - Run full test suite to catch regressions

5. **Analyze results**

   For each validation type, categorize issues:
   - **Blocking**: Must fix before proceeding (type errors, test failures)
   - **Warning**: Should review but can proceed (lint warnings)
   - **Info**: Informational only

6. **Report results to user**
   - Show pass/fail status for each check
   - List any blocking issues with details
   - Provide clear next steps

7. **If validation fails**
   - Do NOT proceed to commit step
   - Identify specific failures
   - Return to implement_task to fix issues
   - Re-run validation after fixes

## Output Format

### tasks/validation_result.json

A JSON file containing the validation results.

**Structure**:

```json
{
  "validated_at": "2024-01-15T10:50:00Z",
  "overall_status": "pass|fail",
  "checks": {
    "typecheck": {
      "status": "pass|fail",
      "command": "npm run typecheck",
      "duration_ms": 3500,
      "errors": [],
      "warnings": []
    },
    "lint": {
      "status": "pass|fail|warning",
      "command": "npm run lint",
      "duration_ms": 2100,
      "errors": [],
      "warnings": [
        {
          "file": "src/components/auth/LoginForm.tsx",
          "line": 45,
          "rule": "no-unused-vars",
          "message": "'tempVar' is defined but never used"
        }
      ]
    },
    "tests": {
      "status": "pass|fail",
      "command": "npm test",
      "duration_ms": 15000,
      "summary": {
        "total": 156,
        "passed": 156,
        "failed": 0,
        "skipped": 2
      },
      "failures": []
    }
  },
  "blocking_issues": [],
  "warnings": [
    {
      "type": "lint",
      "file": "src/components/auth/LoginForm.tsx",
      "message": "Unused variable 'tempVar'"
    }
  ],
  "ready_to_commit": true
}
```

**Example display to user**:

```
## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| TypeCheck | ✅ Pass | No type errors |
| Lint | ⚠️ Warning | 1 warning (non-blocking) |
| Tests | ✅ Pass | 156 passed, 0 failed |

### Warnings
- `src/components/auth/LoginForm.tsx:45` - Unused variable 'tempVar'

### Summary
**Ready to commit**: Yes

All blocking checks passed. 1 non-blocking warning to review.
```

**Example failure**:

```
## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| TypeCheck | ❌ Fail | 2 type errors |
| Lint | ✅ Pass | No issues |
| Tests | ❌ Fail | 3 tests failed |

### Blocking Issues

**Type Errors:**
1. `src/lib/auth.ts:23` - Property 'email' does not exist on type 'User'
2. `src/lib/auth.ts:45` - Argument of type 'string' is not assignable to 'number'

**Test Failures:**
1. `LoginForm.test.tsx` - "should validate email format" - Expected true, received false
2. `LoginForm.test.tsx` - "should show error on invalid credentials" - Timeout
3. `auth.test.ts` - "validateCredentials returns user" - TypeError: Cannot read property 'id'

### Summary
**Ready to commit**: No

Fix the 2 type errors and 3 test failures before proceeding.
```

## Quality Criteria

- Type checking executed and results captured
- Linting executed and results captured
- Test suite executed and results captured
- All blocking issues clearly identified
- Validation status accurately reflects results
- Output provides actionable information for fixing issues
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

Local validation catches issues before they reach CI, saving time and reducing failed CI runs. This step acts as a quality gate - if validation fails, the workflow should loop back to fix issues rather than proceeding to commit broken code.


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
- `tasks/implementation_summary.md` (from `implement_task`)

## Work Branch

Use branch format: `deepwork/tasks-[instance]-YYYYMMDD`

- If on a matching work branch: continue using it
- If on main/master: create new branch with `git checkout -b deepwork/tasks-[instance]-$(date +%Y%m%d)`

## Outputs

**Required outputs**:
- `tasks/validation_result.json`

## Guardrails

- Do NOT skip prerequisite verification if this step has dependencies
- Do NOT produce partial outputs; complete all required outputs before finishing
- Do NOT proceed without required inputs; ask the user if any are missing
- Do NOT modify files outside the scope of this step's defined outputs

## On Completion

1. Verify outputs are created
2. Inform user: "Step 5/8 complete, outputs: tasks/validation_result.json"
3. **Continue workflow**: Use Skill tool to invoke `/tasks.commit_task`

---

**Reference files**: `.deepwork/jobs/tasks/job.yml`, `.deepwork/jobs/tasks/steps/validate_task.md`
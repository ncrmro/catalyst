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

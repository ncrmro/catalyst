# Implement Task

## Objective

Write the code changes necessary to complete the selected task, following project conventions and best practices.

## Task

Implement the selected task by writing or modifying code, ensuring the changes are complete, tested where appropriate, and follow the project's established patterns.

### Process

1. **Read task context**
   - Load `tasks/selected_task.json` from the previous step
   - Understand the task requirements fully
   - Review related files identified in context

2. **Analyze the codebase**
   - Read CLAUDE.md for project conventions
   - Examine existing patterns in related code
   - Identify the right files to modify or create
   - Understand the architecture and layers

3. **Plan the implementation**
   - Break down the task into specific code changes
   - List files to create or modify
   - Identify any dependencies to add
   - Note any tests that need to be written

4. **Implement the changes**

   Follow these principles:
   - **Match existing patterns** - Use the same style as surrounding code
   - **Keep changes minimal** - Only change what's necessary for the task
   - **Handle errors appropriately** - Add error handling where needed
   - **Add comments sparingly** - Only where logic isn't self-evident
   - **No placeholders** - Complete all implementation, no TODOs left behind

5. **Write tests if applicable**
   - Add unit tests for new functions
   - Update existing tests if behavior changed
   - Ensure test coverage for edge cases

6. **Self-review the changes**
   - Check for security issues (injection, XSS, etc.)
   - Verify no debugging code left behind
   - Ensure code compiles/lints cleanly
   - Confirm task requirements are fully met

7. **Document the implementation**
   - Summarize what was changed and why
   - Note any architectural decisions made
   - List files modified

## Output Format

### tasks/implementation_summary.md

A markdown summary of the implementation work completed.

**Structure**:

```markdown
# Implementation Summary

## Task

**ID**: task-1a
**Title**: Add login form

## Changes Made

### Files Created

- `src/components/auth/LoginForm.tsx` - Login form component with email/password fields

### Files Modified

- `src/app/login/page.tsx` - Added LoginForm component to login page
- `src/lib/auth.ts` - Added validateCredentials function

### Dependencies Added

- None

## Implementation Details

### LoginForm Component

Created a new React component that:

- Renders email and password input fields
- Validates input before submission
- Handles loading and error states
- Calls the auth API on submit

### Key Decisions

- Used React Hook Form for form state management (matches existing patterns)
- Added client-side validation for immediate feedback
- Followed existing error handling patterns from SignupForm

## Tests Added

- `__tests__/components/LoginForm.test.tsx` - Unit tests for form validation and submission

## Verification

- [x] Code follows project conventions
- [x] No placeholder TODOs remaining
- [x] Error handling in place
- [x] Tests pass locally
```

## Quality Criteria

- All code changes for the task are complete
- No placeholder or TODO comments left behind
- Code follows project conventions (check CLAUDE.md)
- Any new functions have appropriate error handling
- Changes are minimal and focused on the task
- Implementation summary accurately describes changes
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

This is the core implementation step where actual code is written. The goal is to complete the task fully in one pass, with high-quality code that follows project patterns. The implementation summary helps track what changed and provides context for code review.

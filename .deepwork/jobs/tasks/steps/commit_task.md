# Commit Task

## Objective

Commit the implementation changes and mark the task as complete in its original source (tasks.md, PR description, etc.).

## Task

Create a well-formatted commit for the completed task and update the task source to reflect completion.

### Process

1. **Read required context**
   - Load `tasks/validation_result.json` - confirm ready_to_commit is true
   - Load `tasks/selected_task.json` - get task details
   - Load `tasks/source_context.json` - know where to mark completion

2. **Verify validation passed**
   - If `ready_to_commit` is false, do NOT proceed
   - Return to validate_task step to address issues

3. **Stage changes**

   ```bash
   # Check what's changed
   git status

   # Stage implementation files (not task tracking files)
   git add <changed files>
   ```

   - Stage only implementation-related files
   - Exclude task tracking files (tasks/\*.json)

4. **Create commit message**

   Follow conventional commit format:

   ```
   <type>(<scope>): <description>

   <body>

   Task: <task-id>
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

   Types: feat, fix, refactor, test, docs, chore
   Scope: area of codebase (auth, api, ui, etc.)

5. **Commit the changes**

   ```bash
   git commit -m "$(cat <<'EOF'
   feat(auth): add login form component

   - Created LoginForm component with email/password fields
   - Added client-side validation
   - Integrated with auth API

   Task: task-1a
   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

6. **Mark task complete in source**

   **For spec (tasks.md)**:
   - Edit the file to change `- [ ]` to `- [x]` for the task
   - Commit the task file update separately

   **For PR**:
   - Update PR body to check off the task
   - Use: `gh pr edit <number> --body "<updated body>"`

   **For branch**:
   - No source update needed (work is the commit itself)

7. **Push changes**

   ```bash
   git push origin <branch>
   ```

   - Push to trigger CI
   - Note the commit SHA for CI tracking

## Output Format

### tasks/commit_info.json

A JSON file containing commit and push information.

**Structure**:

```json
{
  "committed_at": "2024-01-15T11:00:00Z",
  "task": {
    "id": "task-1a",
    "title": "Add login form"
  },
  "commit": {
    "sha": "abc123def456",
    "message": "feat(auth): add login form component",
    "files_changed": 3,
    "insertions": 145,
    "deletions": 12
  },
  "push": {
    "branch": "feature/auth",
    "remote": "origin",
    "pushed_at": "2024-01-15T11:00:05Z"
  },
  "source_updated": {
    "type": "spec",
    "file": "tasks.md",
    "task_marked_complete": true
  },
  "ci": {
    "expected_workflow": "CI",
    "trigger": "push",
    "branch": "feature/auth"
  }
}
```

**Example display to user**:

```
## Commit Complete

**Commit**: `abc123d` - feat(auth): add login form component
**Branch**: feature/auth
**Files**: 3 changed (+145, -12)

### Changes Committed
- `src/components/auth/LoginForm.tsx` (new)
- `src/app/login/page.tsx` (modified)
- `src/lib/auth.ts` (modified)

### Task Updated
✅ Marked task-1a as complete in tasks.md

### Next Steps
Pushed to origin/feature/auth. CI workflow should start shortly.
```

## Quality Criteria

- Validation passed before committing (ready_to_commit was true)
- Commit message follows conventional commit format
- Commit includes Co-Authored-By attribution
- Only implementation files are committed (not tracking files)
- Task is marked complete in original source
- Changes are pushed to remote
- Commit SHA is captured for CI tracking
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

This step creates a clean commit history with well-formatted messages. Marking tasks complete in the source ensures the task list stays accurate and provides visibility into progress. The push triggers CI, which the next step will monitor.

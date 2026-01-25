# Detect Task Source

## Objective

Identify the source of implementation tasks by auto-detecting from the current context (branch, PR, spec file) or accepting explicit user input.

## Task

Determine where tasks are coming from so subsequent steps can parse and execute them. Support three source types: spec files (tasks.md), pull requests, and branches.

### Process

1. **Check for explicit input**
   - If user provided `source_type` and `source_ref`, use those directly
   - Valid source types: `branch`, `pr`, `spec`

2. **Auto-detect if no explicit input**

   a. **Check for spec file**:

   ```bash
   # Look for tasks.md in common locations
   ls tasks.md specs/tasks.md .speckit/tasks.md 2>/dev/null
   ```

   b. **Check current branch for linked PR**:

   ```bash
   # Get current branch
   git branch --show-current

   # Check for open PR on this branch
   gh pr view --json number,title,body,url 2>/dev/null
   ```

   c. **Fall back to branch context**:
   - Use the current branch as the source
   - Look for uncommitted work or recent commits

3. **Gather source metadata**

   For **spec** source:
   - File path
   - Last modified date
   - Total task count (quick scan)

   For **pr** source:
   - PR number
   - PR title
   - PR URL
   - Repository owner/name

   For **branch** source:
   - Branch name
   - Base branch (main/master)
   - Uncommitted changes count
   - Recent commit count since base

4. **Validate the source**
   - Ensure the detected source actually contains tasks
   - Warn if source appears empty or invalid

## Output Format

### tasks/source_context.json

A JSON file containing the detected source information.

**Structure**:

```json
{
  "source_type": "spec|pr|branch",
  "detected_at": "2024-01-15T10:30:00Z",
  "auto_detected": true,
  "source": {
    // For spec:
    "file_path": "tasks.md",
    "last_modified": "2024-01-15T09:00:00Z",

    // For pr:
    "number": 123,
    "title": "Add user authentication",
    "url": "https://github.com/owner/repo/pull/123",
    "repo": "owner/repo",

    // For branch:
    "name": "feature/auth",
    "base": "main",
    "uncommitted_files": 3,
    "commits_ahead": 5
  },
  "validation": {
    "has_tasks": true,
    "estimated_task_count": 5,
    "warnings": []
  }
}
```

**Example - PR source**:

```json
{
  "source_type": "pr",
  "detected_at": "2024-01-15T10:30:00Z",
  "auto_detected": true,
  "source": {
    "number": 42,
    "title": "Implement preview environments feature",
    "url": "https://github.com/ncrmro/catalyst/pull/42",
    "repo": "ncrmro/catalyst"
  },
  "validation": {
    "has_tasks": true,
    "estimated_task_count": 8,
    "warnings": []
  }
}
```

## Quality Criteria

- Source type is correctly identified (spec, pr, or branch)
- All relevant metadata is captured for the source type
- Validation confirms tasks exist in the source
- Auto-detection logic follows correct priority (spec > pr > branch)
- Output JSON is valid and complete
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

This is the entry point for the tasks workflow. Accurate source detection ensures subsequent steps can properly parse and execute tasks. The workflow supports developers who may have tasks defined in different places depending on their workflow - spec-driven development uses tasks.md, PR-driven uses PR descriptions/issues, and branch-driven looks at work in progress.

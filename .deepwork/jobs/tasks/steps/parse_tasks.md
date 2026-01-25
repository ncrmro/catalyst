# Parse Tasks

## Objective

Extract and display all tasks from the detected source, normalizing them into a consistent format regardless of whether they came from a spec file, PR, or branch.

## Task

Read the source context and parse tasks into a structured list that can be used for selection and execution.

### Process

1. **Read source context**
   - Load `tasks/source_context.json` from the previous step
   - Determine parsing strategy based on `source_type`

2. **Parse tasks based on source type**

   **For spec (tasks.md)**:
   - Look for checkbox items: `- [ ]` (incomplete) and `- [x]` (complete)
   - Extract task text and any sub-tasks
   - Preserve hierarchy (parent tasks with children)
   - Parse any metadata (estimates, priorities, labels)

   ```markdown
   - [ ] Implement user authentication
     - [ ] Add login form
     - [ ] Add session management
   - [x] Set up database schema
   ```

   **For PR**:
   - Fetch PR body using: `gh pr view <number> --json body`
   - Look for task lists in the PR description
   - Also check linked issues: `gh pr view <number> --json body,commits`
   - Parse checkbox items from the body

   **For branch**:
   - Look for TODO comments in changed files
   - Check for a tasks.md in the branch
   - Analyze commit messages for implied tasks
   - List uncommitted changes as potential tasks

3. **Normalize task format**
   - Assign unique IDs to each task
   - Determine completion status
   - Extract dependencies between tasks
   - Calculate task order based on dependencies

4. **Display tasks to user**
   - Show a numbered list of tasks
   - Indicate completion status
   - Show any dependencies or blocking relationships

## Output Format

### tasks/parsed_tasks.json

A JSON file containing all parsed tasks in normalized format.

**Structure**:

```json
{
  "source_type": "spec",
  "source_ref": "tasks.md",
  "parsed_at": "2024-01-15T10:35:00Z",
  "summary": {
    "total": 8,
    "completed": 2,
    "pending": 6
  },
  "tasks": [
    {
      "id": "task-1",
      "title": "Implement user authentication",
      "description": "Add login/logout functionality with session management",
      "status": "pending",
      "parent_id": null,
      "children": ["task-1a", "task-1b"],
      "depends_on": [],
      "blocked_by": [],
      "metadata": {
        "priority": "high",
        "estimate": "2h",
        "labels": ["auth", "backend"]
      },
      "source_location": {
        "file": "tasks.md",
        "line": 15
      }
    },
    {
      "id": "task-1a",
      "title": "Add login form",
      "description": null,
      "status": "pending",
      "parent_id": "task-1",
      "children": [],
      "depends_on": [],
      "blocked_by": [],
      "metadata": {},
      "source_location": {
        "file": "tasks.md",
        "line": 16
      }
    }
  ]
}
```

**Example display output** (shown to user):

```
## Tasks from tasks.md

| # | Status | Task | Dependencies |
|---|--------|------|--------------|
| 1 | ⬜ | Implement user authentication | - |
|   | ⬜ | └─ Add login form | - |
|   | ⬜ | └─ Add session management | task-1a |
| 2 | ✅ | Set up database schema | - |
| 3 | ⬜ | Add API endpoints | task-2 |
| 4 | ⬜ | Write integration tests | task-1, task-3 |

**Summary**: 6 pending, 2 completed (8 total)
```

## Quality Criteria

- All tasks from the source are captured
- Task IDs are unique and stable
- Completion status is accurately detected
- Dependencies are correctly identified
- Hierarchical relationships (parent/child) are preserved
- Output displays clearly to the user
- JSON output is valid and complete
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

This step transforms raw task data into a structured format that enables smart task selection and tracking. The normalized format allows the workflow to handle tasks consistently regardless of their original source, making it easy to track progress and manage dependencies.

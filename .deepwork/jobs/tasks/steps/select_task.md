# Select Task

## Objective

Choose the next task to work on, either through smart selection based on dependencies and priority, or by accepting a user-specified task ID.

## Task

Analyze the parsed tasks and select one task to implement, ensuring dependencies are satisfied and the selection makes logical sense.

### Process

1. **Read parsed tasks**
   - Load `tasks/parsed_tasks.json` from the previous step
   - Filter to only pending (incomplete) tasks

2. **Check for user-specified task**
   - If `task_id` input was provided, validate and use it
   - Verify the task exists and is pending
   - Check if dependencies are satisfied
   - If dependencies are not met, warn user and ask structured questions about how to proceed

3. **Smart selection (if no task specified)**

   Apply selection algorithm:

   a. **Filter eligible tasks**:
   - Must be pending (not completed)
   - All dependencies must be completed
   - Not blocked by incomplete tasks

   b. **Score remaining tasks**:
   - Priority weight (high=3, medium=2, low=1)
   - Depth weight (prefer leaf tasks over parents)
   - Order weight (prefer earlier tasks)

   c. **Select highest-scoring task**

   d. **Present selection to user**:
   - Show the selected task
   - Explain why it was chosen
   - Ask structured questions to confirm or select different task

4. **Gather task context**
   - Read any linked files or code references
   - Identify affected areas of the codebase
   - Note any special requirements from task description

5. **Confirm selection**
   - Display selected task details
   - Ask structured questions: "Proceed with this task?" with options to confirm, select different task, or view more details

## Output Format

### tasks/selected_task.json

A JSON file containing the selected task with full context.

**Structure**:

```json
{
  "selected_at": "2024-01-15T10:40:00Z",
  "selection_method": "smart|user_specified",
  "task": {
    "id": "task-1a",
    "title": "Add login form",
    "description": "Create a login form component with email/password fields",
    "status": "pending",
    "parent_id": "task-1",
    "metadata": {
      "priority": "high",
      "estimate": "1h",
      "labels": ["auth", "frontend"]
    }
  },
  "context": {
    "parent_task": {
      "id": "task-1",
      "title": "Implement user authentication"
    },
    "dependencies_satisfied": true,
    "blocked_tasks": ["task-1b"],
    "related_files": ["src/components/auth/", "src/app/login/page.tsx"],
    "codebase_areas": ["frontend", "auth"]
  },
  "selection_reasoning": "Selected as highest-priority leaf task with all dependencies satisfied. Part of the authentication epic which is the current focus."
}
```

**Example display to user**:

```
## Selected Task

**Task**: Add login form (task-1a)
**Parent**: Implement user authentication (task-1)
**Priority**: High
**Estimate**: 1 hour

### Why this task?
- Highest priority pending task
- All dependencies are satisfied
- Leaf task (no sub-tasks to complete first)

### Affected areas
- `src/components/auth/`
- `src/app/login/page.tsx`

### After completion
This will unblock: Add session management (task-1b)

Proceed with this task?
```

## Quality Criteria

- Selected task is pending (not already completed)
- All task dependencies are satisfied
- Selection reasoning is clear and logical
- User has opportunity to confirm or change selection
- Task context includes relevant codebase areas
- Output JSON is valid and complete
- When all criteria are met, include `<promise>✓ Quality Criteria Met</promise>` in your response

## Context

One task at a time execution is intentional - it allows for careful review and prevents context switching. The smart selection algorithm respects dependencies to ensure work proceeds in a logical order, while still allowing users to override when they have specific priorities.

---
name: tasks
description: "Execute implementation tasks from specs, PRs, or branches to completion"
---

# tasks

**Multi-step workflow**: Execute implementation tasks from specs, PRs, or branches to completion

> **CRITICAL**: Always invoke steps using the Skill tool. Never copy/paste step instructions directly.

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


## Available Steps

1. **detect_source** - Auto-detect task source from current context or accept explicit input
2. **parse_tasks** - Extract and display tasks from the detected source (requires: detect_source)
3. **select_task** - Smart selection of next task or accept user-specified task (requires: parse_tasks)
4. **implement_task** - Write code to complete the selected task (requires: select_task)
5. **validate_task** - Run tests and typecheck to verify implementation (requires: implement_task)
6. **commit_task** - Commit changes and mark task complete in source (requires: detect_source, select_task, validate_task)
7. **wait_ci** - Monitor GitHub Actions for the commit/PR (requires: commit_task)
8. **debug_ci** - Fetch failed step logs and E2E screenshots for debugging (requires: wait_ci)

## Execution Instructions

### Step 1: Analyze Intent

Parse any text following `/tasks` to determine user intent:
- "detect_source" or related terms → start at `tasks.detect_source`
- "parse_tasks" or related terms → start at `tasks.parse_tasks`
- "select_task" or related terms → start at `tasks.select_task`
- "implement_task" or related terms → start at `tasks.implement_task`
- "validate_task" or related terms → start at `tasks.validate_task`
- "commit_task" or related terms → start at `tasks.commit_task`
- "wait_ci" or related terms → start at `tasks.wait_ci`
- "debug_ci" or related terms → start at `tasks.debug_ci`

### Step 2: Invoke Starting Step

Use the Skill tool to invoke the identified starting step:
```
Skill tool: tasks.detect_source
```

### Step 3: Continue Workflow Automatically

After each step completes:
1. Check if there's a next step in the sequence
2. Invoke the next step using the Skill tool
3. Repeat until workflow is complete or user intervenes

### Handling Ambiguous Intent

If user intent is unclear, use AskUserQuestion to clarify:
- Present available steps as numbered options
- Let user select the starting point

## Guardrails

- Do NOT copy/paste step instructions directly; always use the Skill tool to invoke steps
- Do NOT skip steps in the workflow unless the user explicitly requests it
- Do NOT proceed to the next step if the current step's outputs are incomplete
- Do NOT make assumptions about user intent; ask for clarification when ambiguous

## Context Files

- Job definition: `.deepwork/jobs/tasks/job.yml`
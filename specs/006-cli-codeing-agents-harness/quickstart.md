# Quickstart: CLI Coding Agents Harness

This guide shows how to configure and use CLI coding agents within Catalyst.

## Prerequisites

- Catalyst account with project access
- API key from at least one supported agent provider:
  - **Claude Code**: Anthropic API key (https://console.anthropic.com/)
  - **Aider**: OpenAI API key (https://platform.openai.com/)
  - **Codex CLI**: OpenAI API key (https://platform.openai.com/)
  - **Cline**: Anthropic or OpenAI API key

## Step 1: Configure Agent Credentials

1. Navigate to **Settings → Agents**
2. Click **Add Credential**
3. Select your agent provider (e.g., "Claude Code")
4. Enter your API key
5. Click **Save**

The system will validate your key by making a test API call. If successful, your key is encrypted and stored securely.

**Note**: Your API key is never logged or exposed. The UI only shows the last 4 characters for identification.

## Step 2: Trigger an Agent from an Issue

### Option A: Issue Assignment

1. Open an issue in your project
2. Add the label `agent:claude-code` (or your preferred agent)
3. Assign the issue to yourself or a team member

The agent will automatically:
- Provision a secure environment
- Clone your repository
- Analyze the issue
- Implement changes
- Create a pull request

### Option B: Direct Comment

1. Open an issue
2. Add a comment: `@catalyst-agent claude-code please implement this`
3. The agent will be triggered immediately

## Step 3: Monitor Agent Execution

1. Navigate to **Agent Jobs**
2. Find your job in the list (shows status: queued → running → completed)
3. Click on the job to view details
4. Watch real-time logs as the agent works

**Job Status Indicators**:
- 🟡 **Queued**: Job is waiting to start
- 🔵 **Running**: Agent is actively working
- 🟢 **Completed**: Job finished successfully, PR created
- 🔴 **Failed**: Job encountered an error (check logs)
- ⏱️ **Timeout**: Job exceeded time limit

## Step 4: Review Agent Work

Once the job completes:

1. Check the **Agent Jobs** page for the PR link
2. Review the agent's PR description and code changes
3. Request changes or approve as needed
4. Merge when satisfied

## Advanced: Configure Custom Hooks

Add validation or guardrails before/after agent execution:

1. Navigate to **Projects → [Your Project] → Agents → Hooks**
2. Click **Add Hook**
3. Select hook type:
   - **Pre-execution**: Runs before agent starts (e.g., validate issue format)
   - **Post-execution**: Runs after agent completes (e.g., run tests, lint code)
4. Write your hook script (bash):

```bash
#!/bin/bash
# Example pre-execution hook: Validate issue has acceptance criteria
if ! grep -q "Acceptance Criteria" issue.txt; then
  echo "Error: Issue must include Acceptance Criteria"
  exit 1
fi
```

5. Set timeout (default: 300 seconds)
6. Click **Save**

**Hook Behavior**:
- If a pre-hook fails (exit code ≠ 0), the agent job is cancelled
- If a post-hook fails, the PR is not created and the job is marked failed

## Troubleshooting

### "Invalid API Key" Error

- Verify your API key is correct
- Check that the key has appropriate permissions
- For Anthropic keys, ensure you have credit available

### Agent Job Timeout

- Increase resource limits in project settings
- Check if your repository is very large (consider .gitignore)
- Review agent logs for where it got stuck

### Agent Produced Unexpected Changes

- Review your issue description for clarity
- Add pre/post hooks to validate changes
- Configure code review requirements in your project settings

## Best Practices

1. **Clear Issue Descriptions**: Provide detailed acceptance criteria and context
2. **Start Small**: Test agents on simple issues before complex tasks
3. **Review Everything**: Always review agent-generated code before merging
4. **Monitor Costs**: Track your API usage through your provider's dashboard
5. **Iterate on Hooks**: Add guardrails based on your team's workflow

## Example Workflow

```
Developer creates issue:
  "Add user logout button to navigation bar"
  
  Acceptance Criteria:
  - Button appears in navigation for logged-in users
  - Clicking button logs out user and redirects to home page
  - Button has proper aria-label for accessibility
  
Developer adds label: agent:claude-code

Agent is triggered:
  1. Provisions environment
  2. Reads issue description
  3. Implements changes:
     - Adds logout button component
     - Adds onClick handler
     - Adds accessibility attributes
     - Updates navigation component
  4. Runs tests (if post-hook configured)
  5. Creates PR with description

Developer reviews PR:
  - Verifies acceptance criteria met
  - Checks code quality
  - Approves and merges
```

## Support

- **Documentation**: `/docs/agents`
- **Issues**: Report problems via GitHub issues
- **Community**: Join our Discord for help

## Next Steps

- Configure multiple agent providers for different use cases
- Set up team-wide hooks for consistent quality standards
- Integrate agents into your CI/CD pipeline
- Explore agent-specific features (e.g., Claude Code's plan mode)

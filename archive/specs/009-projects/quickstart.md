# Quickstart: Projects Management

## Prerequisites
- Catalyst instance running
- GitHub App configured and connected
- Team created in Catalyst

## 1. Create a Project via MCP
Use the `create_project` tool:
```json
{
  "name": "My New Feature",
  "repositoryId": "repo-uuid-from-vcs",
  "teamId": "team-uuid"
}
```

## 2. Configure Agents
Enable the Platform Agent to handle maintenance:
```json
{
  "projectId": "project-uuid",
  "agentType": "platform",
  "enabled": true,
  "config": { "autoFixLint": true }
}
```

## 3. View Prioritized Work
Query the work items:
```json
{
  "projectId": "project-uuid"
}
```

## 4. Add a Spec
Commit a file named `specs/my-feature.md` to your repository. Catalyst will automatically index it.
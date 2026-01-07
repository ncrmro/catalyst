# Quickstart: CLI Coding Agents Harness

**Spec**: `006-cli-codeing-agents-harness`

## Overview

This feature enables running CLI-based coding agents (Claude Code, Aider, Codex CLI, Cline) within Catalyst-managed Kubernetes environments. Users authenticate with their own API keys, and agents execute tasks in isolated namespaces with full context from repositories, PRs, and issues.

## Prerequisites

- [ ] Node.js 20+
- [ ] Docker and Docker Compose
- [ ] Kubernetes cluster (local K3s VM or remote cluster)
- [ ] PostgreSQL database
- [ ] Go 1.21+ (for operator development)
- [ ] kubectl configured with cluster access
- [ ] Agent provider API key (Anthropic, OpenAI, etc.) for testing

## Setup

### 1. Start Infrastructure

```bash
# Start local K3s VM and dependencies
make up

# Verify K3s cluster is running
bin/kubectl get nodes

# Verify operator is running
bin/kubectl get pods -n catalyst-system
```

### 2. Install Dependencies

```bash
# Install web app dependencies
cd web
npm install

# Install operator dependencies
cd ../operator
go mod download
```

### 3. Database Setup

```bash
cd web

# Run migrations (includes agent tables)
npm run db:migrate

# Seed agent providers
npm run db:seed:agents
```

### 4. Start Development Servers

```bash
# Terminal 1: Web application
cd web
npm run dev

# Terminal 2: Operator (if developing operator features)
cd operator
make run
```

## Key Files

| File | Purpose |
| --- | --- |
| `web/src/db/schema.ts` | Agent database schema |
| `web/src/models/agent-tasks.ts` | Task orchestration logic |
| `web/src/actions/agent-tasks.ts` | Server actions for tasks |
| `web/src/app/settings/agents/page.tsx` | Credential management UI |
| `web/src/app/projects/[slug]/agents/page.tsx` | Task management UI |
| `operator/internal/controller/environment_controller.go` | Agent workspace reconciliation |
| `dockerfiles/agent-runner/Dockerfile` | Multi-agent container image |

## Development Workflow

### Testing Agent Credential Management

1. Navigate to `/settings/agents`
2. Click "Add Agent Credential"
3. Select provider (e.g., Claude Code)
4. Enter test API key
5. Click "Test" to validate credential
6. Save credential

**Expected**: Credential is encrypted and stored, shows in list with "last tested" timestamp

### Testing Agent Task Creation

1. Navigate to a project: `/projects/[slug]`
2. Go to "Agents" tab
3. Click "Create Task"
4. Fill in:
   - Task type: "feature-dev"
   - Instructions: "Add a hello world endpoint"
   - Select agent provider and credential
5. Submit

**Expected**: 
- Task created with status "pending"
- Environment CR created in Kubernetes
- Task transitions to "provisioning" → "running"
- Logs appear in task detail page

### Testing PR Integration

1. Open a pull request in connected repository
2. Click "Invoke Agent" button on PR detail page
3. Enter instructions
4. Select agent and credential

**Expected**:
- Agent task created with PR context
- Comment posted to PR with task link
- Agent runs on PR branch
- Results (commits, comments) posted back to PR

## Manual Testing

### Test Agent Workspace Provisioning

```bash
# Create a test Environment CR for agent workspace
cat <<EOF | kubectl apply -f -
apiVersion: catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: test-agent-task
  namespace: catalyst-system
spec:
  type: agent-workspace
  projectId: "test-project-uuid"
  branch: "main"
  agentConfig:
    provider: claude-code
    taskId: "test-task-uuid"
    environmentVariables:
      - name: ANTHROPIC_API_KEY
        value: "sk-test-key"
    resourceLimits:
      cpu: "1"
      memory: 2Gi
      timeout: 600
  repository:
    url: https://github.com/ncrmro/catalyst
    branch: main
EOF

# Watch the operator reconcile
bin/kubectl get environments -w

# Check created namespace
bin/kubectl get namespaces | grep agent

# Check agent job
bin/kubectl get jobs -n agent-workspace-test-agent-task

# Check job logs
bin/kubectl logs -n agent-workspace-test-agent-task -l job-name=agent-task-test-agent-task
```

### Test Credential Encryption

```bash
cd web

# Run encryption test
npm run test -- src/lib/encryption.test.ts

# Verify credentials are encrypted in database
npm run dbshell
SELECT id, label, LEFT(encrypted_api_key, 20) || '...' as encrypted_key 
FROM user_agent_credentials 
WHERE user_id = 'your-user-id';
```

### Test Network Policies

```bash
# Get agent workspace namespace
NAMESPACE=$(bin/kubectl get namespaces | grep agent-workspace | head -1 | awk '{print $1}')

# Check NetworkPolicy
bin/kubectl get networkpolicy -n $NAMESPACE

# Test DNS resolution (should work)
bin/kubectl run test-pod -n $NAMESPACE --image=busybox --rm -it -- nslookup google.com

# Test unauthorized egress (should fail)
bin/kubectl run test-pod -n $NAMESPACE --image=busybox --rm -it -- wget http://internal-service.default.svc.cluster.local
```

## Automated Tests

### Unit Tests

```bash
cd web

# Test agent models
npm run test -- src/models/agent-tasks.test.ts

# Test encryption utilities
npm run test -- src/lib/encryption.test.ts

# Test agent actions
npm run test -- src/actions/agent-tasks.test.ts
```

### Integration Tests

```bash
cd web

# Test full agent task flow
npm run test:integration -- __tests__/integration/agent-tasks.test.ts
```

### E2E Tests

```bash
cd web

# Test credential management UI
npm run test:e2e -- __tests__/e2e/agent-credentials.spec.ts

# Test task creation and monitoring
npm run test:e2e -- __tests__/e2e/agent-tasks.spec.ts
```

### Operator Tests

```bash
cd operator

# Run unit tests
go test ./...

# Run integration tests with test cluster
make test-integration
```

## Common Issues

### Issue: Agent CLI Installation Fails

**Symptom**: Agent runner container fails to start with "command not found"

**Solution**: 
1. Check Dockerfile for correct CLI installation commands
2. Verify agent provider name matches installed CLI
3. Test CLI installation manually:
```bash
docker build -t agent-runner:test -f dockerfiles/agent-runner/Dockerfile .
docker run -it agent-runner:test /bin/bash
# Try running agent CLI commands
```

### Issue: Credential Decryption Fails

**Symptom**: "Unable to decrypt credential" error when creating task

**Solution**:
1. Verify `ENCRYPTION_KEY` environment variable is set consistently
2. Check that encryption IV was stored correctly
3. Test encryption/decryption:
```bash
cd web
npm run test -- src/lib/encryption.test.ts -t "encrypt and decrypt"
```

### Issue: Agent Workspace Times Out

**Symptom**: Task stuck in "running" status, eventually fails with timeout

**Solution**:
1. Check agent job logs:
```bash
NAMESPACE=$(bin/kubectl get env -o jsonpath='{.items[?(@.spec.agentConfig.taskId=="YOUR_TASK_ID")].metadata.namespace}')
bin/kubectl logs -n $NAMESPACE -l job-name=agent-task-*
```
2. Verify API key is valid and has sufficient quota
3. Check network policies allow egress to agent provider API
4. Increase timeout in Environment spec if needed

### Issue: Operator Not Reconciling

**Symptom**: Environment CR created but no namespace/job appears

**Solution**:
1. Check operator logs:
```bash
bin/kubectl logs -n catalyst-system -l app=catalyst-operator
```
2. Verify CRD is registered:
```bash
bin/kubectl get crd environments.catalyst.dev
```
3. Check RBAC permissions:
```bash
bin/kubectl auth can-i create namespaces --as=system:serviceaccount:catalyst-system:catalyst-operator
```

### Issue: NetworkPolicy Blocks Required Traffic

**Symptom**: Agent can't reach external API, times out with connection errors

**Solution**:
1. Check which API the agent needs to reach
2. Update NetworkPolicy to allow egress:
```yaml
# In operator NetworkPolicy template
egress:
  - to:
      - podSelector: {}
    ports:
      - protocol: TCP
        port: 443 # HTTPS for external APIs
```
3. Apply updated policy or recreate environment

## Development Tips

### Debugging Agent Execution

1. **Watch Environment status**:
```bash
bin/kubectl get environments -w
bin/kubectl describe environment <env-name>
```

2. **Stream agent job logs**:
```bash
bin/kubectl logs -f -n <namespace> -l job-name=agent-task-*
```

3. **Exec into agent pod** (if still running):
```bash
POD=$(bin/kubectl get pods -n <namespace> -l job-name=agent-task-* -o name | head -1)
bin/kubectl exec -n <namespace> -it $POD -- /bin/bash
```

### Testing Different Agents

To test with different agent providers:

1. Update agent provider seed data in `web/src/db/seed/agents.ts`
2. Add installation commands to `dockerfiles/agent-runner/Dockerfile`
3. Update `entrypoint.sh` with agent-specific invocation
4. Test with a simple task first

### Local Development Without Kubernetes

For frontend-only development:

1. Mock the agent task API responses in `web/src/mocks/`
2. Set environment variable: `MOCK_AGENT_TASKS=true`
3. Use fixture data for task status and logs

## Related Docs

- [spec.md](./spec.md) - Feature specification and user stories
- [plan.md](./plan.md) - Technical implementation details
- [tasks.md](./tasks.md) - Phased task breakdown
- [../../operator/spec.md](../../operator/spec.md) - Kubernetes operator specification
- [../../AGENTS.md](../../AGENTS.md) - General agent guidance

## Next Steps

1. Complete Phase 0 spikes (see tasks.md)
2. Implement database schema (Phase 1)
3. Extend operator for agent workspaces (Phase 2)
4. Build credential management UI (Phase 4)
5. Build task management UI (Phase 5)

## Getting Help

- Check operator logs: `bin/kubectl logs -n catalyst-system -l app=catalyst-operator`
- Check web app logs: `docker logs catalyst-web`
- Review task detail page for agent execution logs
- See [Common Issues](#common-issues) above

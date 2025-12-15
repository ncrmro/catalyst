# MCP Server API Contract

**Feature**: PR Preview Environments
**Layer**: MCP Tools (AI Agent Interface)
**File**: `src/app/api/mcp/route.ts` (EXTEND existing)

## Overview

The MCP (Model Context Protocol) server provides AI agent-accessible tools for managing preview environments. This contract extends the existing MCP server with preview environment management tools.

**Constitutional Alignment**: Principle 1 (Agentic-First Design) requires all features be accessible via MCP tools.

---

## MCP Tools

### 1. `list_preview_environments`

List all active preview environments for accessible repos.

**Tool Definition**:
```typescript
{
  name: "list_preview_environments",
  description: "List all active preview environments for repos you have access to",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Filter by status: 'pending', 'deploying', 'running', 'failed', 'deleting'",
        enum: ["pending", "deploying", "running", "failed", "deleting"],
      },
      repoFullName: {
        type: "string",
        description: "Filter by repository full name (e.g., 'owner/repo')",
      },
    },
    required: [],
  },
}
```

**Handler Implementation**:
```typescript
async function handleListPreviewEnvironments(
  args: { status?: PodStatus; repoFullName?: string },
  userId: string
): Promise<MCPToolResponse> {
  const result = await listActivePreviewPods(userId);

  if (!result.success) {
    return { error: result.error };
  }

  let pods = result.pods;

  // Apply filters
  if (args.status) {
    pods = pods.filter(p => p.status === args.status);
  }

  if (args.repoFullName) {
    pods = pods.filter(p => p.repo.fullName === args.repoFullName);
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          count: pods.length,
          environments: pods.map(p => ({
            id: p.id,
            namespace: p.namespace,
            status: p.status,
            publicUrl: p.publicUrl,
            branch: p.branch,
            commitSha: p.commitSha.substring(0, 7),
            repo: p.repo.fullName,
            prNumber: p.pullRequest.number,
            createdAt: p.createdAt,
          })),
        }, null, 2),
      },
    ],
  };
}
```

**Example Usage (Agent)**:
```
Agent: "List all active preview environments"
Tool Call: list_preview_environments({})
Response: {
  "count": 3,
  "environments": [
    {
      "id": "pod-uuid-123",
      "namespace": "pr-myapp-42",
      "status": "running",
      "publicUrl": "https://pr-42.preview.example.com",
      "branch": "feature/new-ui",
      "commitSha": "abc123d",
      "repo": "myorg/myapp",
      "prNumber": 42,
      "createdAt": "2025-01-08T10:30:00Z"
    }
  ]
}
```

---

### 2. `get_preview_environment`

Get detailed information about a specific preview environment.

**Tool Definition**:
```typescript
{
  name: "get_preview_environment",
  description: "Get detailed information about a specific preview environment by ID or namespace",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Preview environment ID (UUID)",
      },
      namespace: {
        type: "string",
        description: "Kubernetes namespace (e.g., 'pr-myapp-42')",
      },
    },
    oneOf: [{ required: ["id"] }, { required: ["namespace"] }],
  },
}
```

**Handler Implementation**:
```typescript
async function handleGetPreviewEnvironment(
  args: { id?: string; namespace?: string },
  userId: string
): Promise<MCPToolResponse> {
  let pod;

  if (args.id) {
    const result = await getPreviewEnvironment(args.id);
    if (!result.success) return { error: result.error };
    pod = result.data;
  } else if (args.namespace) {
    const result = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.namespace, args.namespace))
      .limit(1);

    if (!result.length) {
      return { error: `Preview environment not found: ${args.namespace}` };
    }
    pod = result[0];
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          id: pod.id,
          namespace: pod.namespace,
          status: pod.status,
          publicUrl: pod.publicUrl,
          branch: pod.branch,
          commitSha: pod.commitSha,
          imageTag: pod.imageTag,
          errorMessage: pod.errorMessage,
          resourcesAllocated: pod.resourcesAllocated,
          lastDeployedAt: pod.lastDeployedAt,
          createdAt: pod.createdAt,
          pullRequest: {
            number: pod.pullRequest.number,
            title: pod.pullRequest.title,
            url: pod.pullRequest.url,
          },
          repo: {
            name: pod.repo.name,
            fullName: pod.repo.fullName,
          },
        }, null, 2),
      },
    ],
  };
}
```

**Example Usage (Agent)**:
```
Agent: "Show me details for preview environment pr-myapp-42"
Tool Call: get_preview_environment({ namespace: "pr-myapp-42" })
Response: {
  "id": "pod-uuid-123",
  "namespace": "pr-myapp-42",
  "status": "running",
  "publicUrl": "https://pr-42.preview.example.com",
  "branch": "feature/new-ui",
  "commitSha": "abc123def456...",
  "resourcesAllocated": {
    "cpu": "500m",
    "memory": "512Mi",
    "pods": 1
  },
  "pullRequest": {
    "number": 42,
    "title": "Add new UI components",
    "url": "https://github.com/myorg/myapp/pull/42"
  }
}
```

---

### 3. `get_preview_logs`

Fetch container logs from a preview environment.

**Tool Definition**:
```typescript
{
  name: "get_preview_logs",
  description: "Fetch container logs from a preview environment pod",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Preview environment ID (UUID)",
      },
      namespace: {
        type: "string",
        description: "Kubernetes namespace (e.g., 'pr-myapp-42')",
      },
      tailLines: {
        type: "number",
        description: "Number of lines to fetch from end of log (default: 500)",
        default: 500,
      },
      timestamps: {
        type: "boolean",
        description: "Include timestamps in log output (default: true)",
        default: true,
      },
    },
    oneOf: [{ required: ["id"] }, { required: ["namespace"] }],
  },
}
```

**Handler Implementation**:
```typescript
async function handleGetPreviewLogs(
  args: { id?: string; namespace?: string; tailLines?: number; timestamps?: boolean },
  userId: string
): Promise<MCPToolResponse> {
  let podId = args.id;

  if (args.namespace) {
    const result = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.namespace, args.namespace))
      .limit(1);

    if (!result.length) {
      return { error: `Preview environment not found: ${args.namespace}` };
    }
    podId = result[0].id;
  }

  const result = await getPreviewPodLogs(podId, userId, {
    tailLines: args.tailLines || 500,
    timestamps: args.timestamps !== false,
  });

  if (!result.success) {
    return { error: result.error };
  }

  return {
    content: [
      {
        type: "text",
        text: result.logs,
      },
    ],
  };
}
```

**Example Usage (Agent)**:
```
Agent: "Show me the last 100 lines of logs for preview environment pr-myapp-42"
Tool Call: get_preview_logs({ namespace: "pr-myapp-42", tailLines: 100 })
Response: [logs output as plain text]
```

---

### 4. `delete_preview_environment`

Delete a preview environment and clean up resources.

**Tool Definition**:
```typescript
{
  name: "delete_preview_environment",
  description: "Delete a preview environment and clean up Kubernetes resources",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Preview environment ID (UUID)",
      },
      namespace: {
        type: "string",
        description: "Kubernetes namespace (e.g., 'pr-myapp-42')",
      },
    },
    oneOf: [{ required: ["id"] }, { required: ["namespace"] }],
  },
}
```

**Handler Implementation**:
```typescript
async function handleDeletePreviewEnvironment(
  args: { id?: string; namespace?: string },
  userId: string
): Promise<MCPToolResponse> {
  let podId = args.id;

  if (args.namespace) {
    const result = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.namespace, args.namespace))
      .limit(1);

    if (!result.length) {
      return { error: `Preview environment not found: ${args.namespace}` };
    }
    podId = result[0].id;
  }

  const result = await deletePreviewDeployment(podId, userId);

  if (!result.success) {
    return { error: result.error };
  }

  return {
    content: [
      {
        type: "text",
        text: `Preview environment deleted successfully: ${args.namespace || args.id}`,
      },
    ],
  };
}
```

**Example Usage (Agent)**:
```
Agent: "Delete the preview environment for PR 42"
Tool Call: delete_preview_environment({ namespace: "pr-myapp-42" })
Response: "Preview environment deleted successfully: pr-myapp-42"
```

---

### 5. `retry_preview_deployment`

Retry a failed preview environment deployment.

**Tool Definition**:
```typescript
{
  name: "retry_preview_deployment",
  description: "Retry a failed preview environment deployment",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Preview environment ID (UUID)",
      },
      namespace: {
        type: "string",
        description: "Kubernetes namespace (e.g., 'pr-myapp-42')",
      },
    },
    oneOf: [{ required: ["id"] }, { required: ["namespace"] }],
  },
}
```

**Handler Implementation**:
```typescript
async function handleRetryPreviewDeployment(
  args: { id?: string; namespace?: string },
  userId: string
): Promise<MCPToolResponse> {
  let podId = args.id;

  if (args.namespace) {
    const result = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.namespace, args.namespace))
      .limit(1);

    if (!result.length) {
      return { error: `Preview environment not found: ${args.namespace}` };
    }
    podId = result[0].id;
  }

  const result = await retryFailedDeployment(podId, userId);

  if (!result.success) {
    return { error: result.error };
  }

  return {
    content: [
      {
        type: "text",
        text: `Deployment retry initiated for: ${args.namespace || args.id}`,
      },
    ],
  };
}
```

**Example Usage (Agent)**:
```
Agent: "Retry the failed deployment for pr-myapp-42"
Tool Call: retry_preview_deployment({ namespace: "pr-myapp-42" })
Response: "Deployment retry initiated for: pr-myapp-42"
```

---

## Integration with Existing MCP Server

**Extend MCP Route Handler**:
```typescript
// src/app/api/mcp/route.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "catalyst-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register preview environment tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    // ... existing tools
    {
      name: "list_preview_environments",
      description: "List all active preview environments",
      inputSchema: { /* ... */ },
    },
    {
      name: "get_preview_environment",
      description: "Get details for a specific preview environment",
      inputSchema: { /* ... */ },
    },
    {
      name: "get_preview_logs",
      description: "Fetch logs from a preview environment",
      inputSchema: { /* ... */ },
    },
    {
      name: "delete_preview_environment",
      description: "Delete a preview environment",
      inputSchema: { /* ... */ },
    },
    {
      name: "retry_preview_deployment",
      description: "Retry a failed deployment",
      inputSchema: { /* ... */ },
    },
  ],
}));

// Register tool handlers
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  // Get user context from MCP session
  const userId = getUserIdFromMCPSession(request);

  switch (name) {
    case "list_preview_environments":
      return await handleListPreviewEnvironments(args, userId);
    case "get_preview_environment":
      return await handleGetPreviewEnvironment(args, userId);
    case "get_preview_logs":
      return await handleGetPreviewLogs(args, userId);
    case "delete_preview_environment":
      return await handleDeletePreviewEnvironment(args, userId);
    case "retry_preview_deployment":
      return await handleRetryPreviewDeployment(args, userId);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

---

## Authorization in MCP Context

**User Context Extraction**:
```typescript
function getUserIdFromMCPSession(request: MCPRequest): string {
  // Extract user ID from MCP session metadata
  const userId = request.meta?.userId;

  if (!userId) {
    throw new Error("Unauthorized: No user context in MCP session");
  }

  return userId;
}
```

**Authorization Pattern**:
All MCP tool handlers follow the same authorization pattern as Actions layer functions, delegating to Models layer with user ID.

---

## Error Handling

**MCP Error Format**:
```typescript
{
  error: {
    code: "UNAUTHORIZED" | "NOT_FOUND" | "INVALID_INPUT" | "SERVER_ERROR",
    message: "Human-readable error message"
  }
}
```

**Example**:
```typescript
if (!result.success) {
  return {
    error: {
      code: "NOT_FOUND",
      message: result.error,
    },
  };
}
```

---

## Testing Strategy

**MCP Tool Testing**:
1. **Unit Tests**: Mock Models layer, test tool handler logic
2. **Integration Tests**: Full MCP server with test database
3. **Agent Tests**: Simulate AI agent interactions

**Example Test**:
```typescript
// __tests__/integration/mcp-preview-tools.test.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { setupMCPServer } from "@/app/api/mcp/route";

describe("MCP Preview Environment Tools", () => {
  let server: Server;

  beforeAll(() => {
    server = setupMCPServer();
  });

  it("lists preview environments", async () => {
    const response = await server.callTool({
      name: "list_preview_environments",
      arguments: {},
    });

    expect(response.content[0].type).toBe("text");
    const data = JSON.parse(response.content[0].text);
    expect(data).toHaveProperty("count");
    expect(data).toHaveProperty("environments");
  });
});
```

---

## Summary

- **5 MCP tools** for full preview environment lifecycle management
- **Dual-access patterns**: By ID or namespace for flexibility
- **Consistent authorization**: Reuses Models layer with user context
- **Agent-friendly responses**: JSON-formatted, machine-readable
- **Error handling**: Structured error responses with codes

**Constitutional Alignment**:
- ✅ **Principle 1 (Agentic-First)**: All preview environment features accessible via MCP tools
- ✅ **Principle 4 (Security)**: Authorization enforced at MCP handler level
- ✅ **Principle 6 (Layered Architecture)**: MCP tools delegate to Models layer

**Next**: See `quickstart.md` for developer onboarding guide.

# Web Terminal Implementation Research

## Problem Statement

Interactive web terminals require bidirectional real-time communication between the browser and Kubernetes pod containers. The browser sends keystrokes (stdin), and the pod streams output back (stdout/stderr). This requires WebSocket or similar persistent connection protocols.

**Current limitation**: Next.js 15 doesn't support WebSocket route handlers natively. The `next-ws` package, which previously provided this functionality by patching Next.js internals, is not compatible with Next.js 15 due to:

- Turbopack as the default bundler (changed internal architecture)
- Removal/refactoring of custom server hooks
- Focus shift to Server Actions and Edge Runtime

## Current Implementation

The `@catalyst/kubernetes-client` package implements command-by-command execution:

1. User types command in terminal UI (xterm.js)
2. On Enter, command sent via server action to `pod-exec.ts`
3. Server action executes command in pod container
4. Result (stdout/stderr) returned and displayed

**Limitations**:

- No streaming output (must wait for command to complete)
- No interactive programs (vim, htop, etc.)
- No tab completion
- No Ctrl+C interruption

## Approaches Evaluated

### 1. next-ws Package

**How it works**: Patches Next.js internals to intercept HTTP upgrade requests and handle WebSocket connections within route handlers.

```typescript
// Would work like this (if compatible)
export function SOCKET(client: WebSocket, request: Request) {
  client.on("message", (data) => {
    // Forward to K8s exec WebSocket
  });
}
```

**Status**: Blocked in Next.js 15

- Package relies on hooks in `next/dist/server/next-server.js`
- Next.js 15 refactored these internals for Turbopack
- No timeline for next-ws compatibility update

**Trade-offs**:
| Pros | Cons |
|------|------|
| Clean integration with Next.js routing | Depends on internal Next.js APIs |
| No additional infrastructure | Breaks on major Next.js updates |
| Type-safe with existing codebase | Currently incompatible |

### 2. Server-Sent Events (SSE)

**How it works**: Uses HTTP streaming for server→client communication. Next.js 15 Route Handlers support SSE via `ReadableStream`.

```typescript
// app/api/pod-logs/route.ts
export async function GET(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      // Stream logs from pod
      for await (const chunk of podLogStream) {
        controller.enqueue(`data: ${chunk}\n\n`);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Good for**:

- Log streaming (output only)
- Deployment status updates
- Build progress

**Not suitable for**:

- Interactive terminals (no stdin support)
- Bidirectional communication

**Trade-offs**:
| Pros | Cons |
|------|------|
| Works with Next.js 15 natively | One-way only (server→client) |
| Simple implementation | Cannot send user input |
| Good for log streaming | Not suitable for interactive shells |

### 3. Polling / Request-Response

**How it works**: Current implementation. Each command is a separate HTTP request.

```typescript
// Server action
export async function executeCommand(
  namespace: string,
  pod: string,
  command: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return await exec(kubeConfig, {
    namespace,
    pod,
    command: command.split(" "),
  });
}
```

**Trade-offs**:
| Pros | Cons |
|------|------|
| Works with any framework | Not truly interactive |
| Simple, stateless | No streaming output |
| No additional infrastructure | High latency for rapid commands |
| | Cannot run interactive programs |

### 4. Custom Next.js Server

**How it works**: Replace Next.js's default server with a custom one that handles both HTTP and WebSocket.

```typescript
// server.ts
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer } from "ws";

const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const wss = new WebSocketServer({ server, path: "/api/terminal" });

  wss.on("connection", (ws, req) => {
    // Handle WebSocket connections
    // Connect to K8s exec API
  });

  server.listen(3000);
});
```

**What you lose**:

- `next start` command (must use custom entry point)
- Automatic static optimization (may work but untested)
- Vercel deployment (Vercel expects standard Next.js)
- Edge Runtime (custom server is Node.js only)
- Turbopack development support
- Incremental Static Regeneration (ISR) may have issues

**What you keep**:

- All Next.js features in request handling
- Server components, actions, middleware
- Works with `output: 'standalone'` for Docker

**Deployment**:

```dockerfile
FROM node:20-alpine
COPY .next/standalone ./
COPY server.ts ./
CMD ["node", "server.js"]
```

**Trade-offs**:
| Pros | Cons |
|------|------|
| Full WebSocket control | Loses `next start` |
| Single process deployment | No Vercel deployment |
| Works with standalone output | More complex setup |
| | Turbopack incompatible |

### 5. Sidecar WebSocket Server

**How it works**: Run a separate WebSocket server alongside Next.js. Next.js handles HTTP, sidecar handles WebSocket.

```
                    ┌─────────────────────┐
                    │   Load Balancer     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │  Next.js    │  │  WebSocket  │  │  K8s API    │
       │  (HTTP)     │  │  Server     │  │  Server     │
       │  :3000      │  │  :3001      │  │  :6443      │
       └─────────────┘  └──────┬──────┘  └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  K8s Exec   │
                        │  WebSocket  │
                        └─────────────┘
```

**Implementation options**:

1. **Node.js service**: Simple WebSocket server using `ws` package
2. **Go service**: Lightweight, efficient, matches operator language
3. **Existing tools**: gotty, ttyd (terminal-over-HTTP tools)

**Kubernetes deployment**:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: web
          image: catalyst-web:latest
          ports:
            - containerPort: 3000
        - name: terminal-proxy
          image: catalyst-terminal:latest
          ports:
            - containerPort: 3001
```

**Trade-offs**:
| Pros | Cons |
|------|------|
| Next.js stays standard | Additional container/process |
| Independent scaling | More complex deployment |
| Language-agnostic sidecar | Requires service mesh or ingress config |
| Can be developed/tested separately | Cross-origin considerations |

### 6. Operator as WebSocket Proxy

**How it works**: The Kubernetes operator (already running in-cluster) exposes a WebSocket endpoint for exec connections.

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  xterm.js ──WebSocket──► wss://operator.catalyst/exec  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                          │
│                                                               │
│  ┌─────────────┐      ┌─────────────────────────────────┐   │
│  │  Next.js    │      │  kube-operator                   │   │
│  │  (HTTP)     │      │  ┌─────────────┐                │   │
│  │             │      │  │ HTTP API    │ ◄── JWT Auth   │   │
│  │             │      │  │ + WebSocket │                │   │
│  └─────────────┘      │  └──────┬──────┘                │   │
│                       │         │                        │   │
│                       │         ▼                        │   │
│                       │  ┌─────────────┐                │   │
│                       │  │ K8s Exec    │                │   │
│                       │  │ Subprotocol │                │   │
│                       │  └─────────────┘                │   │
│                       └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Operator responsibilities expand**:

- Manage Environment CRs (existing)
- Expose `/exec` WebSocket endpoint (new)
- Validate JWT tokens from web app (new)
- Enforce RBAC for exec access (new)

**Trade-offs**:
| Pros | Cons |
|------|------|
| Operator already in-cluster | Increases operator scope |
| Single binary for K8s operations | Mixes orchestration with user access |
| In-cluster service account access | Must expose operator externally |
| Natural place for K8s RBAC enforcement | More attack surface on operator |

## Authentication Patterns

For approaches requiring external WebSocket servers (sidecar, operator, custom server), authentication is needed to verify user identity and authorization.

### JWT Token Flow

**How it works**: Web app generates short-lived JWT containing user identity and pod access permissions.

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │         │  Next.js    │         │  WS Server  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. Request exec token │                       │
       │──────────────────────►│                       │
       │                       │                       │
       │ 2. JWT (short-lived)  │                       │
       │◄──────────────────────│                       │
       │                       │                       │
       │ 3. WebSocket + JWT    │                       │
       │───────────────────────────────────────────────►
       │                       │                       │
       │                       │  4. Validate JWT      │
       │                       │  (signature, expiry,  │
       │                       │   permissions)        │
       │                       │                       │
       │ 5. WebSocket stream   │                       │
       │◄──────────────────────────────────────────────│
```

**Token structure**:

```typescript
interface ExecToken {
  // Standard JWT claims
  iss: string; // "catalyst-web"
  sub: string; // user ID
  aud: string; // "catalyst-exec"
  exp: number; // short expiry (5-15 minutes)
  iat: number;

  // Catalyst-specific claims
  namespace: string; // allowed namespace
  pod: string; // allowed pod
  container?: string; // optional container restriction
  permissions: {
    exec: boolean;
    logs: boolean;
    portForward: boolean;
  };
}
```

**Implementation**:

```typescript
// Next.js API route to generate exec token
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { namespace, pod } = await request.json();

  // Verify user has access to this environment
  const hasAccess = await checkUserAccess(session.user.id, namespace);
  if (!hasAccess) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = jwt.sign(
    {
      sub: session.user.id,
      namespace,
      pod,
      permissions: { exec: true, logs: true, portForward: false },
    },
    process.env.EXEC_JWT_SECRET!,
    {
      issuer: "catalyst-web",
      audience: "catalyst-exec",
      expiresIn: "5m",
    },
  );

  return Response.json({ token });
}
```

**WebSocket server validation**:

```typescript
wss.on("connection", async (ws, req) => {
  const token = new URL(req.url!, "http://localhost").searchParams.get("token");

  try {
    const payload = jwt.verify(token!, process.env.EXEC_JWT_SECRET!, {
      issuer: "catalyst-web",
      audience: "catalyst-exec",
    }) as ExecToken;

    // Connect to K8s exec API for the authorized pod
    const execStream = await k8sExec(payload.namespace, payload.pod);
    // Pipe WebSocket ↔ K8s exec
  } catch (error) {
    ws.close(4001, "Invalid token");
  }
});
```

### Service Account Pattern (for Operator)

**How it works**: Operator uses Kubernetes service account for K8s API access, while validating user identity via JWT.

```yaml
# Operator ServiceAccount with exec permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-operator
  namespace: catalyst-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-operator-exec
rules:
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-operator-exec
subjects:
  - kind: ServiceAccount
    name: kube-operator
    namespace: catalyst-system
roleRef:
  kind: ClusterRole
  name: kube-operator-exec
  apiGroup: rbac.authorization.k8s.io
```

**User context propagation**:

```go
// Operator exec handler
func (h *ExecHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // 1. Validate JWT from web app
    token := r.URL.Query().Get("token")
    claims, err := h.validateToken(token)
    if err != nil {
        http.Error(w, "Unauthorized", 401)
        return
    }

    // 2. Check user has access to namespace (from JWT claims)
    if !h.checkNamespaceAccess(claims.UserID, claims.Namespace) {
        http.Error(w, "Forbidden", 403)
        return
    }

    // 3. Audit log the exec request
    h.auditLog.Record(AuditEvent{
        User:      claims.UserID,
        Action:    "exec",
        Namespace: claims.Namespace,
        Pod:       claims.Pod,
        Timestamp: time.Now(),
    })

    // 4. Use service account to execute (operator has cluster permissions)
    h.execInPod(claims.Namespace, claims.Pod, claims.Container)
}
```

### Token Exchange Flow

Alternative pattern where the external server validates tokens against the web app:

```
Browser ──► WS Server ──► Next.js API (validate) ──► OK/Deny
                │
                ▼
           K8s Exec (if OK)
```

Less common, adds latency, but useful if JWT secrets can't be shared.

## Security Considerations

### Token Expiration

- Exec tokens should be short-lived (5-15 minutes)
- WebSocket connections may outlive token expiry
- Options:
  - Periodic re-authentication via control message
  - Maximum session duration enforced server-side
  - Token refresh before expiry

### Audit Logging

All exec sessions should be logged:

```typescript
interface ExecAuditLog {
  userId: string;
  namespace: string;
  pod: string;
  container: string;
  startTime: Date;
  endTime?: Date;
  commands?: string[]; // If command logging enabled
  clientIP: string;
  userAgent: string;
}
```

### Network Policies

```yaml
# Allow ingress to WebSocket server only from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: terminal-server
spec:
  podSelector:
    matchLabels:
      app: terminal-server
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 3001
```

### Rate Limiting

- Limit concurrent exec sessions per user
- Limit connection attempts (prevent brute force)
- Limit bandwidth per session

## Kubernetes Exec Protocol

For reference, the Kubernetes exec API uses WebSocket with specific subprotocols:

**Subprotocol**: `v4.channel.k8s.io`

**Channels** (first byte of each message):

- `0`: stdin
- `1`: stdout
- `2`: stderr
- `3`: error (JSON-encoded error message)
- `4`: resize (JSON: `{"Width": 80, "Height": 24}`)

**Connection URL**:

```
wss://k8s-api:6443/api/v1/namespaces/{ns}/pods/{pod}/exec
  ?command=bash
  &stdin=true
  &stdout=true
  &stderr=true
  &tty=true
```

## Summary

| Approach       | Interactive Terminal  | Complexity  | Next.js Compatibility  | Deployment Impact       |
| -------------- | --------------------- | ----------- | ---------------------- | ----------------------- |
| next-ws        | ✅ Full               | Low         | ❌ Blocked in 15       | None                    |
| SSE            | ❌ Output only        | Low         | ✅ Native              | None                    |
| Polling        | ❌ Command-by-command | Low         | ✅ Native              | None                    |
| Custom Server  | ✅ Full               | Medium      | ⚠️ Loses some features | Custom entrypoint       |
| Sidecar        | ✅ Full               | Medium-High | ✅ No impact           | Additional container    |
| Operator Proxy | ✅ Full               | Medium      | ✅ No impact           | Operator scope increase |

Each approach has distinct trade-offs. The choice depends on:

- Deployment constraints (Vercel vs self-hosted)
- Operational complexity tolerance
- Feature requirements (interactive vs output-only)
- Security model preferences

## References

- [Kubernetes Exec Documentation](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#exec)
- [xterm.js Documentation](https://xtermjs.org/docs/)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455 - The WebSocket Protocol](https://tools.ietf.org/html/rfc6455)

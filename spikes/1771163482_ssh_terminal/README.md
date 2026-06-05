# SSH Terminal Session for Preview Environments

## Problem Statement

Users need interactive shell access to debug their preview environment pods. Currently, the Catalyst platform provides:
- Command-by-command terminal execution (via `terminal-client.tsx` and `pod-exec.ts`)
- Container logs viewing
- No interactive TTY session for debugging

The existing terminal component uses a request/response model with Next.js Server Actions, which prevents:
- Interactive shell sessions with proper TTY
- Real-time output streaming
- Shell features (job control, vim, top, etc.)
- Tab completion and command history

**Goal**: Research and prototype the best approach to provide secure, user-friendly terminal access to preview environment pods.

## Context

### Current Architecture
- **Platform**: Kubernetes-based (K3s/Kind clusters)
- **Web App**: Next.js 15 (no native WebSocket route handlers in App Router)
- **Ingress**: ingress-nginx for routing
- **Auth**: NextAuth.js with GitHub OAuth
- **Preview Pods**: Isolated namespaces per PR with NetworkPolicy and ResourceQuota
- **Existing Terminal**: xterm.js client with Server Actions (no TTY)

### Existing Components
- `web/src/components/terminal-client.tsx` - xterm.js client
- `web/src/actions/pod-exec.ts` - Server Action for kubectl exec
- `@catalyst/kubernetes-client` - K8s API wrapper
- Preview environment detail page at `/preview-environments/[id]`

## Options Analysis

### Option 1: WebSocket-based Web Terminal (xterm.js + WebSocket)

**Overview**: Browser-based terminal using xterm.js with WebSocket for real-time PTY streaming.

**Architecture**:
```
Browser (xterm.js) <--WebSocket--> Node.js WebSocket Server <--kubectl exec--> Pod PTY
```

**Implementation Approaches**:

#### 1a. External WebSocket Server (Separate Node.js Service)
Deploy a standalone Node.js WebSocket server alongside the Next.js app.

**Pros**:
- Full WebSocket support (not limited by Next.js App Router)
- Can use libraries like `node-pty` or `kubernetes-client` WebSocket exec
- Better for handling long-lived connections
- Can scale independently of web app

**Cons**:
- Additional infrastructure component to deploy/maintain
- Need to coordinate auth between Next.js and WebSocket server
- More complex deployment (2 services instead of 1)
- Need shared session/auth mechanism

**Implementation Sketch**:
```typescript
// websocket-server/index.ts
import { WebSocketServer } from 'ws';
import { KubeConfig, Exec } from '@kubernetes/client-node';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
  // 1. Validate auth token from query/header
  const token = validateAuthToken(req);
  if (!token) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // 2. Get pod details from request
  const { namespace, pod, container } = parseRequest(req);

  // 3. Start kubectl exec with PTY
  const kc = new KubeConfig();
  kc.loadFromDefault();
  
  const exec = new Exec(kc);
  
  await exec.exec(
    namespace,
    pod,
    container,
    ['/bin/sh'],
    ws,  // stdout WebSocket
    ws,  // stderr WebSocket  
    ws,  // stdin WebSocket
    true, // tty
    ({ status }) => {
      ws.close(1000, 'Pod exec completed');
    }
  );
});

server.listen(8081);
```

**Deployment**:
```yaml
# charts/catalyst/templates/terminal-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: terminal-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: terminal-server
  template:
    metadata:
      labels:
        app: terminal-server
    spec:
      serviceAccountName: catalyst-terminal
      containers:
      - name: terminal
        image: ghcr.io/catalyst/terminal-server:latest
        ports:
        - containerPort: 8081
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: catalyst-secrets
              key: jwt-secret
---
apiVersion: v1
kind: Service
metadata:
  name: terminal-server
spec:
  selector:
    app: terminal-server
  ports:
  - port: 8081
    targetPort: 8081
```

#### 1b. Next.js API Route with Socket.io
Use Socket.io which can work with Next.js API routes (provides HTTP polling fallback).

**Pros**:
- Single deployment (stays in Next.js app)
- Socket.io provides fallback mechanisms
- Can reuse existing auth infrastructure
- Simpler deployment

**Cons**:
- Socket.io adds overhead vs raw WebSocket
- Limited by Next.js App Router constraints
- May not be optimal for long-lived connections
- Socket.io compatibility with Kubernetes client unclear

**Implementation Sketch**:
```typescript
// web/src/app/api/terminal/route.ts (wouldn't work in App Router)
// Would need to use Pages Router: pages/api/terminal.ts

import { Server } from 'socket.io';
import { KubeConfig, Exec } from '@kubernetes/client-node';

export default function handler(req, res) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', async (socket) => {
    const { namespace, pod, container, token } = socket.handshake.auth;
    
    // Validate token
    const session = await validateSession(token);
    if (!session) {
      socket.disconnect();
      return;
    }

    // Start exec stream
    const kc = new KubeConfig();
    kc.loadFromDefault();
    const exec = new Exec(kc);

    // Note: Kubernetes client exec doesn't directly support Socket.io
    // Would need adapter or use ws directly
  });

  res.end();
}
```

**Security Considerations**:
- Session token validation on WebSocket connection
- Namespace isolation (verify user can access namespace)
- Rate limiting (prevent DoS via connection spam)
- Connection timeout (prevent zombie connections)
- Audit logging (who accessed which pod when)

**User Experience**:
- Excellent - full terminal experience
- Tab completion, vim, top, etc. all work
- Real-time streaming
- Copy/paste support

**Complexity**: Medium-High
- Need WebSocket infrastructure
- Client-server protocol design
- Connection lifecycle management
- Error handling and reconnection logic

**Cost**: Low-Medium
- Additional compute for WebSocket server (if external)
- Minimal if integrated with Next.js

**Integration Points**:
```typescript
// web/src/components/terminal-websocket.tsx
"use client";

import { useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function WebSocketTerminal({ 
  namespace, 
  podName, 
  container,
  authToken 
}: {
  namespace: string;
  podName: string;
  container?: string;
  authToken: string;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal>();
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    // Connect WebSocket
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/terminal`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Send auth and connection details
      ws.send(JSON.stringify({
        type: 'init',
        namespace,
        pod: podName,
        container,
        token: authToken,
      }));

      term.writeln('Connected to pod...\r\n');
    };

    ws.onmessage = (event) => {
      // Write data from pod to terminal
      term.write(event.data);
    };

    // Send terminal input to pod
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    termRef.current = term;
    wsRef.current = ws;

    return () => {
      ws.close();
      term.dispose();
    };
  }, [namespace, podName, container, authToken]);

  return <div ref={terminalRef} className="h-full w-full" />;
}
```

### Option 2: kubectl exec via Direct API (Enhanced Server Actions)

**Overview**: Improve existing Server Action approach with streaming and better UX.

**Architecture**:
```
Browser (xterm.js) <--HTTP Long-Poll--> Server Actions <--kubectl exec--> Pod
```

**Pros**:
- Minimal changes to existing architecture
- No additional infrastructure
- Works within Next.js App Router
- Reuses existing auth/RBAC

**Cons**:
- Not true streaming (HTTP limitations)
- Higher latency
- Not ideal for interactive apps
- Limited by HTTP request timeout
- Still no true TTY support

**Implementation**: Already partially exists, could enhance with:
- Better buffering
- Streaming responses (Response stream API)
- Auto-reconnect on disconnect

**Verdict**: This is what we have now. It's adequate for simple commands but not for interactive debugging sessions.

### Option 3: SSH Jump Host (Bastion Pattern)

**Overview**: Traditional SSH bastion with SSH keys or certificates for pod access.

**Architecture**:
```
User SSH Client <--SSH--> Bastion Host <--kubectl exec--> Pod
```

**Implementation**:
- Deploy SSH bastion pod with SSH server
- User generates SSH key pair
- System provisions temporary SSH access to bastion
- Bastion uses kubectl exec to access target pods
- Users connect: `ssh -J bastion.catalyst.dev user@namespace-pod`

**Pros**:
- Industry-standard SSH protocol
- Full TTY support
- Works with any SSH client (terminal, VSCode, etc.)
- Can support SCP/SFTP for file transfer
- Familiar to developers

**Cons**:
- Complex SSH key management (generation, distribution, rotation)
- Additional infrastructure (bastion host)
- More complex to use (SSH client setup required)
- Worse UX for web users (no browser-based access)
- Certificate/key distribution challenges
- Need SSH server hardening

**Security Considerations**:
- SSH key management lifecycle
- Certificate-based auth (short-lived certs via Vault?)
- Audit logging at bastion
- Network policies (bastion can only access authorized namespaces)
- Regular key rotation

**User Experience**: Poor for web users
- Requires SSH client
- Key setup complexity
- No browser integration
- Better for CLI power users

**Complexity**: High
- SSH server deployment and hardening
- Key management infrastructure
- User provisioning system
- Audit logging

**Cost**: Medium
- Bastion infrastructure
- Key management overhead
- Operational complexity

### Option 4: Cloud Provider Solutions (Teleport, Boundary, etc.)

**Overview**: Use third-party managed solutions for secure access.

#### 4a. Teleport
Open-source/commercial solution for infrastructure access.

**Features**:
- Web-based terminal
- SSH certificate authority
- Audit logging
- RBAC integration
- Session recording

**Pros**:
- Comprehensive solution
- Web terminal + SSH support
- Excellent audit/compliance features
- Active development and support
- SSO integration

**Cons**:
- Complex setup (Teleport cluster)
- Additional cost (if using Cloud offering)
- Heavyweight for our use case
- Learning curve
- Yet another system to maintain

**Cost**: Medium-High
- Self-hosted: Infrastructure + maintenance
- Teleport Cloud: ~$15-50/user/month

#### 4b. HashiCorp Boundary
Zero-trust access to dynamic infrastructure.

**Pros**:
- No credential management (dynamic tokens)
- Works with Kubernetes
- HashiCorp ecosystem integration

**Cons**:
- Newer product (less mature)
- Complex setup
- Overkill for our needs
- Requires Boundary server infrastructure

**Cost**: Medium
- Self-hosted free, but infrastructure + ops cost

#### 4c. GCP Cloud Shell / AWS Session Manager
Cloud provider-native solutions.

**Pros**:
- Fully managed
- Deep cloud integration
- No infrastructure to maintain

**Cons**:
- Cloud provider lock-in
- Only works for that cloud
- We support self-hosted K8s clusters
- Not applicable to our architecture

**Verdict**: These are enterprise-grade solutions that are overkill for our initial needs. Consider for future if we need advanced audit/compliance features.

## Comparison Matrix

| Criteria | WebSocket Terminal (External) | WebSocket (Socket.io) | Enhanced Server Actions | SSH Bastion | Teleport/Boundary |
|----------|-------------------------------|----------------------|------------------------|-------------|------------------|
| **Security** | ✅ Good (with auth) | ✅ Good (with auth) | ✅ Good | ✅✅ Excellent | ✅✅ Excellent |
| **True TTY** | ✅✅ Yes | ✅✅ Yes | ❌ No | ✅✅ Yes | ✅✅ Yes |
| **User Experience** | ✅✅ Excellent (browser) | ✅✅ Excellent (browser) | ⚠️ Limited | ❌ Poor (SSH setup) | ✅ Good |
| **Implementation Complexity** | ⚠️ Medium-High | ⚠️ Medium | ✅ Low | ❌ High | ❌ Very High |
| **Infrastructure Cost** | ⚠️ Medium | ✅ Low | ✅ Low | ⚠️ Medium | ❌ High |
| **Operational Overhead** | ⚠️ Medium | ✅ Low | ✅ Low | ⚠️ Medium | ❌ High |
| **Latency** | ✅ Low | ✅ Low | ⚠️ Medium | ✅ Low | ⚠️ Varies |
| **Scalability** | ✅ Good | ✅ Good | ⚠️ Limited | ✅ Good | ✅✅ Excellent |
| **Audit Logging** | ⚠️ DIY | ⚠️ DIY | ✅ Existing | ✅ Built-in | ✅✅ Comprehensive |
| **Maintenance** | ⚠️ Medium | ✅ Low | ✅ Very Low | ⚠️ Medium | ❌ High |
| **Time to MVP** | ⚠️ 2-3 weeks | ✅ 1-2 weeks | ✅✅ 1 week | ❌ 3-4 weeks | ❌ 4+ weeks |
| **Browser Support** | ✅✅ Universal | ✅✅ Universal | ✅✅ Universal | ❌ No | ✅ Yes |
| **CLI Support** | ❌ No | ❌ No | ❌ No | ✅✅ Yes | ✅ Yes |
| **Session Recording** | ⚠️ DIY | ⚠️ DIY | ❌ No | ⚠️ DIY | ✅✅ Built-in |

**Legend**: ✅✅ Excellent | ✅ Good | ⚠️ Moderate/Requires Work | ❌ Poor/Not Supported

## Security Analysis

### Common Security Requirements (All Options)

1. **Authentication**: Verify user identity before granting access
2. **Authorization**: Check user has permission to access specific namespace/pod
3. **Namespace Isolation**: Prevent access to unauthorized namespaces
4. **Audit Logging**: Record who accessed which pod, when, and what they did
5. **Session Timeouts**: Auto-disconnect idle sessions
6. **Rate Limiting**: Prevent abuse

### Option-Specific Security Considerations

#### WebSocket Terminal

**Authentication Flow**:
```typescript
// 1. User requests terminal access from web UI
// 2. Server Action validates session and authorization
// 3. Server generates short-lived JWT token (5-min expiry)
// 4. Token includes: userId, namespace, podName, container, expiresAt
// 5. Client uses JWT to connect to WebSocket
// 6. WebSocket server validates JWT before establishing exec connection

interface TerminalToken {
  userId: string;
  namespace: string;
  podName: string;
  container?: string;
  iat: number;
  exp: number;
}

// Generate token (Server Action)
async function generateTerminalToken(
  userId: string,
  namespace: string,
  podName: string,
  container?: string
): Promise<string> {
  // 1. Verify user has access to this namespace
  const hasAccess = await checkNamespaceAccess(userId, namespace);
  if (!hasAccess) throw new Error('Unauthorized');

  // 2. Generate JWT
  const payload: TerminalToken = {
    userId,
    namespace,
    podName,
    container,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  };

  return jwt.sign(payload, process.env.JWT_SECRET!);
}

// Validate on WebSocket connection
function validateTerminalToken(token: string): TerminalToken {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TerminalToken;
    
    // Check expiration
    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (err) {
    throw new Error('Invalid token');
  }
}
```

**RBAC Integration**:
```typescript
// Check if user can access namespace based on team membership
async function checkNamespaceAccess(
  userId: string,
  namespace: string
): Promise<boolean> {
  // 1. Get namespace from preview environment
  const pod = await db
    .select()
    .from(pullRequestPods)
    .where(eq(pullRequestPods.namespace, namespace))
    .limit(1);

  if (!pod.length) return false;

  // 2. Get associated repository and project
  const repo = await db
    .select()
    .from(repos)
    .where(eq(repos.id, pod[0].repoId))
    .limit(1);

  if (!repo.length) return false;

  // 3. Check if user is team member
  const membership = await db
    .select()
    .from(teamsMemberships)
    .where(
      and(
        eq(teamsMemberships.userId, userId),
        eq(teamsMemberships.teamId, repo[0].teamId)
      )
    )
    .limit(1);

  return membership.length > 0;
}
```

**Kubernetes RBAC**:
```yaml
# WebSocket server needs permission to exec into pods
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: terminal-exec
rules:
- apiGroups: [""]
  resources: ["pods", "pods/exec"]
  verbs: ["get", "list", "create"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: terminal-server-exec
subjects:
- kind: ServiceAccount
  name: catalyst-terminal
  namespace: catalyst-system
roleRef:
  kind: ClusterRole
  name: terminal-exec
  apiGroup: rbac.authorization.k8s.io
```

**Audit Logging**:
```typescript
// Log terminal sessions
interface TerminalAuditLog {
  timestamp: Date;
  userId: string;
  userEmail: string;
  namespace: string;
  podName: string;
  container?: string;
  action: 'connect' | 'disconnect' | 'error';
  duration?: number;
  disconnectReason?: string;
}

async function logTerminalAccess(log: TerminalAuditLog) {
  // Store in database for audit trail
  await db.insert(terminalAuditLogs).values(log);
  
  // Also log to stdout for centralized logging
  console.log(JSON.stringify({
    type: 'terminal_access',
    ...log,
  }));
}
```

**Network Security**:
- WebSocket server should only be accessible from web app (internal cluster traffic)
- If exposed externally, use TLS (wss://)
- Rate limit connections per user
- Implement connection timeout (e.g., 1 hour max)

**Session Recording** (Optional but recommended):
```typescript
// Record terminal session for compliance/debugging
class TerminalRecorder {
  private sessionId: string;
  private buffer: Buffer[] = [];
  
  recordInput(data: string) {
    this.buffer.push(Buffer.from(JSON.stringify({
      type: 'input',
      timestamp: Date.now(),
      data,
    })));
  }
  
  recordOutput(data: string) {
    this.buffer.push(Buffer.from(JSON.stringify({
      type: 'output',
      timestamp: Date.now(),
      data,
    })));
  }
  
  async save() {
    // Save to S3/blob storage
    await uploadToStorage(
      `terminal-sessions/${this.sessionId}.json`,
      Buffer.concat(this.buffer)
    );
  }
}
```

#### SSH Bastion Security

**Key Management Challenges**:
- User key generation and distribution
- Key rotation and expiry
- Revocation on user removal
- Certificate-based auth recommended (short-lived certs)

**Certificate-Based Auth** (Recommended if using SSH):
```bash
# Use SSH certificates with short TTL instead of long-lived keys
# Vault or similar can issue certificates on-demand

# 1. User requests terminal access via web UI
# 2. System issues SSH certificate (1-hour TTL)
# 3. User downloads certificate + private key
# 4. User connects: ssh -i cert.pem user@bastion.catalyst.dev

# Certificate contains:
# - User identity
# - Allowed namespaces
# - Expiration time
# - Principals
```

## Recommended Approach

**Recommendation: WebSocket-based Web Terminal (External Server) - Option 1a**

### Rationale

1. **Best User Experience**: 
   - Browser-based, no client setup required
   - Full TTY support for interactive debugging
   - Familiar terminal interface (xterm.js)
   - Works on any device with a browser

2. **Optimal Security**:
   - Leverage existing auth infrastructure (NextAuth)
   - Short-lived JWT tokens for WebSocket connections
   - Namespace isolation via RBAC
   - Audit logging built into platform

3. **Reasonable Complexity**:
   - Well-understood technology (WebSocket, kubectl exec)
   - Clear separation of concerns (web app vs terminal server)
   - Can leverage existing K8s client libraries
   - 2-3 week implementation timeline

4. **Scalability**:
   - Can scale WebSocket server independently
   - Kubernetes provides natural load balancing
   - Horizontal scaling as needed

5. **Future-Proof**:
   - Foundation for additional features (session recording, collaboration)
   - Can integrate with audit systems
   - Extensible to support file upload/download

### Why Not Other Options?

- **Enhanced Server Actions**: No true TTY, poor for interactive use
- **Socket.io in Next.js**: Limited by App Router, less clean separation
- **SSH Bastion**: Poor UX for web users, complex key management
- **Teleport/Boundary**: Overkill, expensive, long implementation time

### Implementation Plan

**Phase 1: MVP (2-3 weeks)**
1. Deploy standalone WebSocket terminal server
2. JWT token generation and validation
3. Basic xterm.js client integration
4. Connection to pods via kubectl exec
5. Authorization via team membership

**Phase 2: Production Hardening (1-2 weeks)**
1. Audit logging to database
2. Rate limiting and abuse prevention
3. Connection lifecycle management (timeouts, cleanup)
4. Error handling and reconnection logic
5. Monitoring and alerting

**Phase 3: Enhanced Features (Future)**
1. Session recording for compliance
2. File upload/download support
3. Multiple user collaboration
4. Terminal sharing/broadcasting
5. Custom shell environments

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Preview Environment Detail Page                      │  │
│  │  /preview-environments/[id]                          │  │
│  │                                                       │  │
│  │  [Open Terminal] Button                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         │ 1. Request terminal access         │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js Server Action                                │  │
│  │  - Validate session                                   │  │
│  │  - Check namespace authorization                      │  │
│  │  - Generate short-lived JWT token                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         │ 2. Return JWT token                │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  xterm.js Terminal Component                          │  │
│  │  - Render terminal UI                                 │  │
│  │  - Connect WebSocket with JWT                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │ 3. WebSocket connection (wss://)
                          │    + JWT token
                          ▼
         ┌────────────────────────────────────────────┐
         │   WebSocket Terminal Server                 │
         │   (Node.js Service in K8s)                  │
         │                                             │
         │  ┌──────────────────────────────────────┐  │
         │  │  1. Validate JWT token                │  │
         │  │  2. Extract namespace, pod, container │  │
         │  │  3. Check token not expired           │  │
         │  └──────────────────────────────────────┘  │
         │                  │                          │
         │                  │ 4. kubectl exec          │
         │                  ▼                          │
         │  ┌──────────────────────────────────────┐  │
         │  │  Kubernetes Client (@kubernetes/     │  │
         │  │  client-node)                        │  │
         │  │  - Create exec stream with PTY       │  │
         │  │  - Pipe stdin/stdout via WebSocket   │  │
         │  └──────────────────────────────────────┘  │
         │                  │                          │
         └──────────────────┼──────────────────────────┘
                           │ 5. Exec API call
                           ▼
                ┌──────────────────────────┐
                │  Kubernetes API Server   │
                └──────────────────────────┘
                           │
                           │ 6. Exec into container
                           ▼
                ┌──────────────────────────┐
                │  Preview Pod             │
                │  (namespace: pr-X-123)   │
                │                          │
                │  ┌────────────────────┐  │
                │  │  Container Shell   │  │
                │  │  /bin/sh or /bin/  │  │
                │  │  bash              │  │
                │  └────────────────────┘  │
                └──────────────────────────┘
```

### Key Integration Points

1. **Preview Environment Detail Page** (`/preview-environments/[id]`):
   - Add "Open Terminal" button next to logs
   - Button triggers modal with terminal

2. **Server Action** (`web/src/actions/terminal-access.ts`):
   ```typescript
   export async function generateTerminalAccessToken(
     podId: string,
     container?: string
   ): Promise<{ token: string; wsUrl: string }>;
   ```

3. **Terminal Component** (`web/src/components/terminal-websocket.tsx`):
   - xterm.js client
   - WebSocket connection management
   - Error handling and reconnection

4. **WebSocket Server** (`terminal-server/`):
   - New Node.js service
   - JWT validation
   - Kubernetes exec proxy
   - Audit logging

5. **Helm Chart** (`charts/catalyst/templates/terminal-*.yaml`):
   - Deployment for terminal server
   - Service for internal routing
   - ServiceAccount with exec permissions
   - RBAC rules

## Proof of Concept

### 1. Minimal WebSocket Server

```typescript
// terminal-server/src/index.ts
import { WebSocketServer, WebSocket } from 'ws';
import { KubeConfig, Exec } from '@kubernetes/client-node';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';

interface TerminalToken {
  userId: string;
  namespace: string;
  podName: string;
  container?: string;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 8081;

const server = createServer();
const wss = new WebSocketServer({ server });

const kc = new KubeConfig();
kc.loadFromDefault();

wss.on('connection', async (ws: WebSocket, req) => {
  console.log('New WebSocket connection');

  // Extract token from query string
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    console.error('No token provided');
    ws.close(1008, 'No token provided');
    return;
  }

  // Validate JWT
  let tokenData: TerminalToken;
  try {
    tokenData = jwt.verify(token, JWT_SECRET) as TerminalToken;
    
    if (tokenData.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
  } catch (err) {
    console.error('Token validation failed:', err);
    ws.close(1008, 'Invalid or expired token');
    return;
  }

  console.log('Token validated:', {
    userId: tokenData.userId,
    namespace: tokenData.namespace,
    pod: tokenData.podName,
  });

  // Prepare exec
  const exec = new Exec(kc);
  const namespace = tokenData.namespace;
  const podName = tokenData.podName;
  const container = tokenData.container;

  // Command to run (shell)
  const command = ['/bin/sh'];

  try {
    // Create WebSocket streams for stdin/stdout/stderr
    const stdin = new WritableStream({
      write(chunk) {
        // This would be piped from the exec
      }
    });

    let execPromise: Promise<void>;

    // Start exec
    await exec.exec(
      namespace,
      podName,
      container,
      command,
      ws as any, // stdout
      ws as any, // stderr
      ws as any, // stdin (receive from WebSocket)
      true, // tty
      (status) => {
        console.log('Exec completed:', status);
        ws.close(1000, 'Exec completed');
      }
    );

    // Handle incoming WebSocket messages (stdin to pod)
    ws.on('message', (data: Buffer) => {
      // Data from browser goes to pod stdin
      // The exec function handles this through the ws stream
    });

    ws.on('close', () => {
      console.log('WebSocket closed');
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

  } catch (err) {
    console.error('Failed to start exec:', err);
    ws.send(`Error: ${err instanceof Error ? err.message : 'Failed to connect'}\r\n`);
    ws.close(1011, 'Exec failed');
  }
});

server.listen(PORT, () => {
  console.log(`Terminal WebSocket server listening on port ${PORT}`);
});
```

### 2. Client Component

```typescript
// web/src/components/terminal-websocket-client.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface Props {
  token: string;
  wsUrl: string;
  onClose?: () => void;
}

export function WebSocketTerminal({ token, wsUrl, onClose }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
      },
      rows: 30,
      cols: 100,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    // Handle window resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    // Connect WebSocket
    const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('connected');
      term.writeln('\x1b[32mConnected to pod shell\x1b[0m\r');
    };

    ws.onmessage = (event) => {
      // Write data from pod to terminal
      term.write(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
      term.writeln('\r\n\x1b[31mConnection error\x1b[0m\r');
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setStatus('closed');
      term.writeln(`\r\n\x1b[33mConnection closed: ${event.reason || 'Unknown reason'}\x1b[0m\r`);
      
      // Disable input
      term.write = () => {};
    };

    // Send terminal input to pod
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [token, wsUrl]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-gray-800 text-gray-200 text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-green-500' : 
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`} />
          <span>
            {status === 'connected' ? 'Connected' :
             status === 'connecting' ? 'Connecting...' :
             status === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 py-1 hover:bg-gray-700 rounded"
          >
            ✕ Close
          </button>
        )}
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}
```

### 3. Server Action for Token Generation

```typescript
// web/src/actions/terminal-access.ts
"use server";

import { auth } from "@/auth";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { pullRequestPods, repos, teamsMemberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface TerminalToken {
  userId: string;
  namespace: string;
  podName: string;
  container?: string;
  iat: number;
  exp: number;
}

export async function generateTerminalAccessToken(
  podId: string,
  container?: string
): Promise<{ success: true; token: string; wsUrl: string } | { success: false; error: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Get pod details
  const pod = await db
    .select()
    .from(pullRequestPods)
    .where(eq(pullRequestPods.id, podId))
    .limit(1);

  if (!pod.length) {
    return { success: false, error: "Pod not found" };
  }

  const podData = pod[0];

  // Check authorization (user must be member of the team that owns the repo)
  const repo = await db
    .select()
    .from(repos)
    .where(eq(repos.id, podData.repoId))
    .limit(1);

  if (!repo.length) {
    return { success: false, error: "Repository not found" };
  }

  const membership = await db
    .select()
    .from(teamsMemberships)
    .where(
      and(
        eq(teamsMemberships.userId, session.user.id),
        eq(teamsMemberships.teamId, repo[0].teamId)
      )
    )
    .limit(1);

  if (!membership.length) {
    return { success: false, error: "Unauthorized: Not a team member" };
  }

  // Generate JWT token (5 minute expiry)
  const now = Math.floor(Date.now() / 1000);
  const payload: TerminalToken = {
    userId: session.user.id,
    namespace: podData.namespace,
    podName: podData.podName,
    container,
    iat: now,
    exp: now + 300, // 5 minutes
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret');

  // WebSocket URL (in cluster or via ingress)
  const wsUrl = process.env.TERMINAL_WS_URL || 'ws://localhost:8081';

  return {
    success: true,
    token,
    wsUrl,
  };
}
```

### 4. Helm Deployment

```yaml
# charts/catalyst/templates/terminal-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: terminal-server
  namespace: {{ .Release.Namespace }}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: terminal-server
  template:
    metadata:
      labels:
        app: terminal-server
    spec:
      serviceAccountName: catalyst-terminal
      containers:
      - name: terminal
        image: {{ .Values.terminal.image.repository }}:{{ .Values.terminal.image.tag }}
        ports:
        - containerPort: 8081
          name: websocket
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: catalyst-secrets
              key: jwt-secret
        - name: PORT
          value: "8081"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: terminal-server
  namespace: {{ .Release.Namespace }}
spec:
  selector:
    app: terminal-server
  ports:
  - port: 8081
    targetPort: 8081
    name: websocket
  type: ClusterIP
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: catalyst-terminal
  namespace: {{ .Release.Namespace }}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: catalyst-terminal-exec
rules:
- apiGroups: [""]
  resources: ["pods", "pods/exec"]
  verbs: ["get", "list", "create"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: catalyst-terminal-exec
subjects:
- kind: ServiceAccount
  name: catalyst-terminal
  namespace: {{ .Release.Namespace }}
roleRef:
  kind: ClusterRole
  name: catalyst-terminal-exec
  apiGroup: rbac.authorization.k8s.io
```

## Next Steps

### To Implement

1. **Create terminal-server package**:
   ```bash
   mkdir -p terminal-server/src
   cd terminal-server
   npm init -y
   npm install ws @kubernetes/client-node jsonwebtoken
   ```

2. **Update web app**:
   - Add "Open Terminal" button to preview environment detail page
   - Create `terminal-access.ts` Server Action
   - Create `terminal-websocket-client.tsx` component
   - Add environment variable for WebSocket URL

3. **Add to Helm chart**:
   - Terminal server deployment
   - Service and RBAC
   - Update ingress for WebSocket routing (if external access needed)

4. **Build and deploy**:
   - Create Dockerfile for terminal server
   - Update CI/CD to build terminal-server image
   - Deploy via Helm upgrade

### Open Questions

1. **Container Selection**: Should we allow users to select which container in a pod to connect to?
   - Recommendation: Yes, display container dropdown like we do for logs

2. **Shell Choice**: Should we detect available shells (bash vs sh) or let users choose?
   - Recommendation: Try bash first, fall back to sh

3. **Session Limits**: Should we limit concurrent terminal sessions per user?
   - Recommendation: Yes, max 3 concurrent sessions per user

4. **Session Recording**: Should we record terminal sessions for audit/replay?
   - Recommendation: Not in MVP, add in Phase 3

5. **Ingress Path**: Should terminal WebSocket be exposed externally or stay internal?
   - Recommendation: Internal only in MVP (web app proxies), add external option later

## References

- [xterm.js Documentation](https://xtermjs.org/)
- [kubernetes/client-node Exec](https://github.com/kubernetes-client/javascript/blob/master/examples/typescript/exec/exec-example.ts)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [Teleport Kubernetes Access](https://goteleport.com/docs/kubernetes-access/introduction/)
- [Kubernetes Pod Exec API](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#-strong-proxy-operations-pod-v1-core-strong-)

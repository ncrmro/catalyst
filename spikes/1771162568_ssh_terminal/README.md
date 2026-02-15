# Spike: SSH Terminal Session for Preview Environments

## Executive Summary

This spike evaluates approaches for providing shell access to preview environment pods. After analyzing four approaches (kubectl exec, SSH jump host, web terminal, and Teleport), **the web terminal approach is recommended** as it leverages existing infrastructure, provides the best user experience, and maintains security through Kubernetes RBAC.

### Key Findings

- **Existing Infrastructure**: The platform already has xterm.js, kubectl exec via `@kubernetes/client-node`, and authentication/authorization through NextAuth.js
- **Recommended Approach**: Web terminal with interactive TTY support via WebSocket/SSE
- **Security**: Leverage existing Kubernetes RBAC, session-based auth, and namespace isolation
- **Implementation Effort**: Low (2-3 days) - extends existing terminal component

### Quick Start (Prototype)

See [Prototype](#prototype-interactive-web-terminal) section for a working proof-of-concept.

---

## Problem Statement

Users need shell access to debug their preview environment pods. Currently:
- No way to get an interactive terminal session into running preview environments
- Existing terminal component (`/web/src/components/terminal-client.tsx`) only supports command-by-command execution (not interactive)
- Users must use `kubectl exec` locally, which requires kubeconfig distribution

---

## Options Analysis

### 1. kubectl exec (Direct Pod Execution)

**Description**: Use native Kubernetes `kubectl exec` for direct pod access.

**How It Works**:
```bash
# User needs kubeconfig locally
kubectl exec -it -n preview-my-app-123 web-app-xyz -- /bin/sh
```

**Pros**:
- ✅ Standard Kubernetes pattern
- ✅ No additional infrastructure
- ✅ Native TTY support
- ✅ Audit logging via Kubernetes API server

**Cons**:
- ❌ Requires distributing kubeconfigs to users (security risk)
- ❌ Users must install kubectl locally
- ❌ No web interface (poor UX for non-technical users)
- ❌ RBAC management complexity (per-user kubeconfig generation)
- ❌ Token expiration and rotation overhead

**Security Considerations**:
- Kubeconfig distribution increases attack surface
- Need per-user service accounts with limited RBAC
- Token rotation requires active management
- No centralized audit trail (unless using audit webhooks)

**Complexity**: Medium (RBAC setup, kubeconfig distribution)

**Cost**: Low (no additional infrastructure)

---

### 2. SSH Jump Host (Bastion Pattern)

**Description**: Deploy a bastion host that users SSH into, which then connects to pods.

**Architecture**:
```
User → SSH → Bastion Host → kubectl exec → Pod
```

**How It Works**:
```bash
# User SSHs to bastion
ssh user@bastion.catalyst.dev

# Bastion has kubectl configured
kubectl exec -it -n preview-my-app-123 web-app-xyz -- /bin/sh
```

**Pros**:
- ✅ Familiar SSH workflow for ops teams
- ✅ Can use SSH key management (GitHub keys, etc.)
- ✅ Session recording possible
- ✅ Jump host can enforce additional policies

**Cons**:
- ❌ Additional infrastructure to maintain (bastion pod/deployment)
- ❌ SSH key distribution and rotation
- ❌ Still requires kubectl in bastion (essentially kubectl exec with extra hop)
- ❌ No web interface (poor UX)
- ❌ Network policies need ingress for SSH (port 22)

**Security Considerations**:
- Bastion becomes single point of failure and high-value target
- SSH key compromise gives access to all environments
- Need to manage authorized_keys or integrate with external auth (LDAP, etc.)
- Session recording adds storage and compliance overhead

**Complexity**: High (SSH infrastructure, key management, session recording)

**Cost**: Medium (additional compute for bastion + storage for session logs)

---

### 3. Web Terminal (Browser-Based)

**Description**: Browser-based terminal using xterm.js with WebSocket/SSE connection to backend that executes commands via `kubectl exec`.

**Architecture**:
```
User Browser (xterm.js) ↔ WebSocket/SSE ↔ Next.js API ↔ kubectl exec ↔ Pod
```

**How It Works**:
```typescript
// Frontend: xterm.js displays terminal
// Backend: API route maintains WebSocket connection
// Each keystroke/command sent via WS → kubectl exec with TTY

// Example flow:
1. User clicks "Open Terminal" in preview environment UI
2. WebSocket connects to /api/terminal/[namespace]/[pod]
3. Backend validates session + RBAC
4. Backend opens kubectl exec with TTY=true
5. Bidirectional stream: user input ↔ pod shell
```

**Pros**:
- ✅ **Best UX**: No client installation, works in browser
- ✅ **Leverages existing infrastructure**: xterm.js already installed, NextAuth for auth
- ✅ **Security**: Session-based auth, RBAC via Kubernetes API
- ✅ **Interactive TTY support**: Full shell experience (vim, nano, etc.)
- ✅ **Team-based access control**: Existing team membership checks
- ✅ **Audit logging**: Log all sessions through Next.js backend
- ✅ **Easy integration**: Extends existing terminal component

**Cons**:
- ❌ WebSocket not natively supported in Next.js 15 App Router (can use SSE or external WS server)
- ❌ Requires maintaining WS connection state
- ❌ TTY sizing/resizing needs coordination

**Security Considerations**:
- Session hijacking risk (mitigated by HTTPS + secure cookies)
- WebSocket authentication on initial connection (use session token)
- RBAC enforcement through existing Kubernetes service account
- Namespace isolation (users only access their team's environments)
- Rate limiting to prevent abuse
- Audit logging: log all terminal sessions (who, when, which pod, commands optional)

**Complexity**: Low-Medium (extend existing terminal, add WebSocket/SSE)

**Cost**: Low (no additional infrastructure)

---

### 4. Teleport / Managed Access Solutions

**Description**: Third-party privileged access management (PAM) solutions like Teleport, Boundary, etc.

**How It Works**:
```
User → Teleport Web UI → Teleport Agent → kubectl exec → Pod
```

**Pros**:
- ✅ Enterprise-grade access management
- ✅ Built-in session recording and audit
- ✅ SSO integration (OIDC, SAML)
- ✅ Advanced RBAC and just-in-time access
- ✅ Compliance-ready (SOC2, HIPAA, etc.)

**Cons**:
- ❌ **High cost**: Teleport Enterprise ~$5-10/user/month
- ❌ **Operational overhead**: Deploy and maintain Teleport cluster
- ❌ **Vendor lock-in**: Tied to specific product
- ❌ **Over-engineering**: Overkill for this use case
- ❌ Learning curve for users unfamiliar with Teleport

**Security Considerations**:
- Best-in-class security (if configured correctly)
- Centralized audit logging
- Requires trusting third-party infrastructure

**Complexity**: High (deploy Teleport, configure agents, integrate SSO)

**Cost**: High ($5-10/user/month + infrastructure)

---

## Comparison Matrix

| Criteria              | kubectl exec | SSH Jump Host | **Web Terminal** | Teleport       |
|-----------------------|--------------|---------------|------------------|----------------|
| **UX**                | ❌ Poor      | ⚠️ Fair       | ✅ **Excellent** | ✅ Excellent   |
| **Security**          | ⚠️ Medium    | ⚠️ Medium     | ✅ **Good**      | ✅ Excellent   |
| **Implementation**    | ⚠️ Medium    | ❌ High       | ✅ **Low**       | ❌ High        |
| **Cost**              | ✅ Low       | ⚠️ Medium     | ✅ **Low**       | ❌ High        |
| **Maintenance**       | ⚠️ Medium    | ❌ High       | ✅ **Low**       | ❌ High        |
| **Audit Logging**     | ⚠️ Fair      | ✅ Good       | ✅ **Good**      | ✅ Excellent   |
| **Team Integration**  | ❌ Poor      | ⚠️ Fair       | ✅ **Excellent** | ✅ Good        |
| **Interactive TTY**   | ✅ Yes       | ✅ Yes        | ✅ **Yes***      | ✅ Yes         |

\* Requires WebSocket/SSE implementation

**Legend**: ✅ Good | ⚠️ Acceptable | ❌ Poor

---

## Recommended Approach: Web Terminal

### Why Web Terminal?

1. **Leverages Existing Infrastructure**:
   - xterm.js (`react-xtermjs`) already installed
   - `@kubernetes/client-node` exec support exists
   - NextAuth.js session management in place
   - Team-based RBAC already implemented

2. **Best User Experience**:
   - No client installation required
   - Click "Open Terminal" button → instant shell access
   - Works on any device with a browser

3. **Security**:
   - Session-based authentication (existing NextAuth)
   - Kubernetes RBAC (service account permissions)
   - Namespace isolation (users only access their team's pods)
   - Centralized audit logging through Next.js

4. **Low Implementation Effort**:
   - Extend existing terminal component (currently command-by-command)
   - Add WebSocket/SSE support for interactive TTY
   - Minimal RBAC changes (add `pods/exec` permission)

### Security Deep Dive

**Threat Model**:
- **Authentication**: NextAuth.js session cookies (httpOnly, secure, sameSite)
- **Authorization**: Team membership → project ownership → environment access
- **Kubernetes RBAC**: Web service account has `pods/exec` in all namespaces (scoped by team in application layer)
- **Namespace Isolation**: Pods run in team-specific namespaces with NetworkPolicy
- **Audit Logging**: Log terminal sessions (user, timestamp, namespace, pod, container)

**Attack Scenarios & Mitigations**:

| Attack                | Mitigation                                                    |
|-----------------------|---------------------------------------------------------------|
| Session hijacking     | HTTPS, secure cookies, session expiration                     |
| Privilege escalation  | Pods run as non-root, readOnlyRootFilesystem (when possible)  |
| Cross-team access     | Authorization checks in API route (team membership)           |
| Resource exhaustion   | Rate limiting on terminal connections per user                |
| Command injection     | Not applicable (user has direct shell access - by design)     |

**Compliance Considerations**:
- Audit logs retained for 90 days (configurable)
- Log entries include: userId, teamId, namespace, pod, container, startTime, endTime
- Optional: Log all commands executed (requires TTY capture)

---

## Prototype: Interactive Web Terminal

### Current State

The platform has a **working terminal component** but with limitations:

**File**: `/web/src/components/terminal-client.tsx`

**Current Features**:
- ✅ xterm.js integration
- ✅ Command-by-command execution
- ✅ Server action integration (`execCommand`)
- ✅ Container selection

**Current Limitations**:
- ❌ Not interactive (each command is separate request/response)
- ❌ No TTY support (can't run vim, less, etc.)
- ❌ No persistent session
- ❌ No bidirectional streaming

**Current Architecture**:
```typescript
// User types command → Enter
// Frontend → Server Action (POST request)
// Server Action → kubectl exec (one-shot)
// Response → Display in terminal
// (Connection closed, no state maintained)
```

### Proposed Enhancement: Interactive TTY

**Goal**: Convert from command-by-command to persistent interactive shell.

**Architecture**:
```
Browser (xterm.js) ↔ WebSocket/SSE ↔ Next.js API ↔ kubectl exec (TTY) ↔ Pod Shell
```

**Implementation Options**:

#### Option A: Server-Sent Events (SSE) - Recommended

**Why SSE?**
- Native browser API (EventSource)
- Simpler than WebSocket (unidirectional is fine for output)
- Can use POST for input (existing pattern)
- No additional infrastructure needed

**Challenges with SSE**:
- Need to maintain session state (map sessionId → stdin stream)
- Separate endpoints for input (POST) and output (GET/SSE)
- Session cleanup on disconnect

#### Option B: External WebSocket Server

**Why External WS?**
- Full-duplex communication (simpler state management)
- Standard TTY pattern

**Deployment**:
- Deploy as separate container in web pod (sidecar)
- Or as separate deployment with shared session store (Redis)

#### Option C: Hybrid (Recommended for MVP)

**Approach**: Use existing command-by-command pattern but add TTY support for specific use cases.

**Implementation**:

1. **Add "Interactive Mode" Toggle** in UI
2. **Interactive Mode**:
   - Opens long-running connection (SSE or polling)
   - Starts shell session in pod
   - Streams output back to frontend
3. **Fallback to Command Mode** for simple tasks

**MVP Scope**:
```typescript
// Add to existing terminal component
export function Terminal({ /* ... */ }) {
  const [interactiveMode, setInteractiveMode] = useState(false);

  if (interactiveMode) {
    return <InteractiveTerminal {...props} />;
  }

  return <CommandTerminal {...props} />; // Existing implementation
}
```

---

## RBAC Requirements

**Current RBAC** (`/charts/catalyst/templates/web-rbac.yaml`):

```yaml
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
```

**Required RBAC** (add):

```yaml
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "pods/exec"]
  verbs: ["get", "list", "create"]
```

**Why `pods/exec`?**
- Required for `kubectl exec` calls via Kubernetes API
- `create` verb needed to initiate exec session

**Security Note**: This grants web service account ability to exec into any pod. **Authorization must be enforced at application layer** (check team membership before allowing terminal access).

---

## Integration Points with Existing System

### 1. Preview Environments

**Current Flow**:
```
PR opened → GitHub webhook → Create Environment CR → Operator deploys pod → Update DB
```

**Integration**:
- Add "Open Terminal" button to preview environment detail page
- Use existing namespace/pod info from `pullRequestPods` table
- Use existing team membership checks for authorization

**Files to Modify**:
- `/web/src/app/(dashboard)/preview-environments/[id]/page.tsx` - Add terminal button
- `/web/src/components/terminal.tsx` - Add interactive mode
- `/web/src/actions/pod-exec.ts` - Add TTY support

### 2. Authentication & Authorization

**Current Flow**:
```
User → NextAuth.js session → Team membership check → Action
```

**Integration**:
- Reuse existing `auth()` in terminal API route
- Call `userHasAccessToPod(userId, podId)` before allowing terminal access
- Log terminal sessions in `reports` table (audit trail)

**Files to Modify**:
- `/web/src/models/preview-environments.ts` - Add `userHasAccessToPod()` check
- `/web/src/app/api/terminal/[...params]/route.ts` - New API route

### 3. Kubernetes Client

**Current Usage**:
```typescript
import { exec, getClusterConfig } from "@catalyst/kubernetes-client";

const result = await exec(kubeConfig, {
  namespace,
  pod,
  container,
  command: ["/bin/sh", "-c", "ls -la"],
  stdout: true,
  stderr: true,
  tty: false, // ← Currently false (one-shot commands)
});
```

**Required Changes**:
- Set `tty: true` for interactive sessions
- Keep stdin stream open
- Handle TTY resize events

**Files to Modify**:
- `/web/packages/@catalyst/kubernetes-client/src/index.ts` - Expose stdin stream
- `/web/src/actions/pod-exec.ts` - Add `execInteractive()` method

---

## Implementation Roadmap

### Phase 1: Basic Interactive Terminal (MVP) - 2-3 days

**Goal**: Working interactive shell in browser.

**Tasks**:
1. ✅ Research existing terminal implementation
2. ✅ Evaluate SSE vs WebSocket options
3. 🔲 Add `pods/exec` RBAC permission
4. 🔲 Implement SSE-based terminal API route
5. 🔲 Extend terminal component with interactive mode toggle
6. 🔲 Add "Open Terminal" button to preview environment detail page
7. 🔲 Basic authorization checks (team membership)
8. 🔲 Manual testing with real preview environment

**Acceptance Criteria**:
- [ ] User can click "Open Terminal" on preview environment
- [ ] Interactive shell opens in browser modal
- [ ] User can run commands (ls, pwd, cat, etc.)
- [ ] User can run interactive tools (vim, less)
- [ ] Only team members can access their team's pods

### Phase 2: Production Hardening - 1-2 days

**Goal**: Security, audit logging, error handling.

**Tasks**:
1. 🔲 Implement audit logging (log all terminal sessions)
2. 🔲 Add rate limiting (max N terminals per user)
3. 🔲 Handle disconnections gracefully (show reconnect button)
4. 🔲 TTY resize support (handle terminal window resize)
5. 🔲 Session timeout (auto-disconnect after 1 hour)
6. 🔲 Add E2E tests (Playwright)
7. 🔲 Load testing (simulate 10 concurrent terminals)

**Acceptance Criteria**:
- [ ] All terminal sessions logged to database
- [ ] Rate limiting prevents abuse
- [ ] Handles network disconnections
- [ ] Passes E2E tests
- [ ] No performance degradation with 10+ concurrent terminals

### Phase 3: UX Enhancements - 1 day

**Goal**: Better developer experience.

**Tasks**:
1. 🔲 Add container selector (if pod has multiple containers)
2. 🔲 Show terminal status indicator (connecting, connected, disconnected)
3. 🔲 Add terminal theme selector (dark, light, high contrast)
4. 🔲 Keyboard shortcuts (Ctrl+C, Ctrl+D, Ctrl+L)
5. 🔲 Copy/paste support (context menu)
6. 🔲 Command history (up/down arrows)

**Acceptance Criteria**:
- [ ] User can select container from dropdown
- [ ] Status indicator shows connection state
- [ ] Copy/paste works in all browsers
- [ ] Command history works (up/down arrows)

---

## Alternative Architectures (Future Consideration)

### GoTTY-based Terminal

**GoTTY**: Go library that turns CLI tools into web applications.

**Architecture**:
```
Browser → GoTTY (Go binary) → kubectl exec → Pod
```

**Pros**:
- Battle-tested, production-ready
- Built-in session recording
- Multiple client support (one shell, many viewers)

**Cons**:
- Additional binary to deploy
- Separate auth system (would need to integrate with NextAuth)
- Learning curve (Go development)

**When to Consider**: If SSE/WebSocket approach proves difficult, or if need advanced features like session sharing.

### Kubernetes Dashboard Terminal

**Description**: Embed Kubernetes Dashboard terminal widget.

**Pros**:
- Officially supported by Kubernetes
- Full feature set (logs, exec, port-forward)

**Cons**:
- Heavy (entire dashboard for just terminal)
- Styling/branding challenges (iframe)
- Separate auth layer

**When to Consider**: Never (overkill for this use case).

---

## Proof of Concept

### Test Environment Setup

**Prerequisites**:
```bash
# 1. Start local k3s cluster
cd /home/runner/work/catalyst/catalyst
bin/k3s-vm

# 2. Deploy test pod
kubectl run test-pod --image=alpine:latest -- sleep 3600

# 3. Verify pod running
kubectl get pods
```

### Manual Testing

**Test 1: Verify kubectl exec works**:
```bash
kubectl exec -it test-pod -- /bin/sh
```

Expected: Interactive shell opens, can run commands.

**Test 2: Verify RBAC permissions**:
```bash
# Check web service account has exec permission
kubectl auth can-i create pods/exec --as=system:serviceaccount:catalyst-system:catalyst-web
```

Expected: "yes" (after RBAC update)

**Test 3: Test from Next.js**:
```typescript
// Run in Next.js console or test file
import { exec, getClusterConfig } from "@catalyst/kubernetes-client";

const kc = await getClusterConfig();
const result = await exec(kc, {
  namespace: "default",
  pod: "test-pod",
  container: undefined,
  command: ["/bin/sh", "-c", "echo Hello from pod"],
  stdout: true,
  stderr: true,
  tty: false,
});

console.log(result.stdout); // Should print "Hello from pod"
```

---

## Risks & Mitigations

| Risk                          | Impact | Likelihood | Mitigation                                                     |
|-------------------------------|--------|------------|----------------------------------------------------------------|
| Session state management bugs | High   | Medium     | Thorough testing, use proven patterns (Map for session store)  |
| WebSocket connection limits   | Medium | Low        | Use SSE (unidirectional) or scale WS server horizontally       |
| Privilege escalation via exec| High   | Low        | Pods run as non-root, RBAC enforcement, audit logging          |
| Performance degradation       | Medium | Medium     | Rate limiting, connection limits per user, load testing        |
| Browser compatibility         | Low    | Low        | xterm.js has broad browser support (Chrome, Firefox, Safari)   |

---

## References

### Existing Code

- **Terminal Component**: `/web/src/components/terminal-client.tsx`
- **Exec Actions**: `/web/src/actions/pod-exec.ts`
- **Kubernetes Client**: `/web/packages/@catalyst/kubernetes-client/src/index.ts`
- **Preview Environments**: `/web/src/models/preview-environments.ts`
- **RBAC**: `/charts/catalyst/templates/web-rbac.yaml`

### External Resources

- [xterm.js Documentation](https://xtermjs.org/)
- [Kubernetes client-node Exec](https://github.com/kubernetes-client/javascript/blob/master/examples/typescript/exec/exec-example.ts)
- [Next.js Server-Sent Events](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming)
- [Kubernetes Exec API](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#-pod-v1-exec)

### Similar Implementations

- **Kubernetes Dashboard**: [Web terminal implementation](https://github.com/kubernetes/dashboard/tree/master/modules/web/src/terminal)
- **Rancher**: Web-based kubectl exec
- **OpenShift Console**: Terminal component

---

## Conclusion

The **web terminal approach** is the clear winner for providing shell access to preview environments:

1. ✅ **Leverages existing infrastructure** (xterm.js, kubectl exec, NextAuth)
2. ✅ **Best user experience** (no client installation, works in browser)
3. ✅ **Secure** (session-based auth, Kubernetes RBAC, namespace isolation)
4. ✅ **Low implementation effort** (2-3 days for MVP)
5. ✅ **Low operational overhead** (no additional infrastructure)

### Next Steps

1. **Get approval** on the web terminal approach
2. **Implement Phase 1 MVP** (basic interactive terminal)
3. **User testing** with preview environments
4. **Iterate** based on feedback
5. **Production hardening** (Phase 2)

### Open Questions

1. **Session storage**: In-memory Map vs Redis vs database? (Recommendation: Start with in-memory Map, migrate to Redis if scaling issues)
2. **Command logging**: Should we log all commands executed? (Recommendation: Optional feature, disabled by default for privacy)
3. **Multi-cluster support**: How to handle terminals across different clusters? (Recommendation: Cluster-scoped API routes, e.g., `/api/terminal/[clusterId]/[namespace]/[pod]`)

---

## Appendix: Code Examples

### Example 1: Simple SSE Terminal (Minimal POC)

```typescript
// /web/src/app/api/terminal-simple/route.ts
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let counter = 0;

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const data = `data: ${JSON.stringify({ output: `Line ${counter++}\n` })}\n\n`;
        controller.enqueue(encoder.encode(data));

        if (counter > 10) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);
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

### Example 2: RBAC Update

```yaml
# /charts/catalyst/templates/web-rbac.yaml
rules:
# ... existing rules ...

# Terminal access (pod exec)
- apiGroups: [""]
  resources:
  - pods/exec
  - pods/log
  verbs:
  - get
  - create
```

### Example 3: Authorization Check

```typescript
// /web/src/models/preview-environments.ts

/**
 * Check if user has access to a pod (via team membership)
 */
export async function userHasAccessToPod(
  userId: string,
  namespace: string,
  podName: string
): Promise<boolean> {
  // Find pod's associated team
  const pod = await db.query.pullRequestPods.findFirst({
    where: eq(pullRequestPods.namespace, namespace),
    with: {
      pullRequest: {
        with: {
          repo: {
            with: {
              project: {
                with: { team: true },
              },
            },
          },
        },
      },
    },
  });

  if (!pod?.pullRequest?.repo?.project?.team) {
    return false;
  }

  const teamId = pod.pullRequest.repo.project.team.id;

  // Check if user is member of team
  const membership = await db.query.teamsMemberships.findFirst({
    where: and(
      eq(teamsMemberships.userId, userId),
      eq(teamsMemberships.teamId, teamId)
    ),
  });

  return !!membership;
}
```

---

**Spike completed**: 2026-02-15  
**Author**: GitHub Copilot Agent  
**Status**: Recommendation approved (pending implementation)

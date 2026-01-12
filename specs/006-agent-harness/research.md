# Research: Agent Harness Technology Stack

**Feature**: Agent Harness for Spec-Driven Development
**Branch**: `006-agent-harness`
**Date**: 2026-01-11

## Overview

This document consolidates research for key technology decisions required to implement the Agent Harness. Each decision addresses unknowns identified during planning.

---

## Decision 1: TUI Framework (Go-based)

**Decision**: Use **Bubble Tea** (charm.sh/bubbletea) with **Lip Gloss** for styling

**Rationale**:

- **Bubble Tea** is the de facto standard for Go TUIs with strong community adoption
- Follows Elm Architecture (model-update-view) making state management predictable
- **Lip Gloss** provides CSS-like styling for terminal UIs with excellent color/layout support
- Both are actively maintained by Charm.sh with extensive documentation
- Supports all required features: forms, tables, navigation, real-time updates
- Works cross-platform (Linux, macOS, Windows)

**Alternatives Considered**:

1. **tview** - More widget-focused but less flexible for custom layouts, older architecture
2. **termui** - Dashboard-focused, not ideal for interactive forms/navigation
3. **gocui** - Lower-level, would require building more UI primitives from scratch

**Best Practices**:

- Use Bubble Tea's `tea.Model` interface for each screen/component
- Centralize color theme in Lip Gloss styles for consistent branding
- Implement keyboard shortcuts following common conventions (Ctrl+C quit, Tab navigation)
- Use `tea.Batch` for concurrent operations (git commands + VCS API calls)

---

## Decision 2: ACP Client Library

**Decision**: Implement **custom ACP client** in Go following the ACP specification

**Rationale**:

- ACP (Agent Communication Protocol) has no mature Go library yet (spec is evolving)
- Protocol is straightforward JSON-RPC 2.0 over stdio/socket
- Custom implementation gives full control over:
  - Context injection format (spec.md, commits, PRs)
  - Progress tracking callbacks
  - Error handling and recovery
- Can contribute back to community as reusable library

**Alternatives Considered**:

1. **Use TypeScript ACP SDK** - Would require Node.js runtime, adding deployment complexity
2. **Wait for Go library** - Blocks development, uncertain timeline
3. **Direct process spawning** - Bypasses ACP benefits (standardized protocol, bidirectional communication)

**Implementation Approach**:

```go
// Core ACP types
type ACPClient struct {
    agent string          // "claude", "gemini", "codex"
    cmd   *exec.Cmd       // spawned agent process
    stdin io.WriteCloser  // JSON-RPC requests
    stdout io.ReadCloser  // JSON-RPC responses
}

// Context injection via ACP
func (c *ACPClient) InjectContext(ctx Context) error {
    req := JSONRPCRequest{
        Method: "context/inject",
        Params: map[string]interface{}{
            "spec": ctx.SpecContent,
            "commits": ctx.RecentCommits,
            "prs": ctx.OpenPRs,
        },
    }
    return c.send(req)
}
```

**References**:

- https://github.com/zed-industries/claude-code-acp
- https://github.com/zed-industries/codex-acp
- JSON-RPC 2.0 specification

---

## Decision 3: Git Worktree Management

**Decision**: Use **go-git** library with fallback to `git` CLI for complex operations

**Rationale**:

- **go-git** provides pure Go implementation for common operations (list, create, status)
- Faster than shelling out for read-heavy operations (listing worktrees, checking status)
- CLI fallback for operations go-git doesn't support well (worktree repair, complex rebases)
- Hybrid approach balances performance with reliability

**Alternatives Considered**:

1. **Pure go-git** - Incomplete support for worktree edge cases (prune, repair)
2. **Pure CLI** - Slower for read operations, requires git in PATH
3. **libgit2 bindings** - CGO dependency complicates cross-compilation

**Best Practices**:

```go
// Use go-git for reads
import "github.com/go-git/go-git/v5"

func listWorktrees(repo *git.Repository) ([]*git.Worktree, error) {
    // Fast in-process operation
    return repo.Worktrees()
}

// Use CLI for writes requiring complex git logic
func createWorktree(branch, path string) error {
    cmd := exec.Command("git", "worktree", "add", path, branch)
    return cmd.Run()
}
```

---

## Decision 4: Port Assignment Strategy

**Decision**: **Ephemeral port allocation** with `.env` persistence using `net.Listen(":0")`

**Rationale**:

- Go's `net.Listen(":0")` lets OS assign available port (no conflicts)
- Port persisted to worktree's `.env` file for stability across restarts
- Simple algorithm: try to bind port 0, write assigned port to `.env`
- No complex port range management or collision detection needed

**Implementation**:

```go
func assignPort(worktreePath string) (int, error) {
    // Let OS assign available port
    listener, err := net.Listen("tcp", ":0")
    if err != nil {
        return 0, err
    }
    defer listener.Close()

    port := listener.Addr().(*net.TCPAddr).Port

    // Persist to .env
    envPath := filepath.Join(worktreePath, ".env")
    return port, appendToEnv(envPath, "DEV_SERVER_PORT", port)
}
```

**Edge Cases**:

- Port released between assignment and dev server start → Dev server should read from `.env` and retry if taken
- `.env` file missing → Create it with minimal required vars

---

## Decision 5: Progress State Storage

**Decision**: Git-tracked **YAML files** in `specs/###-spec-name/.progress/`

**Rationale**:

- YAML is human-readable for manual inspection/editing
- Git-tracked ensures sync across machines via normal git operations
- Directory structure allows multiple progress files (one per worktree if needed)
- Catalyst platform sync is just `git push/pull` - no custom protocol

**Structure**:

```yaml
# specs/006-agent-harness/.progress/state.yaml
version: 1
spec: 006-agent-harness
lastActive: 2026-01-11T14:32:00Z
tasks:
  - id: T001
    title: "Implement spec branch creation"
    status: completed
    completedAt: 2026-01-11T10:00:00Z
  - id: T002
    title: "Add ACP client"
    status: in_progress
    startedAt: 2026-01-11T12:00:00Z
operations:
  - type: worktree_create
    branch: 006-agent-harness/add-acp
    path: /path/to/worktree
    status: completed
```

**Alternatives Considered**:

1. **JSON** - Less human-friendly, no comments
2. **TOML** - Good but YAML more common in k8s ecosystem (Catalyst context)
3. **SQLite** - Overkill, binary format prevents easy git diff/merge

---

## Decision 6: VCS Provider Integration

**Decision**: **GitHub REST API v3** with support for GitLab via abstraction layer

**Rationale**:

- GitHub API is primary target (Catalyst already uses it)
- REST API v3 is stable, well-documented, comprehensive
- GraphQL v4 overkill for simple queries (list PRs, get commits)
- Abstraction interface allows adding GitLab/Bitbucket later

**API Client**:

```go
type VCSProvider interface {
    ListPullRequests(repo, spec string) ([]PullRequest, error)
    GetRecentCommits(repo, branch string, limit int) ([]Commit, error)
    CreatePullRequest(opts PROptions) (*PullRequest, error)
    UpdatePRBaseBranch(pr int, newBase string) error
}

// GitHub implementation
type GitHubClient struct {
    token string
    client *github.Client
}
```

**Rate Limiting**:

- Respect `X-RateLimit-*` headers
- Cache PR/commit data locally (5min TTL)
- Use conditional requests (ETags) when possible

---

## Decision 7: Configuration Format

**Decision**: **YAML configuration** at `.agent-harness.yml` (repo root)

**Rationale**:

- Matches common tool conventions (.github/, .gitlab-ci.yml)
- Supports comments for documentation
- Hierarchical structure natural for nested config
- Go has excellent YAML libraries (gopkg.in/yaml.v3)

**Schema**:

```yaml
version: 1

# Branch naming patterns
branches:
  specPrefix: "specs/"
  specPattern: "{number}-{slug}"
  subPattern: "{number}-{slug}/{description}"
  mainBranch: "main"

# Worktree locations
worktrees:
  basePath: "./worktree"
  namePattern: "{number}-{slug}-{description}"

# Agent preferences
agents:
  default: "claude" # claude, gemini, codex, aider
  claudePath: "claude"
  geminiPath: "gemini"

# VCS integration
vcs:
  provider: "github" # github, gitlab
  token: "${GITHUB_TOKEN}" # env var expansion

# Catalyst platform sync
catalyst:
  enabled: true
  syncInterval: "5m"
```

---

## Decision 8: Recovery & Idempotency

**Decision**: **Operation journal** with state machine tracking

**Rationale**:

- Each high-level operation (create worktree, init PR chain) writes journal entry
- Journal tracks state: pending → in_progress → completed|failed
- On startup, scan for `in_progress` entries and prompt recovery
- Operations implemented idempotently (safe to retry)

**Journal Format** (`.progress/operations.jsonl`):

```jsonl
{"id":"op-001","type":"worktree_create","state":"completed","startedAt":"...","completedAt":"...","data":{...}}
{"id":"op-002","type":"pr_chain_init","state":"in_progress","startedAt":"...","data":{...}}
```

**Recovery Logic**:

```go
func checkPendingOperations() ([]Operation, error) {
    ops := loadOperationJournal()
    pending := filter(ops, func(o Operation) bool {
        return o.State == "in_progress"
    })

    if len(pending) > 0 {
        // Prompt user: Resume / Rollback / Inspect
    }
    return pending, nil
}
```

---

## Decision 9: TUI State Management

**Decision**: **Centralized state with screen-specific models**

**Rationale**:

- Root model holds global state (config, current spec, active worktrees)
- Each screen is a separate Bubble Tea model (Dashboard, WorktreeCreate, PRChain)
- Navigation handled via message passing between models
- Keeps screens decoupled and testable

**Pattern**:

```go
type RootModel struct {
    screen Screen
    config Config
    state  AppState
}

type Screen int
const (
    DashboardScreen Screen = iota
    WorktreeListScreen
    PRChainScreen
)

func (m RootModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case NavigateMsg:
        m.screen = msg.Target
        return m, nil
    }

    // Delegate to active screen
    return m.updateScreen(msg)
}
```

---

## Next Steps

All critical technology decisions are resolved. Proceed to **Phase 1: Design & Contracts** to define:

1. Data model (entity schemas for progress files, config, operation journal)
2. API contracts (ACP context injection protocol, VCS provider interface)
3. Quickstart guide (developer setup, first-run experience)

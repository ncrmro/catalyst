# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## README Documentation

**IMPORTANT**: When working in any directory below, always read the corresponding README.md for architecture patterns, best practices, and domain-specific guidance.

```
web/
├── __tests__/README.md           # Testing architecture (unit, integration, e2e, agents)
│   ├── e2e/README.md             # E2E testing patterns with Playwright
│   └── factories/README.md       # Test data factory patterns
├── src/
│   ├── actions/README.md         # Actions layer (boundary between React and backend)
│   ├── db/README.md              # Database layer (schemas, migrations, patterns)
│   └── models/README.md          # Models layer (complex queries, business logic)
```

## Spikes

When user requests a spike always read spikes/README.md for how to create and implement a new spike. Spikes follow the naming pattern `TIMESTAMP_SPIKE_NAME` where TIMESTAMP is Unix timestamp.

## Development Commands

### Web Application (in `/web` directory)

**Development:**

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm start             # Start production server
```

**Testing:**

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run test:components   # Component tests only
npm run test:e2e      # E2E tests with Playwright
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

**Code Quality:**

```bash
npm run lint          # Run linter
npm run typecheck     # Type checking with TypeScript
```

**Database (Drizzle ORM):**

```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations to database
npm run db:push       # Push schema changes directly (dev only)
npm run db:studio     # Open Drizzle Studio GUI
npm run seed          # Seed database with test data
npm run seed:projects # Seed specific projects (catalyst/meze)
```

**Docker/Make Commands (from `/web`):**

```bash
make up               # Start all services with mocked GitHub data (YAML-based)
make up-real          # Start all services with real GitHub integration
make down             # Stop all services
make destroy          # Clean all services and volumes
make reset            # Clean and restart all services with fresh data
make dbshell          # Connect to PostgreSQL shell
make ci               # Run comprehensive CI tests locally
make ci-docker        # Run CI tests in Docker
```

## Architecture Overview

### Core Components

**Catalyst Platform**: A development platform for faster shipping with opinionated deployments, CI/CD pipelines, and boilerplates. Integrates with Git repositories to create preview environments for pull requests.

**Web Application (`/web`)**: Next.js 15 application with:

- **Authentication**: NextAuth.js with GitHub OAuth and optional team-based access control
- **Database**: PostgreSQL with Drizzle ORM, schema defined in `src/db/schema.ts`
- **GitHub Integration**: GitHub App for webhook handling and repository interaction
- **Kubernetes Integration**: Client for managing namespaces, pods, and deployments
- **MCP Server**: Model Context Protocol server at `/api/mcp` for AI agent interactions

**Key Database Tables**:

- `users`, `accounts`, `sessions`: Authentication and user management
- `teams`, `teamsMemberships`: Team-based access control
- `repos`, `projects`, `projectEnvironments`: Repository and deployment management
- `pullRequests`, `pullRequestPods`: PR preview environments
- `clusters`, `kubeconfigs`: Kubernetes cluster management
- `githubUserTokens`, `githubAppTokens`: GitHub authentication tokens
- `reports`: Generated reports from periodic agents

### GitHub App Integration

The application supports both GitHub App and Personal Access Token (PAT) authentication:

- **GitHub App**: For organization-wide access, webhook handling, and automated workflows
- **PAT**: For simpler personal use cases
- Token encryption using AES-256-GCM for secure storage
- Automatic token refresh for GitHub App installations

### Kubernetes Integration

- Supports multiple clusters via kubeconfig management
- Creates namespaces for project environments
- Deploys pull request preview pods
- Helm chart support in `/charts` directory:
  - `nextjs`: Deploy Next.js applications with optional PostgreSQL
  - `singleton`: Cluster-wide services (cert-manager, ingress-nginx, docker-registry)

### Preview Environments

The application automatically creates isolated preview environments for pull requests in configured repositories.

**How it Works:**

1. **GitHub Webhook** (`/api/github/webhook`): Receives PR events (opened, synchronize, reopened, closed)
2. **Deployment Orchestration** (`src/models/preview-environments.ts`):
   - Creates database record in `pullRequestPods` table (idempotent)
   - Generates DNS-safe namespace (`pr-{repo}-{number}`)
   - Deploys to Kubernetes using Helm or direct K8s API
   - Waits for deployment to become ready (with timeout)
   - Posts public URL to PR as GitHub comment
3. **Status Tracking**: Database tracks deployment lifecycle (pending → deploying → running/failed)
4. **Cleanup**: PR close events trigger namespace deletion and database cleanup

**Key Files:**

- **Database Schema**: `src/db/schema.ts` - `pullRequestPods` table
- **Models Layer**: `src/models/preview-environments.ts` - Core business logic
  - `createPreviewDeployment()`: Main orchestration function
  - `deletePreviewDeploymentOrchestrated()`: Cleanup
  - `retryFailedDeployment()`: Manual retry
  - `listActivePreviewPodsWithMetrics()`: Query with resource usage
- **Actions Layer**: `src/actions/preview-environments.ts` - React Server Actions
  - `getPreviewEnvironments()`: List for UI
  - `getPreviewEnvironment()`: Details for UI
  - `getPodLogs()`: Container logs
  - `deletePreviewEnvironment()`: Manual cleanup
  - `retryDeployment()`: Manual retry
- **Webhook Handler**: `src/app/api/github/webhook/route.ts` - PR event handling
- **UI Pages**:
  - `/preview-environments`: List all active environments
  - `/preview-environments/[id]`: Environment details and logs
- **MCP Tools** (`/api/mcp`): AI agent integration
  - `list_preview_environments`
  - `get_preview_environment`
  - `get_preview_logs`
  - `delete_preview_environment`
  - `retry_preview_deployment`

**Architecture Pattern:**

The preview environments feature follows the layered architecture:

- **Webhook → Models → K8s/GitHub**: Deployment orchestration
- **Actions ← Models ← UI**: Data access for frontend
- **MCP ← Actions ← Models**: AI agent access

**Security Features:**

- NetworkPolicy isolation (ingress from nginx, egress to DNS/registry only)
- Resource quotas (500m CPU, 512Mi memory per environment)
- Namespace-level isolation
- Team-based access control

**Logging:**

Structured logging throughout deployment lifecycle using `src/lib/logging.ts`:

- deployment-initiated, pod-record-created, deployment-started
- build-job-completed/failed, k8s-deployment-created/failed
- deployment-completed, deletion-completed, retry-completed

### Local K3s Development VM

**This is the primary method for testing Kubernetes functionality locally.** The project includes a NixOS-based K3s VM for local development and integration testing.

**VM Management (from project root):**

```bash
bin/k3s-vm           # Build and start K3s VM (first time setup + start)
bin/k3s-vm stop      # Stop the running VM
bin/k3s-vm status    # Check VM status
bin/k3s-vm reset     # Destroy and rebuild VM
bin/k3s-vm ssh       # SSH into the VM
bin/k3s-vm apply     # Apply/update Kubernetes manifests without rebuilding
```

**Using kubectl:**

```bash
bin/kubectl get nodes      # Uses kubeconfig from web/.kube/config
bin/kubectl get pods -A    # List all pods across namespaces
```

**How it works:**

- Creates a NixOS VM using `nix-build` with QEMU
- K3s runs as a systemd service inside the VM
- Port forwarding: SSH (localhost:2222), K3s API (localhost:6443), Web (WEB_PORT from .env → NodePort 30000)
- Kubeconfig auto-extracted to `web/.kube/config` on start
- Integration tests use `KUBECONFIG_PRIMARY` env var (base64-encoded JSON kubeconfig)
- Kubernetes manifests defined in `.k3s-vm/manifests/base.json`
- Environment variables from `web/.env` are injected into pods

**Requirements:**

- Nix package manager installed
- KVM support (for hardware acceleration)

### Agent System (`/web/src/agents`)

Periodic background tasks that run on intervals:

- Report generation for projects
- Cleanup of stale resources
- Monitoring and alerting

### MCP (Model Context Protocol) Integration

The application exposes an MCP server that allows AI agents to:

- List and manage projects
- Deploy applications
- Access cluster information
- Interact with pull request environments

## Environment Variables

Required for production:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL for authentication
- `NEXTAUTH_SECRET`: Secret for session encryption
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: GitHub OAuth credentials

Optional:

- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`: For GitHub App functionality
- `GITHUB_WEBHOOK_SECRET`: For validating webhook payloads
- `ENCRYPTION_KEY`: For encrypting stored tokens (auto-generated if not set)

## Testing Strategy

- **Unit Tests**: Business logic and utilities
- **Integration Tests**: Database operations and API endpoints
- **Component Tests**: React component behavior
- **E2E Tests**: Full user workflows with Playwright

Tests use mocked GitHub API responses in development/test mode via `GITHUB_REPOS_MODE=mocked`.

## Mock vs Real Data Modes

The application supports two development modes:

### Mocked Mode (Default for `make up`)

- Environment: `GITHUB_REPOS_MODE=mocked` and `MOCKED=1`
- GitHub API responses come from `src/mocks/github-data.yaml`
- Database seeding creates only users (no projects)
- Projects/repos data comes from YAML mock data
- Best for: Development, testing, offline work

### Real Mode (`make up-real`)

- Environment: Normal GitHub API integration
- Database seeding creates users with projects
- All data comes from actual GitHub API calls
- Best for: Testing GitHub integration, production-like testing

## Deployment

The application can be deployed via:

1. **Docker Compose**: For local development and testing
2. **Helm Charts**: For Kubernetes deployments
3. **Direct Node.js**: Using `npm run build` and `npm start:production`

Database migrations run automatically in Docker/Helm deployments or manually via `npm run db:migrate`.

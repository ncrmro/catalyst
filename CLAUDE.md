# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
make up               # Start all services with mocked GitHub data
make up-real          # Start all services with real GitHub integration
make down             # Stop all services
make destroy          # Clean all services and volumes
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

## Deployment

The application can be deployed via:
1. **Docker Compose**: For local development and testing
2. **Helm Charts**: For Kubernetes deployments
3. **Direct Node.js**: Using `npm run build` and `npm start:production`

Database migrations run automatically in Docker/Helm deployments or manually via `npm run db:migrate`.
# Web Application Guidance

This document provides detailed guidance for developing the web application component of Catalyst.

## Agent Development Guidelines

When developing components, always create or re-export generic components from `src/components/ui`.
Avoid importing components directly from `tetrastack-react-glass-components` elsewhere in the application to ensure consistent styling and maintainability.

## Frontend Architecture & Storybook

Storybook is a first-class citizen for design iteration. We aim for structured, easily testable components.

### File Structure

```text
web/
├── .storybook/              # Global Storybook config
├── src/
│   ├── actions/             # Server Actions (Backend boundary)
│   ├── app/
│   │   ├── api/             # API Routes
│   │   ├── globals.css      # Global CSS
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── dashboard/       # Feature Route
│   │       ├── page.tsx     # Route (Server Component)
│   │       └── _components/ # 🟢 Route-Specific Components (Organisms)
│   │           ├── UserStats.tsx
│   │           └── UserStats.stories.tsx
│   │
│   ├── components/
│   │   ├── ui/              # 🟢 Atoms (Design System Primitives)
│   │   │   ├── button.tsx   # Wraps @tetrastack/react-glass
│   │   │   ├── button.stories.tsx
│   │   │   ├── input.tsx
│   │   │   └── input.stories.tsx
│   │   │
│   │   └── navigation/      # 🟢 Molecules (Shared features)
│   │       ├── MainNav.tsx
│   │       └── MainNav.stories.tsx
│   │
│   ├── lib/                 # Utilities
│   │   └── utils.ts
│   │
│   └── stories/             # Root stories (imports @tetrastack/react-glass stories)
```

## Internal Packages (`packages/`)

The web application uses a monorepo structure with several internal packages located in the `packages/` directory. These are grouped by scope:

#### `@catalyst` Scope
- **`kubernetes-client`**: Abstractions for interacting with Kubernetes clusters, managing Environment CRs, and pod orchestration.
- **`vcs-provider`**: Interfaces and implementations for version control system integrations (GitHub, etc.). This package handles repository discovery, branch management, and Pull Request interaction across different providers.

#### `@tetrastack` Scope
- **`backend`**: Shared backend utilities, common Zod schemas, and database helper functions.
- **`react-agent-chat`**: UI components and logic for the agentic chat interface.
- **`react-glass-components`**: Base "Glass" themed design system components.
- **`react-markdown`**: Specialized markdown rendering components for the chat interface.

## Database & Models

**Key Database Tables**:

- `users`, `accounts`, `sessions`: Authentication and user management
- `teams`, `teamsMemberships`: Team-based access control
- `repos`, `projects`, `projectEnvironments`: Repository and deployment management
- `pullRequests`, `pullRequestPods`: PR preview environments
- `clusters`, `kubeconfigs`: Kubernetes cluster management
- `githubUserTokens`, `githubAppTokens`: GitHub authentication tokens
- `reports`: Generated reports from periodic agents

**Project Configuration**: 
The platform uses a JSON Schema-driven configuration system to define how projects are built and deployed. JSON Schema is the source of truth (`web/src/schemas/project-config/project-config.schema.json`), and Zod schemas are generated at runtime for validation using the `asJsonSchema` utility. This configuration is stored in the `projects.project_config` JSONB column and inherited by environments.

## Integrations

### GitHub App & VCS Integration

The application supports both GitHub App and Personal Access Token (PAT) authentication via the `@catalyst/vcs-provider` package.

- **GitHub App**: Preferred for organization-wide access, webhook handling, and automated workflows.
- **PAT**: For simpler personal use cases or when App installation is not possible.
- **Mocks**: When `GITHUB_REPOS_MODE=mocked`, data is served from `src/mocks/github-data.yaml` instead of the live API.
- **Security**: Token encryption using AES-256-GCM for secure storage in the database (`github_user_tokens` table).

### Mock vs Real Data Modes

The application supports two development modes:

#### Mocked Mode (Default for `make up`)
- **Environment**: `GITHUB_REPOS_MODE=mocked` and `MOCKED=1`
- **Behavior**: GitHub API responses are served from YAML mocks. Database seeding creates only users.
- **Best for**: Offline development, UI work, and testing core logic without API rate limits.

#### Real Mode (`make up-real`)
- **Environment**: Connected to live GitHub API.
- **Behavior**: All data comes from actual GitHub calls. Database seeding creates users with real projects.
- **Best for**: Testing end-to-end GitHub integration and webhook flows.

### Kubernetes Integration

- Supports multiple clusters via kubeconfig management
- Creates namespaces for project environments
- Deploys pull request preview pods
- Helm chart support in `/charts` directory:
  - `nextjs`: Deploy Next.js applications with optional PostgreSQL
  - `singleton`: Cluster-wide services (cert-manager, ingress-nginx, docker-registry)

## Feature: Preview Environments

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

## Agent System (`/web/src/agents`)

Periodic background tasks that run on intervals:

- Report generation for projects
- Cleanup of stale resources
- Monitoring and alerting

## Deployment

The application can be deployed via multiple methods:

1. **Docker Compose**: Used for local development and integration testing.
2. **Helm Charts**: Located in `/charts`, used for production-grade Kubernetes deployments.
3. **Direct Node.js**: Using `npm run build` and `npm start:production`.

**Note**: Database migrations run automatically in Docker/Helm deployments or can be run manually via `npm run db:migrate`.

## E2E Testing with Playwright

Playwright and its browsers are installed via the Nix flake. When running tests in the Nix development environment, browsers are already available - no need to run `npx playwright install`.

### Running E2E Tests

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e -- --ui      # Run with Playwright UI
npm run test:e2e -- <file>    # Run specific test file
```

### E2E Test Guidelines

See `__tests__/e2e/README.md` for detailed patterns. Key principles:

- **No branching logic**: Never use if/else/switch/ternary in test files
- **Use fixtures**: All tests should use appropriate fixtures (`projects-fixture`, `k8s-fixture`, etc.)
- **Page Object Models**: Navigation through page objects, not direct selectors
- **No `networkidle`**: Use specific element visibility checks instead

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

## Development Workflow

**IMPORTANT**: Prefer using the high-level `make` commands in the root `AGENTS.md` for starting the full stack. The commands below are for granular control during active feature development.

### NPM Scripts

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

## Architecture Layers

- **Actions**: Server Actions (`src/actions`) handle data mutation and business logic validation.
- **Models**: Domain logic and complex queries (`src/models`) abstract the database.
- **Components**: UI components (`src/components`) using Shadcn/UI and Tailwind CSS.
- **Database**: Drizzle ORM schemas (`src/db/schema.ts`) define the data model.

See `README.md` in each directory for specific patterns.

## Commit Guidelines

Always use semantic commits. If available, include the spec, issue, or pull request number as part of the commit subject and pull request description.

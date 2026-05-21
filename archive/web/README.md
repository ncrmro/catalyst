# Catalyst Web Application

Catalyst is a Next.js 15 application providing GitHub integration, Kubernetes deployment capabilities, and AI-powered development workflows.

## Quick Start

**Prerequisites:** Node.js (v18+), npm, Docker, kubectl, yq

```bash
# 1. Setup
git clone <repository-url>
cd catalyst/web
npm install

# 2. Create .env.local (see Environment Setup below)

# 3. Start development environment
make up               # Mocked GitHub data (recommended)
# OR
make up-real          # Real GitHub integration

# 4. Open http://localhost:3000
```

## Environment Setup

Create `.env.local` in `/web` directory:

### Required Variables

```env
# Kubernetes config (use script to generate)
KUBECONFIG_PRIMARY="<base64-encoded-kubeconfig>"

# GitHub Personal Access Token (for local dev)
GITHUB_PAT=ghp_your_token_here

# Auth secret
AUTH_SECRET=your_random_secret_here

# Database (defaults work with Docker Compose)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalyst

# Development mode (enables mocked GitHub data)
GITHUB_REPOS_MODE=mocked
MOCKED=1
```

### Generate KUBECONFIG_PRIMARY

```bash
# From /web directory
./scripts/kubeconfig-to-base64.sh ~/.kube/config
```

Copy the output to your `.env.local` file.

### Generate GitHub PAT

1. Go to [GitHub Settings > Personal access tokens](https://github.com/settings/tokens)
2. Create token with scopes: `repo`, `read:org`, `user:email`, `write:packages`
3. Add to `.env.local`

### Optional Variables

```env
# Token encryption (auto-generated if not provided)
TOKEN_ENCRYPTION_KEY=your_64_character_hex_encryption_key_here

# AI providers
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Feature flags
FF_USER_CLUSTERS=1

# GitHub App (advanced - not required for local dev)
GITHUB_APP_ID=your_app_id_here
GITHUB_APP_CLIENT_ID=your_client_id_here
GITHUB_APP_CLIENT_SECRET=your_client_secret_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
```

## Development Commands

### Services

```bash
make up               # Start all services with mocked data
make up-real          # Start all services with real GitHub
make down             # Stop all services
make reset            # Clean and restart with fresh data
npm run dev           # Next.js dev server only
```

### Testing

```bash
npm test              # All tests
npm run test:unit     # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e      # E2E tests (Playwright)
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
make ci               # Full CI suite
```

### Code Quality

```bash
npm run lint          # Linting
npm run typecheck     # TypeScript checking
```

### Database

```bash
npm run db:generate   # Generate migrations
npm run db:migrate    # Apply migrations
npm run db:studio     # Open Drizzle Studio
npm run seed          # Seed test data
make dbshell          # PostgreSQL shell
```

## Development Modes

| Mode       | Command        | Data Source | Best For                           |
| ---------- | -------------- | ----------- | ---------------------------------- |
| **Mocked** | `make up`      | YAML files  | Development, testing, offline work |
| **Real**   | `make up-real` | GitHub API  | GitHub integration testing         |

**Recommendation:** Start with mocked mode for most development, switch to real mode when testing GitHub features.

## Troubleshooting

**KUBECONFIG_PRIMARY not set**

```bash
./scripts/kubeconfig-to-base64.sh ~/.kube/config
```

**GitHub API rate limit**

```bash
make down && make up  # Switch to mocked mode
```

**Database connection failed**

```bash
docker ps | grep postgres  # Check if running
make down && make up        # Restart services
```

**yq command not found**

```bash
# macOS
brew install yq
# Ubuntu/Debian
sudo apt-get install yq
```

## Architecture

- **Next.js 15** with App Router and TypeScript
- **PostgreSQL** with Drizzle ORM
- **GitHub Integration** (App tokens + PAT support)
- **Kubernetes** cluster management
- **MCP Server** at `/api/mcp` for AI agents
- **Background Agents** for reports and monitoring

## Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [GitHub Apps](https://docs.github.com/en/developers/apps)
- [Kubernetes](https://kubernetes.io/docs/)

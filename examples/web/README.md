# NextJS Starter

A comprehensive NextJS starter template with authentication, database, AI integration, and testing.

## 🚀 Features

- **NextJS 15** with App Router for modern React development
- **NextAuth.js** for authentication with GitHub OAuth and development credentials
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **AI SDK** integration with Anthropic and OpenAI
- **Playwright** for comprehensive E2E testing
- **Vitest** for fast unit and integration testing
- **Tailwind CSS** with semantic design tokens
- **TypeScript** for type safety
- **GitHub Workflows** for CI/CD

## 📁 Project Structure

```
src/
├── actions/         # Server actions for data mutations
├── agents/          # AI agent implementations  
├── app/            # NextJS App Router pages and layouts
├── components/     # Reusable React components
├── database/       # Database schema and connection
└── lib/           # Utility libraries and configurations

tests/
├── unit/          # Unit tests with mocking
├── integration/   # Integration tests with real services
└── e2e/          # End-to-end browser tests

.github/
├── workflows/     # CI/CD workflows (test.yml, release.yml)
└── instructions/  # Development instructions for Copilot
```

## 🛠️ Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd examples/web
   npm install
   ```

2. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and API keys
   ```

3. **Initialize database**:
   ```bash
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Visit http://localhost:3000** and login with:
   - Password: `password` (regular user)
   - Password: `admin` (admin user)

## 🧪 Testing

The starter includes comprehensive testing at all levels:

```bash
npm test             # Run all tests
npm run test:unit    # Unit tests only (fast, mocked)
npm run test:integration  # Integration tests with real services
npm run test:e2e     # E2E tests with Playwright (full browser)
npm run test:watch   # Watch mode for development
```

### Test Organization

- **Unit Tests** (`tests/unit/`): Fast tests with mocking for individual functions/classes
- **Integration Tests** (`tests/integration/`): Tests with real database/services but no browser
- **E2E Tests** (`tests/e2e/`): Full browser tests with Playwright

## 🗄️ Database Operations

```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to database
npm run db:studio    # Open Drizzle Studio for database inspection
```

### Making Schema Changes

1. Edit `src/database/schema.ts`
2. Run `npm run db:generate` to create migration files
3. Run `npm run db:migrate` to apply changes

## 🎨 Styling

Uses Tailwind CSS with semantic design tokens defined in `src/app/globals.css`:

- `bg-surface` / `text-on-surface` for cards and main content
- `bg-primary` / `text-on-primary` for primary actions
- `bg-primary-container` / `text-on-primary-container` for secondary actions
- `text-on-surface-variant` for secondary text
- `border-outline` for borders and dividers

## 🤖 AI Integration

The `SimpleAgent` class provides basic AI capabilities:

```typescript
import { SimpleAgent } from '@/agents';

const agent = new SimpleAgent('anthropic'); // or 'openai'

// Generate text
const response = await agent.generateResponse('Hello, world!');

// Summarize content  
const summary = await agent.summarizeText(longText);

// Answer questions
const answer = await agent.answerQuestion('What is NextJS?', context);
```

## 🔧 Configuration

### Authentication

- **GitHub OAuth**: Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `.env`
- **Development**: Use built-in credential provider with `password` or `admin`

### AI Providers

- **Anthropic**: Set `ANTHROPIC_API_KEY` in `.env`
- **OpenAI**: Set `OPENAI_API_KEY` in `.env`

### Database

- **PostgreSQL**: Set `DATABASE_URL` in `.env`
- Default: `postgresql://postgres:postgres@localhost:5432/nextjs_starter`

## 🚀 Deployment

This starter is ready for deployment to various platforms:

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Railway
```bash
# Uses Docker for deployment
railway deploy
```

### Docker
```bash
npm run build
docker build -t nextjs-starter .
docker run -p 3000:3000 nextjs-starter
```

## 🔄 GitHub Workflows

The starter includes production-ready GitHub workflows:

- **`test.yml`**: Runs unit, integration, and E2E tests on every PR
- **`release.yml`**: Builds and deploys on main branch pushes
- **`copilot-setup-steps.yml`**: Sets up environment for GitHub Copilot

## 📚 Development Guidelines

- **Prefer NextJS server components** when possible
- **Use server actions over API routes** for data mutations
- **Follow the semantic color system** defined in globals.css
- **Add comprehensive tests** for new features at appropriate levels
- **Use TypeScript strictly** - avoid `any` types when possible

## 🤝 Contributing

1. Create feature branch from main
2. Make changes with appropriate tests
3. Run `npm test` to ensure all tests pass
4. Submit pull request with clear description

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using NextJS 15, TypeScript, and modern web technologies.**
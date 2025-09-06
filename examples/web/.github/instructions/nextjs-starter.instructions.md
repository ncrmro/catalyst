# NextJS Starter Development Instructions

## Architecture

- NextJS 15 with App Router
- NextAuth.js for authentication with GitHub OAuth and development credentials
- Drizzle ORM with PostgreSQL
- AI SDK for Anthropic and OpenAI integration
- Playwright for E2E testing
- Vitest for unit/integration testing
- Tailwind CSS for styling

## Development Setup

Start the development server:

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

The development server supports login with:
- Password: `password` (creates regular user)
- Password: `admin` (creates admin user)

For GitHub OAuth, configure your GitHub App credentials in `.env`.

## Database & Migrations

When making schema changes:

1. Edit `src/database/schema.ts`
2. Generate migrations: `npm run db:generate`
3. Apply migrations: `npm run db:migrate`

## Testing

Run comprehensive tests:

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e      # E2E tests only
```

## Development Guidelines

- Use NextJS server components when possible
- Prefer server actions over API routes
- Follow the semantic theme system in `globals.css`
- Add comprehensive tests for new features

## Project Structure

```
src/
├── actions/         # Server actions
├── agents/          # AI agent implementations
├── app/            # NextJS app router pages
├── components/     # React components
├── database/       # Database schema and connection
└── lib/           # Utility libraries

tests/
├── unit/          # Unit tests with mocking
├── integration/   # Integration tests
└── e2e/          # End-to-end tests
```
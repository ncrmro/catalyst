# NextJS Starter

A comprehensive NextJS starter template with authentication, database, AI integration, and testing.

## Features

- **NextJS 15** with App Router for modern React development
- **NextAuth.js** for authentication with GitHub OAuth and development credentials
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **AI SDK** integration with Anthropic and OpenAI
- **Playwright** for comprehensive E2E testing
- **Vitest** for fast unit and integration testing
- **Tailwind CSS** with semantic design tokens
- **TypeScript** for type safety

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd nextjs-starter
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

## Development

### Database Operations

```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

### Testing

```bash
npm test             # Run all tests
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e     # E2E tests with Playwright
npm run test:watch   # Watch mode
```

### Building

```bash
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

## Project Structure

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
```

## Configuration

### Authentication

- **GitHub OAuth**: Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `.env`
- **Development**: Use built-in credential provider with `password` or `admin`

### AI Integration

- **Anthropic**: Set `ANTHROPIC_API_KEY` in `.env`
- **OpenAI**: Set `OPENAI_API_KEY` in `.env`

### Database

- **PostgreSQL**: Set `DATABASE_URL` in `.env`
- Default: `postgresql://postgres:postgres@localhost:5432/nextjs_starter`

## Deployment

This starter is ready for deployment to:

- **Vercel**: Zero-config deployment with `vercel`
- **Railway**: Container deployment with Docker
- **Heroku**: Buildpack deployment
- **Any Node.js hosting**: Uses Next.js standalone output

## Contributing

1. Create feature branch
2. Make changes with tests
3. Run `npm test` to ensure all tests pass
4. Submit pull request

## License

MIT License - see LICENSE file for details.
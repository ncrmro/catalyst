# Catalyst - GitHub App Integration

This is a [Next.js](https://nextjs.org) project that provides a complete GitHub App integration solution with endpoints for registration, webhook handling, and OAuth callbacks.

## Features

- **GitHub OAuth Authentication**: Sign in with your GitHub account using Auth.js
- **GitHub App Registration**: Complete workflow for installing GitHub Apps
- **Webhook Processing**: Handle GitHub events including installations, pushes, and pull requests
- **OAuth Callbacks**: Process GitHub App installation callbacks
- **Integration Tests**: Comprehensive test suite for all endpoints
- **Documentation**: Complete setup guide for GitHub App configuration

## GitHub App Endpoints

The application provides three main API endpoints:

### `/api/github/register`
- **GET**: Initiates GitHub App installation process
- **POST**: Handles installation setup actions
- Returns installation URLs and processes installation data

### `/api/github/webhook`
- **POST**: Receives and processes GitHub webhook events
- Supports installation, push, pull request, and repository events
- Includes signature verification for security

### `/api/github/callback`
- **GET**: Handles OAuth callbacks after GitHub App installation
- Processes installation confirmations and updates
- Supports different setup actions (install, request, update)

## Getting Started

First, install dependencies and run the development server:

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the main page, or visit [http://localhost:3000/github](http://localhost:3000/github) to access the GitHub App setup interface.

## Environment Configuration

### GitHub OAuth Authentication

For GitHub OAuth sign-in functionality, create a `.env.local` file in the web directory:

```env
# Auth.js Configuration
AUTH_SECRET=your_random_secret_here  # Generate with: openssl rand -base64 33

# GitHub App Configuration (used for both GitHub App and Auth.js OAuth)
GITHUB_APP_ID=your_app_id_here
GITHUB_APP_CLIENT_ID=your_client_id_here
GITHUB_APP_CLIENT_SECRET=your_client_secret_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your_private_key_here
-----END RSA PRIVATE KEY-----"
```

**Note**: The GitHub OAuth app (for authentication) and GitHub App (for repository integration) are separate applications with different purposes.

## Testing

Run the integration test suite:

```bash
cd web
npm test
```

### E2E Testing

Run end-to-end tests with Playwright:

```bash
npm run test:e2e
```

#### Smoke Tests for Helm Deployments

A simplified smoke test suite is available for testing deployed applications:

```bash
npm run test:e2e -- __tests__/e2e/smoke.spec.ts
```

These smoke tests can be run against deployed services using the development image that contains all necessary test dependencies.

The test suite includes comprehensive coverage of:
- GitHub App registration endpoints
- Webhook event processing
- OAuth callback handling
- Error scenarios and edge cases

## Documentation

Complete setup documentation is available at `web/docs/github-app-setup.md`, which includes:
- Step-by-step GitHub App creation
- Environment configuration
- API endpoint documentation
- Security considerations
- Troubleshooting guide

## CI/CD

The project includes GitHub Actions workflows:
- **test-web**: Linting, building, and testing
- **integration**: Comprehensive endpoint testing

## Technology Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Jest**: Testing framework
- **Tailwind CSS**: Styling
- **Octokit**: GitHub API integration

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [GitHub Webhooks Guide](https://docs.github.com/en/developers/webhooks-and-events/webhooks)


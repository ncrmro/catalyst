# Forgejo VCS Provider Implementation

This document describes the Forgejo VCS provider implementation in Catalyst, which enables multi-provider version control integration alongside GitHub.

## Overview

Forgejo is a self-hosted Git forge that maintains API compatibility with Gitea. This implementation leverages that compatibility to provide full VCS operations including:

- Repository management (list, get, file operations)
- Pull request operations (list, create, review)
- Issue tracking
- Webhook integration for PR preview environments
- OAuth2 authentication flow

## Architecture

### Provider Abstraction Layer

The implementation follows Catalyst's provider-agnostic VCS abstraction pattern:

```
@catalyst/vcs-provider/
├── types.ts                    # VCSProvider interface, common types
├── vcs-provider.ts             # VCSProviderSingleton with token management
├── provider-registry.ts        # Provider discovery and registration
└── providers/
    ├── github/                 # GitHub implementation
    │   └── provider.ts
    └── forgejo/                # Forgejo implementation
        ├── provider.ts         # ForejoProvider class
        └── index.ts            # Exports
```

### Key Components

1. **ForejoProvider** (`web/packages/@catalyst/vcs-provider/src/providers/forgejo/provider.ts`)
   - Implements `VCSProvider` interface
   - Uses Gitea-compatible REST API (`/api/v1/...`)
   - Handles authentication, repos, PRs, issues, branches, files
   - Webhook signature verification (HMAC-SHA256)

2. **Token Management** (`web/src/lib/forgejo-provider.ts`)
   - OAuth2 flow helpers (authorization, token exchange, refresh)
   - Encrypted token storage in PostgreSQL
   - Automatic token refresh before expiration

3. **Database Schema**
   - `repos` table: `provider` + `provider_id` columns for multi-provider support
   - `forgejo_user_tokens` table: Encrypted OAuth tokens per user
   - `pullRequests` table: Already has `provider` column

4. **Webhook Handler** (`web/src/app/api/forgejo/webhook/route.ts`)
   - Verifies HMAC-SHA256 webhook signatures
   - Handles push and pull_request events
   - Integrates with preview environment orchestration

## Configuration

### Environment Variables

```bash
# Required
FORGEJO_BASE_URL=https://forgejo.example.com
FORGEJO_WEBHOOK_SECRET=your-webhook-secret-here

# Optional (for OAuth)
FORGEJO_CLIENT_ID=your-oauth-client-id
FORGEJO_CLIENT_SECRET=your-oauth-client-secret

# Optional (for PAT fallback in development)
FORGEJO_PAT=your-personal-access-token
FORGEJO_ALLOW_PAT_FALLBACK=true  # Allow PAT in production
```

### Forgejo OAuth Application Setup

1. Navigate to your Forgejo instance settings → Applications → OAuth2 Applications
2. Click "Create a new OAuth2 Application"
3. Fill in the details:
   - **Application Name**: Catalyst
   - **Redirect URI**: `https://your-catalyst-instance.com/api/auth/callback/forgejo`
   - **Scopes**: `read:user`, `read:org`, `repo`
4. Save the Client ID and Client Secret to your environment variables

### Webhook Configuration

1. Go to your Forgejo repository → Settings → Webhooks
2. Add a new webhook:
   - **Payload URL**: `https://your-catalyst-instance.com/api/forgejo/webhook`
   - **Content Type**: `application/json`
   - **Secret**: Use the same value as `FORGEJO_WEBHOOK_SECRET`
   - **Events**: Select "Push" and "Pull Request"
   - **Active**: Check this box
3. Click "Add Webhook"

## Database Migrations

Run the following migrations to add Forgejo support:

```bash
cd web
npm run db:migrate
```

This will:
1. Add `provider` and `provider_id` columns to `repos` table
2. Make `github_id` nullable for backward compatibility
3. Create `forgejo_user_tokens` table with encrypted storage
4. Backfill `provider_id` from existing `github_id` values

## Usage

### Registering Repositories

Currently, repositories must be added to the database manually or via an admin interface (UI implementation pending). Example:

```typescript
import { db } from "@/db";
import { repos } from "@/db/schema";

await db.insert(repos).values({
  provider: "forgejo",
  providerId: "123", // Forgejo repo ID
  name: "my-repo",
  fullName: "owner/my-repo",
  url: "https://forgejo.example.com/owner/my-repo",
  ownerLogin: "owner",
  ownerType: "Organization",
  teamId: "team-uuid",
  isPrivate: false,
});
```

### Using the VCS Singleton

```typescript
import { vcs } from "@/lib/vcs";

// Get a scoped provider instance for a user
const forejoVcs = vcs.getScoped(userId, "forgejo");

// List repositories
const repos = await forejoVcs.repos.listUser();

// Get a pull request
const pr = await forejoVcs.pullRequests.get(owner, repo, prNumber);

// Create a comment
await forejoVcs.pullRequests.createComment(owner, repo, prNumber, "LGTM!");
```

### Preview Environments

When a pull request is opened or updated in Forgejo:

1. Webhook is received at `/api/forgejo/webhook`
2. Signature is verified using HMAC-SHA256
3. PR is upserted in the `pullRequests` table
4. Preview deployment is triggered via `createPreviewDeployment()`
5. Public URL is (optionally) posted as a comment on the PR

When the PR is closed:
- All associated pods are deleted
- Database records are cleaned up

## Testing

### Manual Testing

1. Set up a Forgejo instance (or use an existing one)
2. Configure environment variables
3. Set up OAuth application and webhook
4. Create a test repository
5. Open a pull request and verify webhook handling

### Unit Tests

```bash
cd web
npm test -- forgejo
```

(Note: Unit tests not yet implemented - see Phase 6 in implementation plan)

## Troubleshooting

### Webhook Signature Verification Fails

- Ensure `FORGEJO_WEBHOOK_SECRET` matches the secret in Forgejo webhook settings
- Check webhook payload is being sent as `application/json`
- Verify the signature header is `x-forgejo-signature` or `x-gitea-signature`

### Token Refresh Fails

- Check that `FORGEJO_CLIENT_ID` and `FORGEJO_CLIENT_SECRET` are correct
- Verify OAuth application in Forgejo allows refresh tokens
- Check token expiration times in `forgejo_user_tokens` table

### Preview Environments Not Creating

- Check that the repository exists in the `repos` table with `provider='forgejo'`
- Verify `provider_id` matches the Forgejo repository ID
- Check Kubernetes cluster access and image registry configuration

## Implementation Status

### ✅ Completed (Phases 1-4)

- [x] ForejoProvider class with full VCSProvider interface
- [x] Token management (storage, retrieval, OAuth2 flows)
- [x] Database schema updates for multi-provider support
- [x] Webhook handler with signature verification
- [x] Preview environment integration

### 🚧 Pending (Phases 5-7)

- [ ] UI for provider selection during repo connection
- [ ] Provider icon/badge display in repo listings
- [ ] Forgejo instance URL configuration UI
- [ ] Unit tests for ForejoProvider
- [ ] Integration tests for webhook handler
- [ ] E2E tests for preview environments

## API Compatibility

This implementation is compatible with:

- Forgejo 1.18+
- Gitea 1.18+ (Forgejo fork maintains API compatibility)

The Gitea API is documented at: https://docs.gitea.com/api/1.20/

## Security Considerations

1. **Token Encryption**: All OAuth tokens are encrypted using AES-256-GCM before storage
2. **Webhook Signatures**: HMAC-SHA256 signature verification prevents unauthorized webhook calls
3. **HTTPS Required**: Self-hosted Forgejo instances should use HTTPS
4. **Scoped Permissions**: OAuth applications should request minimal necessary scopes

## Contributing

When adding new VCS providers:

1. Follow the `VCSProvider` interface pattern
2. Implement token management following the Forgejo pattern
3. Create provider-specific token table if needed
4. Add webhook handler with signature verification
5. Update database queries to be provider-aware
6. Add comprehensive tests
7. Document configuration and setup

## References

- [Forgejo Documentation](https://forgejo.org/docs/latest/)
- [Gitea API Documentation](https://docs.gitea.com/api/1.20/)
- [Catalyst VCS Provider Architecture](../packages/@catalyst/vcs-provider/README.md)
- [Preview Environments Documentation](../docs/preview-environments.md)

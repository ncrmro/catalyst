# Implementation Plan: GitHub App Authentication

**Spec**: `003-vcs-providers`
**Branch**: `003-vcs-providers`
**Created**: 2025-01-03

## Summary

Implement GitHub App authentication using Auth.js with encrypted token storage, automatic token refresh, and a separate installation callback flow for linking GitHub App installations to users.

## Technical Context

**Language/Framework**: TypeScript, Next.js 15
**Primary Dependencies**: Auth.js (NextAuth.js), Drizzle ORM, @octokit/rest
**Storage**: PostgreSQL (encrypted tokens in `github_user_tokens` table)
**Testing**: Vitest (unit), manual testing for OAuth flows

## Architecture Overview

### Two Authentication Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW 1: User Sign-In                         │
├─────────────────────────────────────────────────────────────────┤
│  User clicks "Sign in with GitHub"                              │
│       ↓                                                         │
│  Auth.js redirects to GitHub OAuth                              │
│       ↓                                                         │
│  User authorizes app                                            │
│       ↓                                                         │
│  GitHub redirects to /api/auth/callback/github                  │
│       ↓                                                         │
│  Auth.js handles callback, stores tokens in github_user_tokens  │
│       ↓                                                         │
│  User session created, redirected to dashboard                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 FLOW 2: GitHub App Installation                 │
├─────────────────────────────────────────────────────────────────┤
│  User clicks "Install GitHub App" (banner or account page)      │
│       ↓                                                         │
│  User redirected to GitHub App installation page                │
│  (NEXT_PUBLIC_GITHUB_APP_URL env var)                           │
│       ↓                                                         │
│  User selects repos and installs                                │
│       ↓                                                         │
│  GitHub redirects to /api/github/callback?installation_id=xxx   │
│       ↓                                                         │
│  Custom handler saves installation_id to github_user_tokens     │
│       ↓                                                         │
│  User redirected to /account?highlight=github                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Token Storage Schema

```typescript
// web/src/db/schema.ts
export const githubUserTokens = pgTable("github_user_tokens", {
  userId: text("user_id")
    .references(() => users.id)
    .notNull()
    .primaryKey(),
  installationId: text("installation_id"),
  accessTokenEncrypted: text("access_token_encrypted"),
  accessTokenIv: text("access_token_iv"),
  accessTokenAuthTag: text("access_token_auth_tag"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  refreshTokenIv: text("refresh_token_iv"),
  refreshTokenAuthTag: text("refresh_token_auth_tag"),
  tokenExpiresAt: timestamp("token_expires_at"),
  tokenScope: text("token_scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Token Lifecycle

| Token Type      | Lifetime  | Storage          | Refresh Strategy                 |
| --------------- | --------- | ---------------- | -------------------------------- |
| Access Token    | 8 hours   | Encrypted in DB  | Auto-refresh 5 min before expiry |
| Refresh Token   | 6 months  | Encrypted in DB  | Replace on each refresh          |
| Installation ID | Permanent | Plain text in DB | Set once during install          |

## API/Actions

### Auth.js Configuration

```typescript
// web/src/lib/auth.config.ts
GitHub({
  clientId: GITHUB_CONFIG.APP_CLIENT_ID,
  clientSecret: GITHUB_CONFIG.APP_CLIENT_SECRET,
  authorization: {
    params: {
      scope: "read:user user:email read:org repo",
    },
  },
});
```

### Installation Callback Handler

```typescript
// web/src/app/api/github/callback/route.ts
export async function GET(request: NextRequest) {
  const installationId = searchParams.get("installation_id");
  const session = await auth();

  await db
    .update(githubUserTokens)
    .set({ installationId, updatedAt: new Date() })
    .where(eq(githubUserTokens.userId, session.user.id));

  return NextResponse.redirect(
    new URL("/account?highlight=github", request.url),
  );
}
```

### Token Service Functions

```typescript
// @catalyst/vcs-provider
export async function storeGitHubTokens(
  userId: string,
  tokens: GitHubTokens,
): Promise<void>;
export async function getGitHubTokens(
  userId: string,
): Promise<GitHubTokens | null>;
export async function refreshTokenIfNeeded(
  userId: string,
): Promise<GitHubTokens | null>;
export async function invalidateTokens(userId: string): Promise<void>;
```

## Security

### Token Encryption

- Algorithm: AES-256-GCM (authenticated encryption)
- Key: 64-character hex string from `TOKEN_ENCRYPTION_KEY` env var
- IV: Random 16 bytes per encryption
- Auth Tag: Stored for integrity verification

```typescript
// Encryption pattern
const cipher = createCipheriv("aes-256-gcm", key, iv);
const encrypted = cipher.update(token) + cipher.final();
const authTag = cipher.getAuthTag();
// Store: encrypted, iv, authTag
```

### Cookie Configuration

```typescript
// Development only - prevents cookie conflicts with other localhost apps
const devCookies = {
  sessionToken: { name: "catalyst.session-token" },
  callbackUrl: { name: "catalyst.callback-url" },
  csrfToken: { name: "catalyst.csrf-token" },
  pkceCodeVerifier: { name: "catalyst.pkce.code_verifier" },
  state: { name: "catalyst.state" },
  nonce: { name: "catalyst.nonce" },
};

// Production uses Auth.js defaults (proper sameSite/secure settings)
cookies: process.env.NODE_ENV === "development" ? devCookies : undefined,
```

## Environment Variables

```bash
# GitHub App OAuth (for Auth.js sign-in)
GITHUB_APP_CLIENT_ID=Iv1.xxxxx
GITHUB_APP_CLIENT_SECRET=xxxxx

# GitHub App (for API operations)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# GitHub App Installation URL (for install buttons)
NEXT_PUBLIC_GITHUB_APP_URL=https://github.com/apps/your-app-name/installations/new

# Token encryption
TOKEN_ENCRYPTION_KEY=<64-char-hex-string>

# Webhook validation
GITHUB_WEBHOOK_SECRET=xxxxx
```

## GitHub App Configuration

In your GitHub App settings, configure **both** callback URLs (one per line):

```
https://your-domain.com/api/auth/callback/github
https://your-domain.com/api/github/callback
```

| Callback URL                | Purpose                          |
| --------------------------- | -------------------------------- |
| `/api/auth/callback/github` | Auth.js OAuth sign-in flow       |
| `/api/github/callback`      | GitHub App installation callback |

Both are required - the first handles user authentication, the second handles app installation.

## File Structure

```
web/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── auth/callback/github/  # Auth.js handles this
│   │       └── github/
│   │           └── callback/
│   │               └── route.ts       # Installation callback
│   ├── lib/
│   │   └── auth.config.ts             # Auth.js + cookie config
│   └── db/
│       └── schema.ts                  # github_user_tokens table
│
├── packages/@catalyst/vcs-provider/
│   └── src/
│       ├── token-crypto.ts            # AES-256-GCM encryption
│       └── providers/github/
│           ├── auth.ts                # Token exchange
│           ├── token-service.ts       # Store/retrieve tokens
│           └── token-refresh.ts       # Auto-refresh logic
```

## Risks & Mitigations

| Risk                                  | Impact | Mitigation                                       |
| ------------------------------------- | ------ | ------------------------------------------------ |
| Token encryption key compromise       | High   | Store in secrets manager, rotate periodically    |
| Refresh token expiry (6 months)       | Medium | Monitor token ages, prompt re-auth before expiry |
| PKCE cookie issues in production      | High   | Use Auth.js cookie defaults in production        |
| Installation callback without session | Medium | Redirect to login if no session                  |

## Testing Strategy

### Unit Tests (Vitest)

- Token encryption/decryption
- Token refresh logic (with mocked GitHub API)
- Token storage/retrieval (with mocked Drizzle)

### Manual Testing

OAuth flows require real browser interaction:

1. Fresh sign-in flow
2. Token refresh after 8 hours
3. App installation flow
4. Re-installation after revocation

## Related Documentation

- [research.github-app.md](./research.github-app.md) - Comparison of OAuth App vs GitHub App
- [@catalyst/vcs-provider README](../../web/packages/@catalyst/vcs-provider/README.md) - Token service API

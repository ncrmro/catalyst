# Research: GitHub App Authentication

**Spec**: `003-vcs-providers`
**Date**: 2025-01-03

## Context

This research documents the comparison between GitHub OAuth Apps and GitHub Apps for user authentication, focusing on why GitHub Apps were chosen for Catalyst and the key integration patterns with Auth.js (NextAuth.js).

## Options Evaluated

### Option 1: GitHub OAuth App

**URL**: https://docs.github.com/en/apps/oauth-apps

**Pros**:

- Simple setup - just client ID and secret
- Well-documented, widely used pattern
- Auth.js has built-in support
- Tokens don't expire (unless revoked)

**Cons**:

- Tokens never expire - security risk if compromised
- Lower API rate limits (5,000 requests/hour per user)
- Coarse-grained permissions - all-or-nothing scopes
- No installation concept - can't track which orgs/repos granted access
- No webhook support built-in

**Example**:

```typescript
// Auth.js OAuth App configuration
GitHub({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
});
```

---

### Option 2: GitHub App (User-to-Server Tokens)

**URL**: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user

**Pros**:

- Short-lived tokens (8 hours) with refresh tokens (6 months)
- Higher API rate limits (5,000 requests/hour per user + installation limits)
- Fine-grained permissions per resource type
- Installation tracking - know exactly which repos/orgs are accessible
- Built-in webhook support
- Can act on behalf of the app OR on behalf of a user

**Cons**:

- More complex setup - requires database for token storage
- Token refresh logic required
- Two callback URLs needed (OAuth sign-in vs app installation)

**Example**:

```typescript
// Auth.js with GitHub App credentials
GitHub({
  clientId: process.env.GITHUB_APP_CLIENT_ID, // From GitHub App settings
  clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
  authorization: {
    params: {
      scope: "read:user user:email read:org repo",
    },
  },
});
```

---

## Comparison Matrix

| Criteria           | OAuth App         | GitHub App            |
| ------------------ | ----------------- | --------------------- |
| Token lifetime     | Never expires     | 8 hours + 6mo refresh |
| API rate limit     | 5,000/hr per user | 5,000/hr + install    |
| Permission model   | Coarse scopes     | Fine-grained          |
| Installation track | No                | Yes                   |
| Webhook support    | Separate setup    | Built-in              |
| Database required  | No                | Yes (tokens)          |
| Refresh logic      | None              | Required              |

## Recommendation

**Chosen**: GitHub App (Option 2)

**Rationale**:

1. **Security**: Short-lived tokens limit damage from token compromise
2. **Rate limits**: Higher limits support more API-intensive operations
3. **Visibility**: Installation tracking shows exactly what repos are accessible
4. **Webhooks**: Native webhook support simplifies PR preview environment automation
5. **Future-proof**: GitHub is investing more in Apps than OAuth Apps

The added complexity of token refresh and database storage is justified by the security and functionality benefits.

## Key Implementation Decisions

### 1. Auth.js Integration

GitHub App OAuth credentials work directly with Auth.js GitHub provider. No custom provider needed - just use the App's client ID and secret instead of creating a separate OAuth App.

### 2. Two Callback URLs

The system requires two distinct callback URLs:

| Callback URL                | Purpose                 | Handler          |
| --------------------------- | ----------------------- | ---------------- |
| `/api/auth/callback/github` | OAuth sign-in (Auth.js) | Auth.js built-in |
| `/api/github/callback`      | GitHub App installation | Custom route     |

### 3. Token Storage

Tokens must be stored encrypted in the database because:

- Tokens expire after 8 hours, requiring refresh
- Background jobs need token access without active sessions
- Installation ID must persist across sessions

### 4. Cookie Configuration

Custom cookie names needed in development only to prevent conflicts when multiple Next.js apps run on localhost. Production uses Auth.js defaults.

## References

- [GitHub Docs: Authenticating with a GitHub App on behalf of a user](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user)
- [GitHub Docs: Refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)
- [Auth.js GitHub Provider](https://authjs.dev/getting-started/providers/github)
- [Auth.js Configuring GitHub](https://authjs.dev/guides/configuring-github)

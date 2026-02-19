# VCS Provider Setup Guide

This guide provides comprehensive instructions for setting up the VCS provider package with Auth.js (NextAuth.js), including all required API endpoints, OAuth flows, and configuration.

## Table of Contents

1. [Overview](#overview)
2. [GitHub App Setup](#github-app-setup)
3. [Required API Endpoints](#required-api-endpoints)
4. [Auth.js Configuration](#authjs-configuration)
5. [Database Schema](#database-schema)
6. [Environment Variables](#environment-variables)
7. [VCSProviderSingleton Initialization](#vcsprovidersingleton-initialization)
8. [Complete OAuth Flows](#complete-oauth-flows)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

## Overview

The VCS provider integration consists of several components working together:

- **GitHub App** - OAuth credentials and app installation tracking
- **Auth.js** - User authentication and session management
- **API Endpoints** - OAuth callbacks and webhook handlers
- **Database** - Encrypted token storage
- **VCSProviderSingleton** - Automatic token management and VCS operations

## GitHub App Setup

### 1. Create a GitHub App

1. Go to **GitHub Settings → Developer settings → GitHub Apps → New GitHub App**
2. Fill in the required fields:
   - **GitHub App name**: Your app name (e.g., "catalyst-dev")
   - **Homepage URL**: `https://your-domain.com` or `http://localhost:3000` for development
   - **Callback URLs** (CRITICAL - Add both URLs, one per line):
     ```
     https://your-domain.com/api/auth/callback/github
     https://your-domain.com/api/github/callback
     ```
   - **Webhook URL**: `https://your-domain.com/api/github/webhook`
   - **Webhook secret**: Generate a secure random string
   - **Request user authorization (OAuth) during installation**: ✅ Check this

3. **Permissions**:
   
   **Repository permissions:**
   - Contents: Read-only (read repository files)
   - Pull requests: Read and write (create/update PR comments)
   - Metadata: Read-only (always enabled)
   
   **Account permissions:**
   - Email addresses: Read-only (CRITICAL - required to access private emails)

4. **Subscribe to events**:
   - Installation
   - Installation repositories
   - Pull request
   - Push

5. Click **Create GitHub App**

### 2. Generate Credentials

After creating the app:

1. **Client ID**: Copy the "Client ID" from the app settings page
2. **Client Secret**: Click "Generate a new client secret" and copy it
3. **App ID**: Copy the "App ID" 
4. **Private Key**: Click "Generate a private key" and download the `.pem` file
5. **Installation URL**: The URL will be `https://github.com/apps/YOUR-APP-NAME/installations/new`

## Required API Endpoints

Your application must implement three API endpoints to handle OAuth and webhooks.

### 1. Auth.js OAuth Callback: `/api/auth/callback/github`

**Purpose**: Handles the OAuth sign-in flow managed by Auth.js

**Handler**: Built into Auth.js - no custom code needed

**Flow**:
1. User clicks "Sign in with GitHub"
2. Auth.js redirects to GitHub OAuth
3. User authorizes the app
4. GitHub redirects back to this endpoint
5. Auth.js processes the callback and creates a session

**Configuration**: See [Auth.js Configuration](#authjs-configuration) section below

---

### 2. GitHub App Installation Callback: `/api/github/callback`

**Purpose**: Handles GitHub App installation and saves the `installation_id`

**Location**: `src/app/api/github/callback/route.ts`

**Parameters**:
- `code` (optional): OAuth authorization code when "Request user authorization during installation" is enabled
- `installation_id`: The GitHub App installation ID
- `setup_action`: "install" or "update"

**Implementation**:

```typescript
import {
  auth,
  createUserWithPersonalTeam,
  createSessionToken,
  setSessionCookie,
} from "@/auth";
import { db } from "@/db";
import { githubUserTokens, users } from "@/db/schema";
import {
  exchangeAuthorizationCode,
  fetchGitHubUser,
  storeGitHubTokens,
} from "@/lib/vcs-providers";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GitHub App Installation Callback Endpoint
 *
 * Handles two flows:
 * 1. OAuth during installation (code + installation_id)
 * 2. Installation only (installation_id only, user already authenticated)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  // OAuth during installation flow
  if (code) {
    return handleOAuthInstallation(request, code, installationId);
  }

  // Installation-only flow (user already authenticated)
  return handleInstallationOnly(request, installationId);
}

async function handleOAuthInstallation(
  request: NextRequest,
  code: string,
  installationId: string | null,
) {
  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeAuthorizationCode(code);

    // 2. Fetch GitHub user profile
    const githubUser = await fetchGitHubUser(tokens.accessToken);

    if (!githubUser.email) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=no_email", request.nextUrl.origin),
      );
    }

    // 3. Find or create user
    let user = await db
      .select()
      .from(users)
      .where(eq(users.email, githubUser.email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      user = await createUserWithPersonalTeam({
        email: githubUser.email,
        name: githubUser.name,
        image: githubUser.avatar_url,
      });
    }

    // 4. Store tokens with installation_id
    await storeGitHubTokens(user.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      installationId: installationId || undefined,
    });

    // 5. Create session cookie
    const sessionToken = await createSessionToken({
      ...user,
      email: githubUser.email,
    });
    await setSessionCookie(sessionToken);

    return NextResponse.redirect(
      new URL("/account?highlight=github", request.nextUrl.origin),
    );
  } catch (error) {
    console.error("OAuth installation failed:", error);
    return NextResponse.redirect(
      new URL("/auth/signin?error=oauth_failed", request.nextUrl.origin),
    );
  }
}

async function handleInstallationOnly(
  request: NextRequest,
  installationId: string | null,
) {
  if (!installationId) {
    return NextResponse.redirect(
      new URL("/account?error=missing_installation", request.nextUrl.origin),
    );
  }

  try {
    const session = await auth();

    // Update the user's github_user_tokens with the installation_id
    await db
      .update(githubUserTokens)
      .set({ installationId, updatedAt: new Date() })
      .where(eq(githubUserTokens.userId, session.user.id));

    return NextResponse.redirect(
      new URL("/account?highlight=github", request.nextUrl.origin),
    );
  } catch (error) {
    console.error("GitHub callback error:", error);
    return NextResponse.redirect(
      new URL("/account?error=callback_failed", request.nextUrl.origin),
    );
  }
}
```

---

### 3. GitHub Webhook Handler: `/api/github/webhook`

**Purpose**: Receives real-time events from GitHub (installation, PR, push, etc.)

**Location**: `src/app/api/github/webhook/route.ts`

**Headers**:
- `x-hub-signature-256`: HMAC SHA-256 signature of the payload
- `x-github-event`: Event type (e.g., "installation", "pull_request")
- `x-github-delivery`: Unique delivery ID

**Security**: MUST validate the webhook signature before processing

**Implementation** (abbreviated):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";

const encoder = new TextEncoder();

async function createHmacSha256(
  secret: string,
  payload: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  
  return `sha256=${bufferToHex(signature)}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function isValidSignature({
  body,
  signature,
  secret,
}: {
  body: string;
  signature: string | null;
  secret: string;
}): Promise<boolean> {
  if (!signature) return false;
  const expectedSignature = await createHmacSha256(secret, body);
  return timingSafeEqual(signature, expectedSignature);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    
    // CRITICAL: Validate signature before processing
    const validSignature = await isValidSignature({
      body,
      signature,
      secret: GITHUB_CONFIG.WEBHOOK_SECRET,
    });

    if (!validSignature) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);

    // Handle different event types
    switch (event) {
      case "installation":
        await handleInstallation(payload);
        break;
      case "installation_repositories":
        await handleInstallationRepositories(payload);
        break;
      case "pull_request":
        await handlePullRequest(payload);
        break;
      case "push":
        await handlePush(payload);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Event handlers
async function handleInstallation(payload: any) {
  const { action, installation } = payload;
  
  switch (action) {
    case "created":
      console.log("App installed:", installation.id);
      break;
    case "deleted":
      console.log("App uninstalled:", installation.id);
      // Clear installation_id from affected user tokens
      await db
        .update(githubUserTokens)
        .set({ installationId: null, updatedAt: new Date() })
        .where(eq(githubUserTokens.installationId, installation.id.toString()));
      break;
    case "suspend":
      console.log("App suspended:", installation.id);
      break;
    case "unsuspend":
      console.log("App unsuspended:", installation.id);
      break;
  }
}

async function handlePullRequest(payload: any) {
  const { action, pull_request, repository } = payload;
  
  switch (action) {
    case "opened":
    case "reopened":
    case "synchronize":
      // Create/update PR in database, deploy preview environment
      await upsertPullRequest(pull_request, repository);
      await createPreviewDeployment(pull_request, repository);
      break;
    case "closed":
      // Clean up preview environment
      await deletePreviewDeployment(pull_request, repository);
      break;
  }
}
```

## Auth.js Configuration

### 1. Auth Config File

**Location**: `src/lib/auth.config.ts`

```typescript
import { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import { NextAuthConfig } from "next-auth";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";

const providers: Provider[] = [
  GitHub({
    clientId: GITHUB_CONFIG.APP_CLIENT_ID,
    clientSecret: GITHUB_CONFIG.APP_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "read:user user:email read:org repo",
      },
    },
  }),
];

/**
 * Custom cookie names for development only.
 * Prevents cookie conflicts when running multiple Next.js apps on localhost.
 * Production uses Auth.js defaults with proper sameSite/secure settings.
 */
const devCookies = {
  sessionToken: { name: "catalyst.session-token" },
  callbackUrl: { name: "catalyst.callback-url" },
  csrfToken: { name: "catalyst.csrf-token" },
  pkceCodeVerifier: { name: "catalyst.pkce.code_verifier" },
  state: { name: "catalyst.state" },
  nonce: { name: "catalyst.nonce" },
};

export default {
  providers,
  cookies: process.env.NODE_ENV === "development" ? devCookies : undefined,
} satisfies NextAuthConfig;
```

### 2. Auth.js Main File with JWT Callback

**Location**: `src/auth.ts`

The JWT callback is crucial for storing GitHub tokens in the database and keeping them refreshed.

```typescript
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { refreshTokenIfNeeded, storeGitHubTokens } from "@/lib/vcs-providers";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    /**
     * JWT Callback
     *
     * Called whenever a JWT is created or updated.
     * This is where we store GitHub tokens in the database and handle token refresh.
     */
    async jwt({ token, account }) {
      // Handle GitHub App authentication
      if (account?.provider === "github") {
        // Store the tokens from GitHub App OAuth
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.tokenExpiresAt = account.expires_at;
        token.tokenScope = account.scope;
      }

      const { email } = token;
      if (!email) {
        throw new Error("No email found during JWT callback");
      }

      // Find or create user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        token.id = existingUser.id;
        token.admin = existingUser.admin;

        // Store GitHub tokens in database on initial signin
        if (
          account?.provider === "github" &&
          token.accessToken &&
          token.refreshToken
        ) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 8);

          await storeGitHubTokens(existingUser.id, {
            accessToken: token.accessToken as string,
            refreshToken: token.refreshToken as string,
            expiresAt,
            scope: (token.tokenScope as string) || "",
          });
        } else if (!account) {
          // Not a fresh signin - check if we need to refresh tokens
          // This runs on every session access to keep tokens fresh
          try {
            const refreshedTokens = await refreshTokenIfNeeded(existingUser.id);
            
            if (refreshedTokens) {
              token.accessToken = refreshedTokens.accessToken;
              token.refreshToken = refreshedTokens.refreshToken;
              if (refreshedTokens.expiresAt) {
                token.tokenExpiresAt = Math.floor(
                  refreshedTokens.expiresAt.getTime() / 1000,
                );
              }
              token.tokenScope = refreshedTokens.scope;
            }
          } catch (error) {
            console.error("Failed to refresh GitHub tokens:", error);
          }
        }

        return token;
      } else {
        // Create new user
        const createdUser = await createUserWithPersonalTeam({
          email: token.email!,
          name: token.name,
          image: token.picture,
        });

        token.id = createdUser.id;
        token.admin = createdUser.admin;

        // Store GitHub tokens for new user
        if (
          account?.provider === "github" &&
          token.accessToken &&
          token.refreshToken
        ) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 8);

          await storeGitHubTokens(createdUser.id, {
            accessToken: token.accessToken as string,
            refreshToken: token.refreshToken as string,
            expiresAt,
            scope: (token.tokenScope as string) || "",
          });
        }

        return token;
      }
    },

    /**
     * Session Callback
     *
     * Called whenever a session is checked.
     * The return value will be exposed to the client.
     */
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.user.admin = token.admin as boolean;
        session.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
  },
});
```

## Database Schema

The database schema for storing GitHub tokens must support encrypted token storage.

**Location**: `src/db/schema.ts` (or use `@tetrastack/backend` schema)

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const githubUserTokens = pgTable("github_user_tokens", {
  userId: text("user_id")
    .references(() => users.id)
    .notNull()
    .primaryKey(),
  installationId: text("installation_id"),
  
  // Encrypted access token
  accessTokenEncrypted: text("access_token_encrypted"),
  accessTokenIv: text("access_token_iv"),
  accessTokenAuthTag: text("access_token_auth_tag"),
  
  // Encrypted refresh token
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  refreshTokenIv: text("refresh_token_iv"),
  refreshTokenAuthTag: text("refresh_token_auth_tag"),
  
  // Token metadata
  tokenExpiresAt: timestamp("token_expires_at"),
  tokenScope: text("token_scope"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Run Migrations

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# ============================================================================
# GitHub App Configuration
# ============================================================================

# OAuth credentials (for Auth.js sign-in)
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App credentials (for API operations)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYour-Private-Key-Here\n-----END RSA PRIVATE KEY-----"

# Installation URL (for "Install App" buttons in UI)
NEXT_PUBLIC_GITHUB_APP_URL=https://github.com/apps/your-app-name/installations/new

# Webhook secret (for validating webhook signatures)
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here

# ============================================================================
# Security
# ============================================================================

# Token encryption key (64-character hex string)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ============================================================================
# Auth.js (NextAuth)
# ============================================================================

# Base URL for OAuth callbacks
NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000

# Auth secret for JWT signing
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-random-secret-here

# ============================================================================
# Database
# ============================================================================

DATABASE_URL=postgresql://user:password@localhost:5432/catalyst
```

## VCSProviderSingleton Initialization

Initialize the VCSProviderSingleton once at application startup.

**Location**: `src/lib/vcs-provider-init.ts`

```typescript
import { VCSProviderSingleton } from "@catalyst/vcs-provider";
import {
  getGitHubTokens,
  storeGitHubTokens,
  exchangeRefreshToken,
} from "@catalyst/vcs-provider";
import type { ProviderId } from "@catalyst/vcs-provider";

let initialized = false;

export function initializeVCSProvider() {
  if (initialized) return;

  VCSProviderSingleton.initialize({
    getTokenData: async (tokenSourceId: string, providerId: ProviderId) => {
      if (providerId === "github") {
        return await getGitHubTokens(tokenSourceId);
      }
      return null;
    },

    refreshToken: async (refreshToken: string, providerId: ProviderId) => {
      if (providerId === "github") {
        const tokens = await exchangeRefreshToken(refreshToken);
        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        };
      }
      throw new Error(`Unsupported provider: ${providerId}`);
    },

    storeTokenData: async (
      tokenSourceId: string,
      tokens,
      providerId: ProviderId,
    ) => {
      if (providerId === "github") {
        await storeGitHubTokens(tokenSourceId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || "",
          expiresAt: tokens.expiresAt || new Date(),
          scope: tokens.scope || "",
        });
      }
    },

    requiredEnvVars: [
      "GITHUB_APP_CLIENT_ID",
      "GITHUB_APP_CLIENT_SECRET",
      "TOKEN_ENCRYPTION_KEY",
    ],

    // Auto-refresh tokens 5 minutes before expiration
    expirationBufferMs: 5 * 60 * 1000,
  });

  initialized = true;
}
```

**Call from middleware or instrumentation**:

```typescript
// src/middleware.ts or src/instrumentation.ts
import { initializeVCSProvider } from "@/lib/vcs-provider-init";

initializeVCSProvider();
```

## Complete OAuth Flows

### Flow 1: User Sign-In via Auth.js

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Sign in with GitHub"                           │
│   ↓                                                          │
│ Auth.js redirects to:                                        │
│   https://github.com/login/oauth/authorize                  │
│   ?client_id=Iv1.xxx                                         │
│   &redirect_uri=https://yourapp.com/api/auth/callback/github│
│   &scope=read:user user:email read:org repo                 │
│   ↓                                                          │
│ User authorizes app on GitHub                                │
│   ↓                                                          │
│ GitHub redirects to:                                         │
│   https://yourapp.com/api/auth/callback/github?code=xxx     │
│   ↓                                                          │
│ Auth.js exchanges code for tokens                            │
│   ↓                                                          │
│ JWT callback stores tokens in database                       │
│   ↓                                                          │
│ Session created, user redirected to dashboard               │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: GitHub App Installation with OAuth

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Install GitHub App" button                      │
│   ↓                                                          │
│ Redirect to NEXT_PUBLIC_GITHUB_APP_URL                       │
│   ↓                                                          │
│ User selects repositories to grant access                    │
│   ↓                                                          │
│ GitHub OAuth consent screen (OAuth during installation)      │
│   ↓                                                          │
│ User authorizes OAuth access                                 │
│   ↓                                                          │
│ GitHub redirects to:                                         │
│   /api/github/callback                                       │
│   ?code=xxx                                                  │
│   &installation_id=12345                                     │
│   &setup_action=install                                      │
│   ↓                                                          │
│ Callback handler:                                            │
│   1. Exchange code for tokens                                │
│   2. Fetch GitHub user profile                               │
│   3. Find or create user in database                         │
│   4. Store tokens + installation_id                          │
│   5. Create session cookie                                   │
│   ↓                                                          │
│ User redirected to /account?highlight=github                 │
└─────────────────────────────────────────────────────────────┘
```

### Flow 3: Token Refresh (Automatic)

```
┌─────────────────────────────────────────────────────────────┐
│ User makes API request                                       │
│   ↓                                                          │
│ VCSProviderSingleton checks token expiration                 │
│   ↓                                                          │
│ Token expires in < 5 minutes? (expiration buffer)            │
│   ↓ YES                                                      │
│ Call exchangeRefreshToken(refreshToken)                      │
│   ↓                                                          │
│ POST https://github.com/login/oauth/access_token             │
│   {                                                          │
│     client_id, client_secret, grant_type: "refresh_token",   │
│     refresh_token                                            │
│   }                                                          │
│   ↓                                                          │
│ GitHub returns new tokens                                    │
│   {                                                          │
│     access_token, refresh_token, expires_in: 28800           │
│   }                                                          │
│   ↓                                                          │
│ Store new encrypted tokens in database                       │
│   ↓                                                          │
│ Continue with original API request using new token           │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### Token Encryption

All tokens are encrypted using AES-256-GCM before storage:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encryption
function encrypt(text: string, key: Buffer): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// Decryption
function decrypt(
  encrypted: string,
  iv: string,
  authTag: string,
  key: Buffer,
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex"),
  );
  
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
```

### Webhook Signature Validation

ALWAYS validate webhook signatures before processing:

```typescript
// CRITICAL: Use timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function isValidSignature({
  body,
  signature,
  secret,
}: {
  body: string;
  signature: string | null;
  secret: string;
}): Promise<boolean> {
  if (!signature) return false;
  
  const expectedSignature = await createHmacSha256(secret, body);
  return timingSafeEqual(signature, expectedSignature);
}
```

### Environment Variable Security

- Store `TOKEN_ENCRYPTION_KEY` in a secrets manager (AWS Secrets Manager, Vault, etc.)
- Never commit secrets to version control
- Use different keys for development, staging, and production
- Rotate keys periodically (requires re-encrypting all stored tokens)

### Cookie Security

In production, Auth.js automatically sets secure cookie attributes:

```typescript
// Production cookies (Auth.js defaults)
{
  httpOnly: true,
  secure: true,      // Only sent over HTTPS
  sameSite: "lax",   // CSRF protection
  path: "/",
}
```

## Troubleshooting

### "The redirect_uri is not associated with this application"

**Cause**: Missing callback URL in GitHub App settings

**Solution**: Add both callback URLs to your GitHub App:
```
https://your-domain.com/api/auth/callback/github
https://your-domain.com/api/github/callback
```

### "no_email" error during OAuth

**Cause**: GitHub user has private email and the "Email addresses" permission is missing

**Solution**: 
1. Go to GitHub App settings → Permissions & events → Account permissions
2. Set "Email addresses" to "Read-only"
3. Users must reinstall the app to grant the new permission

### Tokens not refreshing

**Cause**: Multiple possible issues

**Solutions**:
1. Check `TOKEN_ENCRYPTION_KEY` is set correctly
2. Verify `tokenExpiresAt` is stored correctly in database
3. Check VCSProviderSingleton is initialized with `expirationBufferMs`
4. Review console logs for refresh errors

### Webhook events not received

**Cause**: Invalid webhook secret or URL not accessible

**Solutions**:
1. Verify `GITHUB_WEBHOOK_SECRET` matches GitHub App settings
2. Check webhook URL is publicly accessible (use ngrok for local testing)
3. Review "Recent Deliveries" in GitHub App settings
4. Check webhook endpoint logs for signature validation failures

### Cookie conflicts in development

**Cause**: Multiple Next.js apps on localhost using same cookie names

**Solution**: Use custom cookie names in development:
```typescript
cookies: process.env.NODE_ENV === "development" ? devCookies : undefined,
```

## Additional Resources

- [README.md](./README.md) - Package overview and VCSProviderSingleton usage
- [EXAMPLES.md](./EXAMPLES.md) - Code examples for common operations
- [AGENTS.md](./AGENTS.md) - Instructions for AI agents
- [specs/003-vcs-providers/spec.md](../../../specs/003-vcs-providers/spec.md) - Integration specification
- [specs/003-vcs-providers/research.github-app.md](../../../specs/003-vcs-providers/research.github-app.md) - GitHub App research
- [GitHub Docs: Authenticating with a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app)
- [Auth.js Documentation](https://authjs.dev)

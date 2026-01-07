# @tetrastack/backend

Shared backend infrastructure for Tetrastack applications, providing database schemas, authentication, and utility functions.

## Features

- **Database**: Drizzle ORM schemas for SQLite (libSQL/Turso).
- **Authentication**: NextAuth.js v5 configuration and utilities.
- **Storage**: R2 upload management with presigned URLs.
- **Utils**: UUIDv7 generation, slugification, and more.

## Installation

```bash
pnpm add @tetrastack/backend
```

## Database Schema

This package exports Drizzle ORM schemas that you must import into your application's Drizzle configuration.

```typescript
// src/db/schema.ts
import { sqlite } from "@tetrastack/backend/database";

const { users, accounts, sessions, verificationTokens, uploads, connectionTokens } = sqlite;

// Combine with your own tables if needed
export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  uploads,
  connectionTokens,
};
```

## Security & Encryption

This package provides utilities for encrypting sensitive data (like OAuth tokens) using AES-256-GCM.

### Configuration

Set the `TOKEN_ENCRYPTION_KEY` environment variable with a 32-byte hex string.

```bash
# Generate a key
openssl rand -hex 32
```

### Usage

```typescript
import { encrypt, decrypt } from "@tetrastack/backend/utils";

// Encrypt
const { encryptedData, iv, authTag } = encrypt("sensitive-token");

// Decrypt
const token = decrypt(encryptedData, iv, authTag);
```

## Authentication

### Setup

Use `createAuth` to configure NextAuth with your database instance.

```typescript
// src/auth.ts
import { createAuth } from "@tetrastack/backend/auth";
import { db } from "./db"; // Your initialized Drizzle instance

export const { handlers, auth, signIn, signOut } = createAuth(db);
```

### API Route

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"; // path to your auth.ts
export const { GET, POST } = handlers;
```

### Local Development

In development (`NODE_ENV=development`), you can log in without email verification:

- **Admin**: User `admin` / Password `admin` (or `password`) -> Creates admin user.
- **User**: User `user` / Password `password` -> Creates regular user.

The package will automatically create these users in your database if they don't exist upon first login.

### Programmatic Session Creation

For scenarios where you need to create a session outside the normal Auth.js flow (e.g., VCS webhook callbacks, Playwright tests), use the `createSessionHelpers` factory:

```typescript
import { createSessionHelpers } from "@tetrastack/backend/auth";

// Initialize with your cookie name (should match your Auth.js config)
const isProduction = process.env.NODE_ENV === "production";
const {
  createSessionToken,
  setSessionCookie,
  createAndSetSession,
  getCookieName,
} = createSessionHelpers({
  cookieName: isProduction
    ? "__Secure-authjs.session-token"
    : "myapp.session-token",
});
```

#### VCS Webhook Callback Example

When handling OAuth callbacks from VCS providers (e.g., GitHub App installation with OAuth):

```typescript
// In your webhook callback route handler
export async function GET(request: NextRequest) {
  const user = await findOrCreateUser(oauthProfile);

  // Create session and set cookie in one call
  await createAndSetSession({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    admin: user.admin,
  });

  return NextResponse.redirect("/dashboard");
}
```

> **Note**: When using GitHub Apps, ensure the **Emails** permission is set to "Read-only" in your GitHub App settings. Without this permission, `fetchGitHubUser()` cannot retrieve private email addresses, resulting in authentication failures. See the [@catalyst/vcs-provider README](../../@catalyst/vcs-provider/README.md#github-app-permissions) for details.

#### Playwright Test Example

For programmatic login in E2E tests, you can create session tokens directly:

```typescript
import { encode } from "next-auth/jwt";

async function generateSessionToken(user: TestUser): Promise<string> {
  const secret = process.env.AUTH_SECRET || "test-secret";
  const now = Math.floor(Date.now() / 1000);

  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      admin: user.admin,
      iat: now,
      exp: now + 60 * 60, // 1 hour expiry
    },
    secret,
    salt: "authjs.session-token", // Must match your cookie name
  });

  return token;
}

// Set cookie in Playwright test
await page.context().addCookies([
  {
    name: "authjs.session-token",
    value: await generateSessionToken(testUser),
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  },
]);
```

Or use the factory for cleaner tests:

```typescript
const { createSessionToken, getCookieName } = createSessionHelpers({
  cookieName: "myapp.session-token",
  secret: "test-secret",
});

async function loginAsUser(page: Page, user: TestUser) {
  const token = await createSessionToken(user);
  await page.context().addCookies([
    {
      name: getCookieName(),
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
```

## Uploads

Initialize the uploads service with your database instance.

```typescript
// src/lib/uploads.ts
import { createUploads } from "@tetrastack/backend/uploads";
import { sqlite } from "@tetrastack/backend/database";
import { db } from "@/db";

export const uploads = createUploads(db, sqlite.uploads);
```

Usage:

```typescript
const { url, key } = await uploads.createPresignedUpload({ ... });
```

# Authentication System Documentation

This document provides comprehensive guidance on how Auth.js (NextAuth.js v5), Drizzle ORM, Playwright automated login, and Google OAuth work together in this project.

## Package Versions

```json
{
  "dependencies": {
    "next-auth": "5.0.0-beta.29",
    "@auth/drizzle-adapter": "1.10.0",
    "drizzle-orm": "0.44.3",
    "drizzle-zod": "0.8.3",
    "next": "15.3.5",
    "react": "19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "1.52.0",
    "drizzle-kit": "0.31.4"
  }
}
```

## Architecture Overview

**Auth Strategy**: Pure JWT (no database adapter) for all environments

- **Development**: Credentials provider with password-based auth (seeded users)
- **Production**: Google OAuth provider
- **Session Management**: JWT tokens stored in cookies (`authjs.session-token`)

## 1. Drizzle Schema

Location: `src/lib/db/schema.auth.ts`

The schema follows NextAuth.js v5 conventions but is NOT used by the adapter (pure JWT strategy):

```typescript
// Users table - Core user data
export const users = sqliteTable('user', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
  admin: integer('admin', { mode: 'boolean' }).default(false),
  onboardingCompleted: integer('onboarding_completed', {
    mode: 'boolean',
  }).default(false),
  onboardingData: text('onboarding_data', {
    mode: 'json',
  }).$type<OnboardingDataValidated>(),
  data: text('data', { mode: 'json' }).$type<{
    defaultMealAllocations?: MemberAllocations;
  }>(),
});

// OAuth accounts (for Google OAuth)
export const accounts = sqliteTable(
  'account',
  {
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

// Sessions table (not used with JWT strategy, but kept for schema compatibility)
export const sessions = sqliteTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: integer('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

// Verification tokens (for email verification)
export const verificationTokens = sqliteTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

// Authenticators (for WebAuthn/Passkeys)
export const authenticators = sqliteTable(
  'authenticator',
  {
    credentialID: text('credentialID').notNull().unique(),
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('providerAccountId').notNull(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credentialDeviceType').notNull(),
    credentialBackedUp: integer('credentialBackedUp', {
      mode: 'boolean',
    }).notNull(),
    transports: text('transports'),
  },
  (authenticator) => ({
    compositePK: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  }),
);
```

### Key Schema Points

- Uses SQLite with integer primary keys
- Custom fields: `admin`, `onboardingCompleted`, `onboardingData`, `data`
- Schema is compatible with NextAuth.js Drizzle adapter but **NOT used** (pure JWT)
- All OAuth data goes into `accounts` table

## 2. Auth Configuration

### Edge-Safe Config

Location: `src/lib/auth.config.ts`

```typescript
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authConfig = {
  providers: [Google],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
```

### Full Auth Setup

Location: `src/app/auth.ts`

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from '@/lib/auth.config';

// Add Credentials provider for development
if (process.env.NODE_ENV === 'development') {
  authConfig.providers.push(
    Credentials({
      id: 'password',
      name: 'Password',
      credentials: { password: { label: 'Password', type: 'password' } },
      authorize: async (credentials) => {
        const password = credentials.password as string;
        const passwordMatch = password.match(/^(password|admin)(?:-.*)?$/);
        if (!passwordMatch) return null;

        const [, baseType] = passwordMatch;
        const email =
          baseType === 'admin' ? 'admin@example.com' : 'bob@alice.com';

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));
        if (!user) return null;

        return { ...user, id: user.id.toString(), admin: user.admin ?? false };
      },
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: undefined, // Pure JWT - NO database adapter
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in: populate token with user data
      if (user?.id) {
        token.id = user.id;
        token.admin = user.admin;
        return token;
      }

      // On token refresh: look up user by email
      const { email, name, picture } = token;
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        token.id = existingUser.id.toString();
        token.admin = existingUser.admin ?? false;
        return token;
      }

      // Create new user for OAuth (auto-registration)
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name,
          image: picture,
          admin: false,
          onboardingCompleted: true,
          onboardingData: createDefaultOnboardingData(1, name || 'User'),
        })
        .returning();

      token.id = newUser.id.toString();
      token.admin = newUser.admin ?? false;
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.admin = token.admin as boolean;
      return session;
    },
  },
});
```

### Key Auth Points

- **NO database adapter** - pure JWT strategy
- Credentials provider only in development
- Google OAuth auto-creates users on first sign-in
- User ID and admin status stored in JWT token
- Cookies: `authjs.session-token`, `authjs.csrf-token`, `authjs.callback-url`

## 3. Google OAuth Setup

### Environment Variables

Add to `.env`:

```bash
# Required for Auth.js
AUTH_SECRET=txPLQWs8toKE251TIWiGS6abI4dJafPA5Kd/DTxou6q5  # Generate: openssl rand -base64 32

# Required for Google OAuth (production)
AUTH_GOOGLE_ID=your_google_client_id_here
AUTH_GOOGLE_SECRET=your_google_client_secret_here

# Optional: Trust host for OAuth redirects
AUTH_TRUST_HOST=true
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google+ API" or "Google Identity Services"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy Client ID → `AUTH_GOOGLE_ID`
8. Copy Client Secret → `AUTH_GOOGLE_SECRET`

### How Google OAuth Works

1. User clicks "Sign in with Google"
2. Redirects to Google consent screen
3. Google redirects back to `/api/auth/callback/google`
4. JWT callback looks up user by email
5. If user doesn't exist, creates new user with `onboardingCompleted: true`
6. Encodes user data into JWT token
7. Sets `authjs.session-token` cookie
8. Session callback adds user ID and admin to session object

## 4. Playwright Automated Login

Location: `tests/e2e/fixtures/base-fixtures.ts`

### Fast Cookie-Based Authentication

This bypasses the UI for faster test execution:

```typescript
import { encode } from 'next-auth/jwt';

// Create test user in database
async function createTestUser(credentials: string): Promise<TestUser> {
  const passwordMatch = credentials.match(/^(password|admin)-(.+)$/);
  const [, baseType, suffix] = passwordMatch;
  const isAdmin = baseType === 'admin';

  const email = isAdmin
    ? `admin-${suffix}@example.com`
    : `user-${suffix}@example.com`;
  const name = isAdmin ? `Test Admin ${suffix}` : `Test User ${suffix}`;

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      admin: isAdmin,
      image: 'https://avatars.githubusercontent.com/u/67470890?s=200&v=4',
    })
    .returning();

  return {
    id: newUser.id.toString(),
    email: newUser.email!,
    name: newUser.name!,
    admin: newUser.admin ?? false,
  };
}

// Generate JWT session token (same as Auth.js)
async function generateSessionToken(user: TestUser): Promise<string> {
  const secret =
    process.env.AUTH_SECRET || 'txPLQWs8toKE251TIWiGS6abI4dJafPA5Kd/DTxou6q5';
  const now = Math.floor(Date.now() / 1000);

  return await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      admin: user.admin,
      iat: now,
      exp: now + 3600,
    },
    secret,
    salt: 'authjs.session-token', // CRITICAL: Must match Auth.js v5 salt
  });
}

// Set authentication cookies (bypasses sign-in UI)
export async function setAuthCookies(
  context: BrowserContext,
  user: TestUser,
): Promise<void> {
  const sessionToken = await generateSessionToken(user);
  const csrfToken =
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2);

  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'authjs.csrf-token',
      value: csrfToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'authjs.callback-url',
      value: 'http://localhost:3000/',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

// Playwright fixture: onboarded user (fast)
export const test = base.extend<BaseFixtures>({
  onboardedUser: async ({ browser, baseTestData }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Create user in database
    const user = await createTestUser(baseTestData.user.credentials);

    // Complete onboarding in database (no UI interaction)
    await completeUserOnboarding(user);

    // Set auth cookies (bypasses sign-in flow)
    await setAuthCookies(context, user);

    await use({ page, data: baseTestData, userId: parseInt(user.id) });
    await context.close();
  },
});
```

### Key Playwright Points

- **Cookie-based auth** - 10x faster than UI login
- Uses `next-auth/jwt` `encode()` to generate valid JWT tokens
- Salt must be `'authjs.session-token'` for Auth.js v5
- Creates deterministic test users per worker/test
- Sets 3 cookies: `authjs.session-token`, `authjs.csrf-token`, `authjs.callback-url`
- Onboarding completed in database, not UI
- No page navigation until after cookies are set

## 5. Installation Instructions

```bash
# Install exact versions
npm install next-auth@5.0.0-beta.29 @auth/drizzle-adapter@1.10.0

# Peer dependencies (usually already installed)
npm install drizzle-orm@0.44.3 drizzle-zod@0.8.3 next@15.3.5

# Dev dependencies for testing
npm install -D @playwright/test@1.52.0 drizzle-kit@0.31.4

# Generate auth secret
openssl rand -base64 32  # Add to .env as AUTH_SECRET

# Apply database migrations
npm run db:migrate

# Seed development users (for Credentials provider)
npm run db:seed
```

## 6. Usage Examples

### Server Component

```typescript
import { auth } from '@/app/auth';

export default async function Page() {
  const session = await auth();
  if (!session) return <div>Not authenticated</div>;
  return <div>Hello {session.user.name}</div>;
}
```

### Server Action

```typescript
'use server';
import { authRequired } from '@/app/auth';

export async function createMeal() {
  const session = await authRequired(); // Throws if not authenticated
  // Create meal for session.user.id
}
```

### Client Component

```typescript
'use client';
import { useSession } from 'next-auth/react';

export function ProfileButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <a href="/api/auth/signin">Sign in</a>;

  return <div>Welcome {session.user.name}</div>;
}
```

### Playwright Test

```typescript
import { test, expect } from './fixtures/base-fixtures';

test('view meal plan', async ({ onboardedUser }) => {
  const { page } = onboardedUser;
  // User is already authenticated + onboarded via cookies
  await page.goto('/meal-plan');
  await expect(page.getByRole('heading', { name: 'Meal Plan' })).toBeVisible();
});
```

## 7. Development Credentials

For local development, the Credentials provider accepts:

- **Admin access**: Password "admin" with any suffix (e.g., "admin-123", "admin-943")
- **Regular user access**: Password "password" with any suffix (e.g., "password-456")

These credentials work with seeded users from `npm run db:seed`.

## 8. Troubleshooting

### JWT Decode Errors in Tests

**Problem**: Tests fail with "JWTDecodeError" or invalid token

**Solution**: Ensure the salt matches Auth.js v5:

```typescript
salt: 'authjs.session-token'; // NOT 'session-token'
```

### OAuth Redirect Mismatch

**Problem**: Google OAuth fails with redirect URI mismatch

**Solution**: Ensure redirect URIs in Google Cloud Console exactly match your app:

- `http://localhost:3000/api/auth/callback/google` (no trailing slash)
- Match the port in `WEB_PORT` environment variable

### Session Not Persisting

**Problem**: User gets logged out immediately

**Solution**:

1. Check `AUTH_SECRET` is set in `.env`
2. Verify cookie domain matches your hostname
3. Ensure `AUTH_TRUST_HOST=true` in production

### Credentials Provider Not Working

**Problem**: Password auth fails in development

**Solution**:

1. Run `npm run db:seed` to create test users
2. Verify `NODE_ENV=development`
3. Check database has users with emails: `bob@alice.com` and `admin@example.com`

## Summary

This setup provides:

- Fast, secure authentication with Google OAuth in production
- Password-based dev auth for testing
- Pure JWT sessions (no database adapter)
- Cookie-based Playwright testing (10x faster than UI login)
- Auto-registration for OAuth users
- Custom user fields (admin, onboarding status)

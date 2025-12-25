# Authentication Adoption Guide

This guide covers how to integrate @tetrastack/backend authentication into your project.

## Quick Start

### Node.js Mode (Database-backed)

For applications that need user persistence and database storage:

```typescript
// src/lib/auth.ts
import { createAuth } from '@tetrastack/backend/auth';
import { database } from '../database';

export const { handlers, auth, signIn, signOut } = createAuth({ database });
```

### Edge Mode (JWT-only)

For edge runtimes or when database access is not needed:

```typescript
// src/lib/auth.ts
import { createAuth } from '@tetrastack/backend/auth';

export const { auth } = createAuth();
```

## Database Setup

### 1. Choose Your Dialect

Import schemas for your database:

```typescript
// src/database/schema.ts
import { sqlite } from '@tetrastack/backend/database';
// or
import { postgres } from '@tetrastack/backend/database';

export const schema = {
  ...sqlite, // or ...postgres
};
```

### 2. Initialize Drizzle

```typescript
// src/database/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { schema } from './schema';

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

### 3. Create Auth Instance

```typescript
// src/lib/auth.ts
import { createAuth } from '@tetrastack/backend/auth';
import { db } from '../database';

export const { handlers, auth, signIn, signOut } = createAuth({ database: db });
```

### 4. Set Up API Routes

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

## Custom Providers

Add OAuth or other providers alongside the default credentials provider:

```typescript
import {
  createAuth,
  providers as defaultProviders,
} from '@tetrastack/backend/auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = createAuth({
  database,
  providers: [
    ...defaultProviders, // Include default credentials provider
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});
```

Or replace the default providers entirely:

```typescript
import { createAuth } from '@tetrastack/backend/auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, auth, signIn, signOut } = createAuth({
  database,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
});
```

## Usage Patterns

### Protected Routes with proxy.ts

```typescript
// src/proxy.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function proxy(req: NextRequest) {
  const session = await auth();

  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

### Protected Server Components

```typescript
// src/app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>User ID: {session.user.id}</p>
    </div>
  );
}
```

### Custom Login Page

```typescript
// src/app/login/page.tsx
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <form
      action={async (formData) => {
        "use server";
        await signIn("credentials", formData);
      }}
    >
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Sign Out Button

```typescript
// src/components/sign-out-button.tsx
import { signOut } from "@/lib/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button type="submit">Sign Out</button>
    </form>
  );
}
```

### Accessing User Data

```typescript
// In server components
import { auth } from "@/lib/auth";
import { db } from "@/database";
import { sqlite } from "@tetrastack/backend/database";
import { eq } from "drizzle-orm";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(sqlite.users.id, session.user.id),
  });

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
    </div>
  );
}
```

## Environment Variables

### Required

```bash
# JWT secret (required for both modes)
AUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32

# Database (required for Node.js mode)
DATABASE_URL=http://127.0.0.1:8080
DATABASE_AUTH_TOKEN=  # Optional for local dev
```

### Optional

```bash
# For production deployments
NEXTAUTH_URL=https://yourdomain.com

# OAuth providers (if using)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Development Mode

In development (`NODE_ENV=development`), the default credentials provider accepts:

- Password `admin` - Creates/returns admin user (admin@example.com)
- Password `password` - Creates/returns regular user (user@example.com)

This allows quick testing without setting up email verification.

## Troubleshooting

### "No session" in protected routes

**Cause**: AUTH_SECRET not set or mismatched
**Fix**: Ensure AUTH_SECRET is set in .env.local and consistent across deployments

### "Database connection failed"

**Cause**: DATABASE_URL incorrect or database not running
**Fix**: Verify database is running and URL is correct

### "Cannot access database in edge runtime"

**Cause**: Using Node.js mode auth in edge runtime
**Fix**: Use edge mode without database:

```typescript
export const { auth } = createAuth(); // No database parameter
```

### "User not created in database"

**Cause**: Using edge mode which doesn't create users
**Fix**: Switch to Node.js mode with database for user persistence

## When to Use Each Mode

### Use Node.js Mode When:

- You need to store user data
- Using OAuth providers with user profiles
- Need database relationships with users
- Running in traditional server environment

### Use Edge Mode When:

- Deploying to edge runtimes (Cloudflare Workers, Vercel Edge)
- Only need JWT token verification
- Building read-only authenticated experiences
- Optimizing for cold start performance

# @tetrastack/backend

This package provides shared backend utilities, database schemas, and authentication infrastructure for Tetrastack applications.

## Modules

### Database

Database schema definitions and exports using Drizzle ORM with support for multiple database dialects.

#### Schema Dialects

Schemas are available for both SQLite and PostgreSQL, optimized for each database:

```typescript
// SQLite schemas
import { sqlite } from '@tetrastack/backend/database';
const { users, accounts, sessions, verificationTokens, uploads } = sqlite;

// PostgreSQL schemas
import { postgres } from '@tetrastack/backend/database';
const { users, accounts, sessions, verificationTokens, uploads } = postgres;
```

**Key differences:**

- **SQLite**: Uses `text` for UUIDs, `integer` for timestamps
- **PostgreSQL**: Uses native `uuid` type, `timestamp` with timezone, `jsonb` for metadata

Both dialects:

- Use UUIDv7 for all primary keys
- Have identical table and column names
- Are compatible with the Auth.js DrizzleAdapter

#### Exports

- **Auth Tables** - User, Account, Session, and VerificationToken tables compatible with Auth.js
- **Uploads Table** - File upload metadata storage
- **Schema utilities** - Common column definitions and patterns

The consumer application is responsible for initializing the Drizzle client and importing the appropriate dialect schemas.

---

### Auth

Authentication infrastructure using Auth.js (NextAuth v5) with JWT sessions and dual-mode support.

#### Auth Modes

The auth system supports two runtime modes:

**Node.js Mode** (with database):

```typescript
import { createAuth } from '@tetrastack/backend/auth';
import { database } from './database';

export const { handlers, auth, signIn, signOut } = createAuth({ database });
```

**Edge Mode** (without database):

```typescript
import { createAuth } from '@tetrastack/backend/auth';

export const { auth } = createAuth();
```

| Feature        | Node.js Mode | Edge Mode       |
| -------------- | ------------ | --------------- |
| Database       | Required     | Not supported   |
| Runtime        | Node.js      | Edge or Node.js |
| User storage   | Yes          | No (JWT only)   |
| DrizzleAdapter | Yes          | No              |
| Cold start     | ~100-500ms   | ~0-50ms         |
| Session type   | JWT          | JWT             |

#### Custom Providers

Projects can provide their own auth providers:

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
    ...defaultProviders,
    GitHub({ clientId: '...', clientSecret: '...' }),
    Google({ clientId: '...', clientSecret: '...' }),
  ],
});
```

#### Functional Requirements

| ID          | Requirement             | Description                                                           |
| ----------- | ----------------------- | --------------------------------------------------------------------- |
| FR-AUTH-001 | JWT Sessions            | Use JWT-based sessions instead of database sessions                   |
| FR-AUTH-002 | Credentials Provider    | Support username/password authentication                              |
| FR-AUTH-003 | Dev Admin Access        | In local development, allow `admin`/`password` login without email    |
| FR-AUTH-004 | OAuth Ready             | Architecture supports adding OAuth providers                          |
| FR-AUTH-005 | Auto User Creation      | Create user record in database on first authentication (Node.js mode) |
| FR-AUTH-006 | Database User ID in JWT | JWT token contains the real UUIDv7 `userId` from the database         |
| FR-AUTH-007 | Edge Runtime Support    | Auth can run without database for edge deployments                    |
| FR-AUTH-008 | Custom Providers        | Projects can provide custom auth providers                            |

#### User Creation Flow (Node.js Mode)

1. User authenticates via credentials (or OAuth)
2. On first login, create user record in database with UUIDv7 primary key
3. Store the database `user.id` (UUIDv7) in the JWT token as `userId`
4. Subsequent requests use `userId` from JWT to query user data

```typescript
// JWT token structure
{
  userId: "018f6b2a-5c3d-7def-8abc-1234567890ab", // Real database user.id (UUIDv7)
  email: "user@example.com",
  name: "User Name",
  // ... other claims
}

// Session structure exposed to client
{
  user: {
    id: "018f6b2a-5c3d-7def-8abc-1234567890ab", // Maps from token.userId
    email: "user@example.com",
    name: "User Name",
  }
}
```

#### Configuration Interface

```typescript
interface CreateAuthConfig {
  database?: DrizzleDB; // Database instance (omit for edge mode)
  providers?: Provider[]; // Custom auth providers (optional)
}
```

#### Dev Mode Behavior

When `NODE_ENV === 'development'`:

- Username `admin` with password `password` authenticates without email validation
- Creates/returns admin user with elevated permissions
- Bypasses email verification requirements

#### Production Behavior

- Requires valid email address
- Password must meet security requirements
- Email verification enforced

---

### Next.js 16 Patterns

#### proxy.js Convention

Next.js 16 introduces `proxy.js` (formerly `middleware.js`) for edge-deployed request interceptors.

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

For edge deployment with auth-only verification (no database access):

```typescript
// src/lib/auth.edge.ts
import { createAuth } from '@tetrastack/backend/auth';

export const { auth } = createAuth(); // No database for edge runtime
```

---

### Utils

Common utility functions used as database defaults and throughout the application.

#### UUIDv7

Time-ordered UUIDs that provide:

- Monotonically increasing identifiers
- Embedded timestamp for creation time
- Database index-friendly ordering
- No collision risk across distributed systems

```typescript
import { uuidv7 } from '@tetrastack/backend/utils';

const id = uuidv7(); // "018f6b2a-5c3d-7def-8abc-1234567890ab"
```

#### Slugifier

URL-safe slug generation from strings.

```typescript
import { slugify } from '@tetrastack/backend/utils';

slugify('Hello World!'); // "hello-world"
slugify('My Article Title', { separator: '_' }); // "my_article_title"
```

**Options:**

- `separator` - Character to replace spaces (default: `-`)
- `lowercase` - Convert to lowercase (default: `true`)
- `strict` - Remove special characters (default: `true`)
- `maxLength` - Truncate to max length (optional)

---

### Uploads

S3-compatible upload management for Cloudflare R2 storage.

#### Functional Requirements

| ID            | Requirement       | Description                                              |
| ------------- | ----------------- | -------------------------------------------------------- |
| FR-UPLOAD-001 | Presigned URLs    | Generate presigned upload URLs for direct client uploads |
| FR-UPLOAD-002 | Multipart Support | Handle large file uploads via multipart API              |
| FR-UPLOAD-003 | Metadata Storage  | Store file metadata in database with R2 object keys      |
| FR-UPLOAD-004 | Access Control    | Generate signed download URLs with expiration            |
| FR-UPLOAD-005 | Delete Operations | Remove objects from R2 and associated database records   |

#### Configuration

```typescript
// Environment variables required
R2_ACCOUNT_ID; // Cloudflare account ID
R2_ACCESS_KEY_ID; // R2 API access key
R2_SECRET_KEY; // R2 API secret key
R2_BUCKET_NAME; // Target bucket name
R2_PUBLIC_URL; // Optional: public bucket URL for direct access
```

#### Methods

```typescript
import { uploads } from '@tetrastack/backend/uploads';

// Generate presigned upload URL
const { url, key } = await uploads.createPresignedUpload({
  filename: 'document.pdf',
  contentType: 'application/pdf',
  maxSizeBytes: 10_000_000, // 10MB
  expiresIn: 3600, // 1 hour
});

// Generate signed download URL
const downloadUrl = await uploads.getSignedUrl(key, {
  expiresIn: 3600,
});

// Delete object
await uploads.delete(key);

// List objects with prefix
const objects = await uploads.list({ prefix: 'uploads/user-123/' });
```

#### Storage Conventions

- Object keys follow pattern: `{type}/{entity_id}/{uuid}/{filename}`
- Example: `uploads/user-abc123/018f6b2a-5c3d/document.pdf`
- Metadata stored in `uploads` table with foreign key references

---

## Package Structure

```
@tetrastack/backend/
├── src/
│   ├── database/
│   │   ├── schema/
│   │   │   ├── sqlite/
│   │   │   │   ├── auth.ts       # SQLite auth tables
│   │   │   │   ├── uploads.ts    # SQLite uploads table
│   │   │   │   └── index.ts
│   │   │   ├── postgres/
│   │   │   │   ├── auth.ts       # PostgreSQL auth tables
│   │   │   │   ├── uploads.ts    # PostgreSQL uploads table
│   │   │   │   └── index.ts
│   │   │   └── index.ts          # Dialect exports
│   │   └── index.ts              # Schema exports
│   ├── auth/
│   │   ├── config.ts             # Auth.js configuration with dual-mode
│   │   ├── providers.ts          # Default auth providers
│   │   └── index.ts              # Auth exports
│   ├── uploads/
│   │   ├── client.ts             # R2 S3 client setup
│   │   ├── actions.ts            # Upload server actions
│   │   └── index.ts              # Upload exports
│   ├── utils/
│   │   ├── uuidv7.ts             # UUIDv7 generation
│   │   ├── slugify.ts            # URL slug generation
│   │   └── index.ts              # Utility exports
│   └── index.ts                  # Main package exports
├── package.json
├── tsconfig.json
├── spec.md
├── auth.adoption.md              # Auth adoption guide
└── research.md                   # Architecture decisions
```

## Dependencies

- `drizzle-orm` - Database ORM
- `next-auth` - Authentication (Auth.js v5)
- `@aws-sdk/client-s3` - S3-compatible API for R2
- `@aws-sdk/s3-request-presigner` - Presigned URL generation
- `uuidv7` - UUIDv7 generation (or custom implementation)
- `concurrently` - Run multiple processes in development

---

## Development Environment

### Nix Flake Dev Shell

Development dependencies are managed via Nix flake for reproducible environments.

```nix
# flake.nix
{
  devShells.default = pkgs.mkShell {
    packages = with pkgs; [
      nodejs
      pnpm
      sqld  # libSQL server
    ];
  };
}
```

Enter the dev shell:

```bash
nix develop
```

### Running Services

Use `make up` to start all development services concurrently:

```makefile
# Makefile
up:
	pnpm concurrently \
		--names "db,next" \
		--prefix-colors "blue,green" \
		"sqld --db-path .data/local.db" \
		"pnpm dev"
```

This starts:

- **libSQL** - Local SQLite-compatible database server on default port
- **Next.js** - Development server with hot reload

### Database Configuration

```typescript
// Environment variables for local development
DATABASE_URL=http://127.0.0.1:8080  // libSQL HTTP endpoint
DATABASE_AUTH_TOKEN=                 // Optional for local dev
```

### libSQL

Using libSQL (Turso's SQLite fork) for local development:

- SQLite-compatible with server mode
- HTTP API for remote connections
- Seamless transition to Turso in production
- Data stored in `.data/local.db`

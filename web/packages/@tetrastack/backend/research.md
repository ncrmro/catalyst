# Architecture Research & Decisions

This document explains the architectural decisions and research behind @tetrastack/backend.

## Edge Runtime Requirements

### Problem

Edge runtimes (Cloudflare Workers, Vercel Edge) have constraints:

- No Node.js native modules
- No file system access
- Limited API surface
- Database drivers typically use native bindings (incompatible)

### Solution

Make database optional in `createAuth()`:

- When database provided: Full Node.js mode with DrizzleAdapter
- When database omitted: Edge-compatible mode (JWT verification only)

### Trade-offs

**Pros:**

- Works in both Node.js and edge runtimes
- Single API surface
- Type-safe configuration

**Cons:**

- Edge mode cannot create users or access database
- Two code paths to maintain

## UUIDv7 Design Decision

### Why UUIDv7?

Traditional ID strategies have limitations:

**Auto-increment integers:**

- Predictable (security concern)
- Sequential creates table locking in distributed systems
- Not globally unique
- Reveals record count

**UUIDv4:**

- Random → poor database index performance
- No temporal information
- Not sortable

**UUIDv7 Benefits:**

1. **Time-ordered**: First 48 bits are Unix timestamp (milliseconds)
2. **Index-friendly**: Monotonically increasing, no fragmentation
3. **Globally unique**: No coordination needed
4. **Embedded timestamp**: Creation time extractable from ID
5. **Standard format**: Compatible with existing UUID tooling

### Implementation

```typescript
// Works in both SQLite (as text) and PostgreSQL (as native uuid)
id: text('id')
  .primaryKey()
  .$defaultFn(() => uuidv7());
id: uuid('id')
  .primaryKey()
  .$defaultFn(() => uuidv7());
```

## Database Schema Separation

### Problem

Different databases have different optimal types:

- **SQLite**: No native UUID type, use TEXT
- **PostgreSQL**: Native UUID type with better performance and validation
- **Timestamps**: SQLite uses integer/text, PostgreSQL has proper timestamp

### Solution: Separate Schema Files

```
schema/
├── sqlite/
│   ├── auth.ts      # TEXT for UUIDs, integer timestamps
│   └── uploads.ts
├── postgres/
│   ├── auth.ts      # Native uuid, timestamp with timezone
│   └── uploads.ts
└── index.ts         # Export both dialects
```

### Why Not a Single Abstract Schema?

**Considered but rejected:**

- Runtime schema switching adds complexity
- Type inference breaks with dynamic schemas
- Can't tree-shake unused dialect
- Database-specific optimizations lost

**Current approach benefits:**

- Full type safety at compile time
- Database-specific optimizations (native types)
- Tree-shakeable (unused dialect excluded from bundle)
- Clear, explicit imports

## JWT-First Authentication

### Design Rationale

NextAuth v5 uses JWT sessions by default:

- Sessions stored in encrypted JWT token
- No database queries needed for session validation
- Stateless and scalable
- Works in edge runtime

### How It Enables Dual-Mode

**Node.js mode:**

- DrizzleAdapter stores user data in database
- JWT still used for session (not database sessions)
- `signIn` callback creates/fetches user, stores ID in JWT

**Edge mode:**

- No adapter (pure JWT)
- User info passed through from provider to JWT
- No database queries

## Next.js 16 proxy.js Pattern

### Background

Next.js 16 renames `middleware.js` to `proxy.js` to clarify purpose:

- "Middleware" implied Express-style middleware
- "Proxy" accurately describes network boundary behavior

### Key Changes

- File renamed: `middleware.ts` → `proxy.ts`
- Function renamed: `middleware()` → `proxy()` (default export)
- Runtime: Now Node.js by default (was Edge in earlier versions)

### Best Practices

```typescript
// src/proxy.ts
export default async function proxy(req: NextRequest) {
  // Keep it lightweight: routing, redirects, headers only
  // Avoid complex business logic
}
```

## Custom Providers Architecture

### Problem

Different projects need different auth providers:

- Some use only credentials
- Some add OAuth (GitHub, Google, etc.)
- Some use enterprise SSO

### Solution

`createAuth` accepts optional `providers` array:

```typescript
interface CreateAuthConfig {
  database?: DrizzleDB;
  providers?: Provider[];
}
```

**Default behavior:** Uses built-in credentials provider
**Custom behavior:** Replace or extend with provided array

### Benefits

- Flexible for different project needs
- Default works out of the box
- Full control when needed
- Type-safe provider configuration

## Security Considerations

### JWT Token Security

**Best practices implemented:**

- Short-lived tokens (configurable)
- Secure secret required (AUTH_SECRET)
- HTTPS only in production
- HttpOnly cookies

### Session Management Differences

**Node.js mode (database-backed):**

- Can revoke sessions via database
- Force logout all devices possible
- Session metadata stored

**Edge mode (JWT-only):**

- Cannot revoke tokens (valid until expiry)
- Logout only clears client cookie
- No session persistence

### Recommendation

For security-critical applications, use Node.js mode with database sessions for revocation capability.

## Performance Analysis

### Cold Start Times

| Mode    | Cold Start | Warm Request |
| ------- | ---------- | ------------ |
| Node.js | ~100-500ms | ~10-50ms     |
| Edge    | ~0-50ms    | ~5-20ms      |

### When Performance Matters

**Use Edge mode for:**

- Authentication-only checks
- High-traffic public pages
- Global low-latency requirements

**Use Node.js mode for:**

- User data operations
- Complex business logic
- Database interactions

## Future Considerations

### Potential Enhancements

1. **Multi-tenant support**: Per-tenant database connections
2. **Session analytics**: Track login patterns, devices
3. **Magic link auth**: Email-based passwordless login
4. **Passkeys/WebAuthn**: Modern passwordless authentication
5. **Rate limiting**: Built-in brute force protection

### Breaking Changes Avoided

Current architecture allows these additions without breaking existing users:

- Optional new configuration options
- New providers as separate imports
- Additional callbacks without changing existing ones

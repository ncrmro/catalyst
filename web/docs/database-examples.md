# Example: Using Drizzle with PostgreSQL in Catalyst

This document shows practical examples of using the database integration.

## Basic Usage

### Creating a User
```typescript
import { db, users } from '@/db';

export async function createUser(githubData: any) {
  const [user] = await db.insert(users).values({
    githubId: githubData.id.toString(),
    username: githubData.login,
    email: githubData.email,
    avatarUrl: githubData.avatar_url,
  }).returning();
  
  return user;
}
```

### Querying Users
```typescript
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';

export async function getUserByGithubId(githubId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId));
    
  return user;
}
```

### Creating a Repository
```typescript
import { db, repositories } from '@/db';

export async function createRepository(repoData: any, userId: string) {
  const [repo] = await db.insert(repositories).values({
    githubId: repoData.id.toString(),
    name: repoData.name,
    fullName: repoData.full_name,
    description: repoData.description,
    url: repoData.html_url,
    userId: userId,
  }).returning();
  
  return repo;
}
```

### Complex Queries with Joins
```typescript
import { db, users, repositories } from '@/db';
import { eq } from 'drizzle-orm';

export async function getUserWithRepositories(githubId: string) {
  const result = await db
    .select({
      user: users,
      repository: repositories,
    })
    .from(users)
    .leftJoin(repositories, eq(repositories.userId, users.id))
    .where(eq(users.githubId, githubId));
    
  return result;
}
```

## API Endpoint Examples

### User Management Endpoint
```typescript
// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { db, users } from '@/db';

export async function GET() {
  try {
    const allUsers = await db.select().from(users);
    return NextResponse.json(allUsers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [user] = await db.insert(users).values(body).returning();
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

## Development Workflow

1. **Start the database**:
   ```bash
   docker compose up -d db
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database URL
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Make schema changes**:
   - Edit `src/db/schema.ts`
   - Run `npm run db:generate`
   - Run `npm run db:migrate`

## Integration with GitHub OAuth

The database can now store user and repository data from GitHub OAuth flows:

```typescript
// In your GitHub OAuth callback
import { createUser, getUserByGithubId } from '@/lib/user-actions';

export async function handleGitHubCallback(githubUser: any) {
  // Check if user exists
  let user = await getUserByGithubId(githubUser.id.toString());
  
  if (!user) {
    // Create new user
    user = await createUser(githubUser);
  }
  
  return user;
}
```

This integration provides a solid foundation for building GitHub-related applications with persistent data storage.
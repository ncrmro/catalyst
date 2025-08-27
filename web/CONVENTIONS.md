# Development Conventions

This document outlines the development conventions and best practices for web applications following modern patterns. These conventions ensure consistency, maintainability, and testability across projects.

## File Organization

### Project Structure
Follow a clear, predictable directory structure:

```
src/
├── actions/         # Server actions (one file per resource)
├── app/            # Next.js App Router pages and layouts
├── components/     # Reusable UI components
├── lib/           # Utility functions and configurations
├── db/            # Database schema and configurations
└── middleware.ts  # Application middleware

__tests__/
├── e2e/           # End-to-end tests
├── integration/   # Integration tests
└── unit/          # Unit tests

docs/              # Project documentation
```

### Component Organization
```
src/components/
├── ui/            # Basic UI components (buttons, inputs, etc.)
├── forms/         # Form components
├── layout/        # Layout-related components
└── [feature]/     # Feature-specific components
```

## Server Actions

Server actions provide a structured approach to server-side logic that is maintainable and testable in isolation, following patterns reminiscent of Rails controllers.

### File Organization
- **Always in actions folder**: All server actions must be placed in `src/actions/`
- **One file per resource**: Follow Rails controller pattern - one file per logical resource (e.g., `projects.ts`, `reports.ts`, `auth.ts`)
- **Descriptive naming**: Use clear, resource-based names that indicate the domain they handle

```
src/actions/
├── auth.ts          # Authentication actions
├── projects.ts      # Project-related actions  
├── reports.ts       # Report generation and fetching
├── environments.ts  # Environment configuration
└── repos.ts         # Repository management
```

### Code Structure
Every server action file must start with the `'use server';` directive:

```typescript
'use server';

/**
 * Server actions for [resource description]
 */

export interface ResourceType {
  id: string;
  name: string;
  // ... other properties
}

/**
 * JSDoc description of what the function does
 */
export async function actionName(params: ParamType): Promise<ReturnType> {
  try {
    // Implementation logic
    return result;
  } catch (error) {
    console.error('Error description:', error);
    // Handle error appropriately
  }
}
```

### Rails Controller Parallels
Server actions follow Rails controller conventions for resource-based organization:

**Rails Controller:**
```ruby
class ArticlesController < ApplicationController
  def index    # GET /articles
  def show     # GET /articles/:id  
  def create   # POST /articles
  def update   # PATCH /articles/:id
  def destroy  # DELETE /articles/:id
end
```

**Server Actions:**
```typescript
// In src/actions/articles.ts
export async function fetchArticles()     // index
export async function fetchArticleById() // show  
export async function createArticle()    // create
export async function updateArticle()    // update
export async function deleteArticle()    // destroy
```

### Standard CRUD Operations
Use consistent naming for CRUD operations:
- `fetch[Resource]()` or `fetch[Resource]s()` - Read operations
- `create[Resource]()` - Create operations
- `update[Resource]()` - Update operations
- `delete[Resource]()` - Delete operations

## Testing Conventions

### Test Organization
```
__tests__/
├── unit/
│   ├── actions/     # Server action unit tests
│   ├── components/  # Component unit tests
│   └── lib/        # Utility function tests
├── integration/     # Integration tests
└── e2e/            # End-to-end tests
```

### Test File Naming
- Unit tests: `[module].test.ts`
- Integration tests: `[feature].integration.test.ts`
- E2E tests: `[feature].spec.ts`

### Server Action Testing
Design server actions to be testable in isolation:

```typescript
// __tests__/unit/actions/projects.test.ts
import { fetchProjects } from '../../../src/actions/projects';

describe('fetchProjects', () => {
  test('should return projects data', async () => {
    const result = await fetchProjects();
    
    expect(result).toHaveProperty('projects');
    expect(result).toHaveProperty('total_count');
  });
});
```

### Test Structure
```typescript
describe('Resource actions', () => {
  describe('fetchResource', () => {
    test('should return valid data structure', async () => {
      // Test implementation
    });
    
    test('should handle errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

## Component Conventions

### Component Structure
```typescript
interface ComponentProps {
  // Define props with TypeScript
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Component implementation
  
  return (
    <div>
      {/* JSX content */}
    </div>
  );
}
```

### Component Organization
- Use descriptive component names (PascalCase)
- Group related components in feature directories
- Export components from index files for clean imports
- Prefer functional components over class components

### Props and State
- Use TypeScript interfaces for props
- Destructure props in function parameters
- Use meaningful prop names
- Provide default values where appropriate

## TypeScript Conventions

### Type Definitions
- Use interfaces for object shapes
- Use types for unions, primitives, and computed types
- Export interfaces that are used across modules
- Use descriptive type names

```typescript
// Good
export interface UserProfile {
  id: string;
  email: string;
  name: string;
}

// Avoid
export interface IUser {
  // ...
}
```

### Import/Export Patterns
```typescript
// Named exports (preferred)
export function utilityFunction() { }
export const CONSTANT_VALUE = 'value';

// Default exports (for components and main modules)
export default function MainComponent() { }
```

## Error Handling

### Server Actions
Always include proper error handling with descriptive logging:

```typescript
export async function fetchData(): Promise<DataType> {
  try {
    // Implementation
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw new Error('Failed to fetch data');
  }
}
```

### Component Error Boundaries
Use error boundaries for component error handling:

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}
```

## Authentication and Authorization

### Protected Actions
For server actions that require authentication:

```typescript
import { auth } from '@/auth';

export async function protectedAction(): Promise<ResultType> {
  const session = await auth();
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  // Implementation with authenticated context
}
```

### Protected Routes
Use middleware for route protection:

```typescript
// src/middleware.ts
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

## Database Conventions

### Schema Organization
- Use descriptive table and column names
- Follow consistent naming patterns (snake_case for database, camelCase for TypeScript)
- Include proper indexes and constraints
- Use migrations for schema changes

### Query Patterns
```typescript
// Use typed database clients
import { db } from '@/db';

export async function fetchUserProjects(userId: string) {
  return await db.projects.findMany({
    where: {
      userId: userId,
    },
    include: {
      environments: true,
    },
  });
}
```

## Documentation

### Code Documentation
- Use JSDoc comments for public functions and complex logic
- Document parameters, return values, and side effects
- Include examples for complex functions

```typescript
/**
 * Fetches user projects with optional filtering
 * 
 * @param userId - The ID of the user
 * @param filters - Optional filtering criteria
 * @returns Promise resolving to user projects
 * 
 * @example
 * ```typescript
 * const projects = await fetchUserProjects('user-123', { status: 'active' });
 * ```
 */
export async function fetchUserProjects(
  userId: string, 
  filters?: ProjectFilters
): Promise<Project[]> {
  // Implementation
}
```

### README Structure
Each module or feature should include:
- Purpose and overview
- Installation/setup instructions
- Usage examples
- API documentation
- Contributing guidelines

## Performance Conventions

### Component Optimization
- Use React.memo for expensive components
- Implement proper key props for lists
- Lazy load components when appropriate
- Minimize re-renders with useMemo and useCallback

### Server Action Optimization
- Implement proper caching strategies
- Use database indexes for frequent queries
- Implement pagination for large datasets
- Handle loading and error states appropriately

## Security Conventions

### Input Validation
- Validate all user inputs
- Sanitize data before database operations
- Use type-safe validation libraries (e.g., Zod)

```typescript
import { z } from 'zod';

const ProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function createProject(formData: FormData) {
  const data = ProjectSchema.parse({
    name: formData.get('name'),
    description: formData.get('description'),
  });
  
  // Safe to use validated data
}
```

### Environment Variables
- Use typed environment variable validation
- Never commit secrets to version control
- Use different configurations for different environments

## Migration Guidelines

### From API Routes to Server Actions
When migrating from Next.js API routes:

**Before (API Route):**
```typescript
// pages/api/articles.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // GET logic
  }
}
```

**After (Server Actions):**
```typescript
// src/actions/articles.ts
'use server';

export async function fetchArticles() {
  // GET logic converted to server action
}
```

This approach provides better type safety, easier testing, and cleaner separation of concerns while maintaining familiar organizational patterns.
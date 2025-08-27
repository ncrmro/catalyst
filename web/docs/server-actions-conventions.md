# Server Actions Conventions

This document outlines the conventions and best practices for server actions in the Catalyst web application.

## Overview

Server actions in this project are organized in the `src/actions/` folder and follow patterns reminiscent of Rails controllers, providing a structured approach to server-side logic that is both maintainable and testable in isolation.

## File Organization

### Location
- **Always in actions folder**: All server actions must be placed in `src/actions/`
- **One file per resource**: Follow Rails controller pattern - one file per logical resource (e.g., `projects.ts`, `reports.ts`, `auth.ts`)
- **Descriptive naming**: Use clear, resource-based names that indicate the domain they handle

```
src/actions/
├── auth.ts          # Authentication actions
├── projects.ts      # Project-related actions  
├── reports.ts       # Report generation and fetching
├── environments.ts  # Environment configuration
├── kubernetes.ts    # Kubernetes operations
└── repos.ts         # Repository management
```

## Code Structure

### File Header
Every server action file must start with the `'use server';` directive:

```typescript
'use server';

/**
 * Server actions for [resource description]
 */
```

### TypeScript Interfaces
Define clear TypeScript interfaces for data structures at the top of the file:

```typescript
export interface Project {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  // ... other properties
}

export interface ProjectsData {
  projects: Project[];
  total_count: number;
}
```

### Function Structure
Follow this pattern for server action functions:

```typescript
/**
 * JSDoc description of what the function does
 */
export async function functionName(params: ParamType): Promise<ReturnType> {
  try {
    // Implementation logic
    return result;
  } catch (error) {
    console.error('Error description:', error);
    // Handle error appropriately
  }
}
```

## Rails Controller Parallels

Server actions in this project follow Rails controller conventions:

### Resource-Based Organization
Like Rails controllers (e.g., `ArticlesController`), each action file represents a resource:

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
When applicable, use consistent naming for CRUD operations:

- `fetch[Resource]()` or `fetch[Resource]s()` - Read operations (Rails `index`/`show`)
- `create[Resource]()` - Create operations (Rails `create`)
- `update[Resource]()` - Update operations (Rails `update`)
- `delete[Resource]()` - Delete operations (Rails `destroy`)

### Action Organization
Group related actions together in the same file, similar to how Rails groups actions in a controller:

```typescript
// Authentication actions (like Rails SessionsController)
export async function signIn()
export async function signOut() 
export async function refreshToken()

// Project actions (like Rails ProjectsController)
export async function fetchProjects()
export async function fetchProjectById()
export async function createProject()
export async function updateProject()
```

## Testing Conventions

### Testable in Isolation
Server actions are designed to be easily testable without complex setup:

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

### Test Organization
- **Unit tests**: Place in `__tests__/unit/actions/[resource].test.ts`
- **Mock external dependencies**: Use mocking for external APIs, databases, etc.
- **Test one behavior per test**: Each test should verify a single specific behavior
- **Descriptive test names**: Use clear descriptions of what is being tested

### Test Structure Example
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
  
  describe('createResource', () => {
    test('should create resource successfully', async () => {
      // Test creation
    });
  });
});
```

## Best Practices

### Error Handling
Always include proper error handling with descriptive logging:

```typescript
export async function fetchData(): Promise<DataType> {
  try {
    // Implementation
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    // Return fallback or throw with context
    throw new Error('Failed to fetch data');
  }
}
```

### Type Safety
- Use TypeScript interfaces for all data structures
- Export interfaces that might be used by other parts of the application
- Provide proper return type annotations for all functions

### Documentation
- Include JSDoc comments for all exported functions
- Document parameters and return types
- Explain any complex business logic or side effects

### Mock Data and Development
When using mock data for development:

```typescript
/**
 * Mock data for development and testing
 */
function getMockData(): DataType {
  return {
    // Mock implementation
  };
}

export async function fetchData(): Promise<DataType> {
  // Check if we should return mocked data
  const mocked = process.env.MOCKED;
  
  if (mocked === '1') {
    console.log('Returning mocked data');
    return getMockData();
  }
  
  // Real implementation
}
```

### Authentication and Authorization
For actions that require authentication:

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

## Example Implementation

Here's a complete example following these conventions:

```typescript
'use server';

/**
 * Server actions for article management
 */

import { db } from '@/db';
import { auth } from '@/auth';

export interface Article {
  id: string;
  title: string;
  body: string;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface ArticlesData {
  articles: Article[];
  total_count: number;
}

/**
 * Fetch all articles for the current user
 */
export async function fetchArticles(): Promise<ArticlesData> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Authentication required');
    }
    
    // Database query or external API call
    const articles = await db.articles.findMany({
      where: { authorId: session.userId }
    });
    
    return {
      articles,
      total_count: articles.length
    };
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw new Error('Failed to fetch articles');
  }
}

/**
 * Create a new article
 */
export async function createArticle(formData: FormData): Promise<Article> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Authentication required');
    }
    
    const title = formData.get('title') as string;
    const body = formData.get('body') as string;
    
    if (!title || !body) {
      throw new Error('Title and body are required');
    }
    
    const article = await db.articles.create({
      data: {
        title,
        body,
        authorId: session.userId
      }
    });
    
    return article;
  } catch (error) {
    console.error('Error creating article:', error);
    throw new Error('Failed to create article');
  }
}
```

## Migration from API Routes

When migrating from Next.js API routes to server actions, follow these guidelines:

### Before (API Route)
```typescript
// pages/api/articles.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // GET logic
  } else if (req.method === 'POST') {
    // POST logic
  }
}
```

### After (Server Actions)
```typescript
// src/actions/articles.ts
'use server';

export async function fetchArticles() {
  // GET logic
}

export async function createArticle(formData: FormData) {
  // POST logic
}
```

This approach provides better type safety, easier testing, and cleaner separation of concerns while maintaining the familiar Rails controller organization pattern.
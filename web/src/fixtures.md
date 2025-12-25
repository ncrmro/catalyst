# Fixtures

This directory provides centralized, validated fixtures for use across the application, including tests, Storybook stories, and production code.

## Overview

Fixtures are static data that can be reused across the application. Rather than duplicating data in multiple places, we centralize it here with Zod validation for type safety.

**Implementation Note**: While the original plan was to create separate JSON files in a `src/fixtures/` directory, we've implemented fixtures directly in `src/fixtures.ts` for the following reasons:

1. **Simpler imports**: Direct TypeScript import rather than JSON imports
2. **Better type inference**: TypeScript `as const` provides better literal types
3. **Single source of truth**: All fixtures in one file with validation
4. **Runtime validation**: Zod schemas validate data on module load

Future iterations can migrate to separate JSON files if needed (see "Migrating to JSON Files" section below).

## Current Fixtures

### `fixtures.ts`

Main fixtures file containing:

- **`ADJECTIVES`**: Array of adjectives for memorable name generation
- **`NOUNS`**: Array of nouns for memorable name generation  
- **`SYSTEM_NAMESPACES`**: Kubernetes system namespaces accessible to all users

All fixtures are validated with Zod schemas and exported with proper TypeScript types.

## Usage

### In Application Code

```typescript
import { ADJECTIVES, NOUNS, SYSTEM_NAMESPACES } from '@/fixtures';

// Use in name generation
const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];

// Check system namespaces
if (SYSTEM_NAMESPACES.includes(namespace)) {
  // Handle system namespace
}
```

### In Tests

```typescript
import { ADJECTIVES, NOUNS } from '@/fixtures';

describe('Name Generator', () => {
  it('should generate valid names', () => {
    expect(ADJECTIVES).toContain('purple');
    expect(NOUNS).toContain('elephant');
  });
});
```

### In Storybook

```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ADJECTIVES, NOUNS } from '@/fixtures';

export const WithRandomName: Story = {
  render: () => {
    const name = `${ADJECTIVES[0]}-${NOUNS[0]}-42`;
    return <Component name={name} />;
  },
};
```

## Adding New Fixtures

When adding new fixtures:

1. **Add data to `fixtures.ts`** with const assertion
2. **Create Zod schema** for validation
3. **Parse and export** the validated data
4. **Export types** derived from the data
5. **Document** the fixture in this README

Example:

```typescript
// In fixtures.ts

// 1. Add data
const statusesData = [
  "pending",
  "running",
  "completed",
  "failed"
] as const;

// 2. Create schema
const StatusesSchema = z.array(z.enum(["pending", "running", "completed", "failed"]));

// 3. Parse and export
export const STATUSES = StatusesSchema.parse(statusesData);

// 4. Export type
export type Status = typeof STATUSES[number];
```

## Migrating Existing Data

When you find static data arrays elsewhere in the codebase:

1. Move the data to `fixtures.ts`
2. Add Zod validation
3. Update imports in the original file
4. Run tests to ensure no regressions

## JSON Files

While we currently use TypeScript directly for fixtures (for ease of import and type safety), we can migrate to separate JSON files when needed:

```
fixtures/
  ├── adjectives.json
  ├── nouns.json
  ├── system-namespaces.json
  └── index.ts  (imports and validates JSON)
```

### Migrating to JSON Files

To migrate the current TypeScript-based fixtures to JSON files:

1. **Run the migration script**:
   ```bash
   node scripts/create-fixtures.js
   ```
   This creates `src/fixtures/` directory with JSON files and updated index.ts

2. **Update imports**: Change from `@/fixtures` to `@/fixtures/index`
   ```typescript
   // Before
   import { ADJECTIVES } from '@/fixtures';
   
   // After  
   import { ADJECTIVES } from '@/fixtures/index';
   // or with updated tsconfig path alias:
   import { ADJECTIVES } from '@/fixtures';
   ```

3. **Update `tsconfig.json`**: Ensure path alias points to the directory
   ```json
   {
     "paths": {
       "@/fixtures": ["./src/fixtures/index"]
     }
   }
   ```

The JSON-based approach provides:
- ✅ Separation of data from code
- ✅ Easier editing by non-developers
- ✅ Potential for dynamic loading
- ✅ Same type safety with Zod validation
- ✅ Compatible with both server and client components

### Current Approach Benefits

The current TypeScript-based approach (`src/fixtures.ts`) provides:
- ✅ Type safety with Zod validation
- ✅ Centralized data management
- ✅ Easy to import and use
- ✅ Compatible with both server and client components
- ✅ Validates at build time
- ✅ No need for JSON import configuration
- ✅ Better type inference with `as const`

Choose JSON files when:
- Non-developers need to edit fixture data
- You want to dynamically load fixtures
- You need to share fixtures with non-TypeScript tools

Choose TypeScript files when:
- Fixtures are only edited by developers
- You want simpler imports and better DX
- You want the strongest possible type inference

## Fixtures vs Factories

**Fixtures** (this directory) are for **static, immutable data**:
- Wordlists (adjectives, nouns)
- Configuration constants (system namespaces)
- Enum-like values
- Validated at compile time with Zod

**Factories** (`__tests__/factories/`) are for **dynamic test data**:
- Database records with relationships
- Generated with Faker for realistic values
- Can be persisted to test database
- Used in unit and integration tests

Both can be used in Storybook, but fixtures are simpler for static data while factories are better for complex object graphs.

## Storybook Integration

For Storybook stories that need database data, fixtures can be used directly since they're validated static data. For dynamic database queries in stories, consider:

1. Using the factory pattern from `__tests__/factories`
2. Mocking database calls in `.storybook/preview.ts`
3. Creating scenario fixtures in `__tests__/fixtures/`

See `__tests__/fixtures/environment-scenarios.ts` for examples of complex scenario fixtures.

## Database Mocking for Storybook

Currently, Storybook stories do not directly import from the database. If future stories need database access:

1. **Option 1**: Use factories to build mock data objects (no DB)
2. **Option 2**: Add global DB mock in `.storybook/preview.ts`
3. **Option 3**: Create pre-built scenario fixtures

Most stories should work with option 1 (factories building plain objects without persistence).

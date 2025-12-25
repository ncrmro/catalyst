# Fixtures

This directory contains JSON fixtures for database seeding and testing. All fixtures are validated against Zod schemas generated from the Drizzle database schema.

## Structure

- `repos-fixtures.json` - Repository data (catalyst, meze)
- `projects-fixtures.json` - Project data (Catalyst, Meze)
- `users-fixtures.json` - Default user data (regular user, admin)
- `fixtures.ts` - TypeScript module that exports fixtures with type safety and validation

## Usage

### In Seed Scripts

The fixtures are automatically used by `src/lib/seed.ts`:

```typescript
import { reposFixtures, projectsFixtures, usersFixtures } from "@/lib/fixtures";

// Use in seed functions
const [catalystRepo, mezeRepo] = reposFixtures;
```

### In Storybook

Import fixtures directly in your stories:

```typescript
import { reposFixtures, projectsFixtures } from "@/lib/fixtures";

export const Default: Story = {
  args: {
    repo: reposFixtures[0],
  },
};
```

### In Tests

```typescript
import { reposFixtures, projectsFixtures, usersFixtures } from "@/lib/fixtures";

test("creates user from fixture", () => {
  const userData = usersFixtures[0];
  // ... test code
});
```

## Validation

All fixtures are validated on import using Zod schemas that match the database schema. If validation fails, an error will be thrown at import time.

To manually validate:

```typescript
import { validateFixtures } from "@/lib/fixtures";

validateFixtures(); // throws if validation fails
```

## Schemas

The Zod schemas are defined in `fixtures.ts` and mirror the Drizzle schema structure from `src/db/schema.ts`:

- `repoFixtureSchema` - Validates repository data
- `projectFixtureSchema` - Validates project data
- `userFixtureSchema` - Validates user data

## Adding New Fixtures

1. Add JSON data to the appropriate `*-fixtures.json` file
2. Define a Zod schema in `fixtures.ts` if it's a new type
3. Export the fixture and its type
4. Update this README

## Type Safety

All fixtures are fully typed using TypeScript and Zod:

```typescript
import type { RepoFixture, ProjectFixture, UserFixture } from "@/lib/fixtures";
```

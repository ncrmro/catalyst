# Quick Reference: Using Fixtures

## Import Fixtures

```typescript
import { 
  reposFixtures, 
  projectsFixtures, 
  usersFixtures,
  type RepoFixture,
  type ProjectFixture,
  type UserFixture
} from "@/lib/fixtures";
```

## Access Individual Fixtures

```typescript
// Repositories
const catalystRepo = reposFixtures[0];  // ncrmro/catalyst
const mezeRepo = reposFixtures[1];      // ncrmro/meze

// Projects
const catalystProject = projectsFixtures[0];  // Catalyst
const mezeProject = projectsFixtures[1];      // Meze

// Users
const regularUser = usersFixtures[0];  // bob@alice.com
const adminUser = usersFixtures[1];    // admin@example.com
```

## Use in Storybook

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { reposFixtures } from "@/lib/fixtures";

export const Default: Story = {
  args: {
    repo: reposFixtures[0],
  },
};
```

## Use in Tests

```typescript
import { usersFixtures } from "@/lib/fixtures";

test("creates user", () => {
  const user = usersFixtures[0];
  expect(user.email).toBe("bob@alice.com");
});
```

## Use in Seed Scripts

```typescript
import { reposFixtures } from "@/lib/fixtures";

const [catalystRepo, mezeRepo] = reposFixtures;

await db.insert(repos).values({
  ...catalystRepo,
  teamId: "team-123",
});
```

## Validate Fixtures

```typescript
import { validateFixtures } from "@/lib/fixtures";

// Throws if validation fails
validateFixtures();
```

## Fixture Data Structure

### Repository Fixture
```json
{
  "githubId": 756437234,
  "name": "catalyst",
  "fullName": "ncrmro/catalyst",
  "description": "Platform for managing deployments and infrastructure",
  "url": "https://github.com/ncrmro/catalyst",
  "isPrivate": false,
  "language": "TypeScript",
  "ownerLogin": "ncrmro",
  "ownerType": "User",
  "ownerAvatarUrl": "https://avatars.githubusercontent.com/u/8276365?v=4"
}
```

### Project Fixture
```json
{
  "name": "Catalyst",
  "fullName": "ncrmro/catalyst",
  "description": "Platform for managing deployments and infrastructure",
  "ownerLogin": "ncrmro",
  "ownerType": "User",
  "ownerAvatarUrl": "https://avatars.githubusercontent.com/u/8276365?v=4"
}
```

### User Fixture
```json
{
  "email": "bob@alice.com",
  "name": "Bob Alice",
  "admin": false,
  "image": "https://avatars.githubusercontent.com/u/67470890?s=200&v=4"
}
```

## Files

- `src/lib/repos-fixtures.json` - Repository data
- `src/lib/projects-fixtures.json` - Project data
- `src/lib/users-fixtures.json` - User data
- `src/lib/fixtures.ts` - TypeScript module with validation

## See Also

- `src/lib/fixtures-README.md` - Full documentation
- `FIXTURES_IMPLEMENTATION.md` - Implementation details
- `FIXTURES_TESTING.md` - Testing checklist
- `src/components/fixture-usage-example.stories.tsx` - Example usage

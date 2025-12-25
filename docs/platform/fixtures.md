# Fixtures Guide

## Overview

The `fixtures` directory contains static, realistic sample data used primarily for presentation and development purposes. Fixtures provide consistent, hand-crafted data that makes components look good in Storybook and helps developers understand the expected data shape.

**Location**: `web/src/fixtures/`

**Purpose**:

- Provide realistic data for Storybook stories
- Support simple unit tests that don't need database interaction
- Enable mock server actions for component development
- Serve as documentation of data structures

## When to Use Fixtures

| Context               | Usage                        | Notes                                                                    |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| **Storybook Stories** | Always                       | Fixtures provide consistent, visually appealing data for component demos |
| **Unit Tests**        | When factories aren't needed | Use for simple component tests without database interaction              |
| **Integration Tests** | Sparingly                    | Prefer factories for database-backed tests with dynamic variations       |
| **Development**       | Always                       | Mock server actions using fixtures for rapid component iteration         |

### Decision Table: Fixtures vs Factories

| Need                        | Use Fixtures | Use Factories (Fishery) |
| --------------------------- | ------------ | ----------------------- |
| Static demo data for UI     | ✅           | ❌                      |
| Component stories           | ✅           | ❌                      |
| Database seeding            | ❌           | ✅                      |
| Dynamic test variations     | ❌           | ✅                      |
| Trait-based generation      | ❌           | ✅                      |
| Testing edge cases          | ❌           | ✅                      |
| Realistic presentation data | ✅           | ❌                      |
| Simple component tests      | ✅           | ❌                      |

### Rule of Thumb

**Use fixtures** for the presentation layer (Storybook stories, simple component tests, mock actions).

**Use factories** when you need database records, dynamic variations, or complex test scenarios.

## Fixture Structure

```
web/src/fixtures/
├── index.ts              # Exports all fixtures
├── users.ts              # User fixture data
├── teams.ts              # Team fixture data
├── projects.ts           # Project fixture data
├── repositories.ts       # Repository fixture data
├── environments.ts       # Environment fixture data
├── preview-pods.ts       # Preview environment fixture data
└── clusters.ts           # Cluster fixture data
```

Each fixture file exports:

- Individual fixtures (e.g., `userJohn`, `userJane`)
- Array of all fixtures (e.g., `users`)
- Helper functions if needed

## Usage Examples

### 1. Storybook Stories

Fixtures are the primary data source for Storybook stories:

```tsx
// components/UserCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { UserCard } from "./UserCard";
import { userJohn, userJane } from "@/fixtures/users";

const meta: Meta<typeof UserCard> = {
  title: "Components/UserCard",
  component: UserCard,
};

export default meta;
type Story = StoryObj<typeof UserCard>;

export const Default: Story = {
  args: {
    user: userJohn,
  },
};

export const WithAvatar: Story = {
  args: {
    user: userJane,
  },
};
```

### 2. Simple Component Tests

For unit tests that don't require database interaction:

```tsx
// __tests__/unit/components/UserCard.test.tsx
import { render, screen } from "@testing-library/react";
import { UserCard } from "@/components/UserCard";
import { userJohn } from "@/fixtures/users";

describe("UserCard", () => {
  it("displays user name and email", () => {
    render(<UserCard user={userJohn} />);

    expect(screen.getByText(userJohn.name)).toBeInTheDocument();
    expect(screen.getByText(userJohn.email)).toBeInTheDocument();
  });
});
```

### 3. Mock Server Actions

Create mock versions of server actions for component development:

```tsx
// app/users/[id]/page.tsx
import { getUserAction } from "@/actions/users";

// For development/Storybook
const mockGetUserAction = async (id: string) => {
  "use server";
  const { userJohn, userJane } = await import("@/fixtures/users");
  return id === "1" ? userJohn : userJane;
};

// Use real or mock based on environment
const getUser = process.env.STORYBOOK ? mockGetUserAction : getUserAction;

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id);
  return <UserCard user={user} />;
}
```

### 4. Integration Tests (Sparingly)

Use fixtures for setup data, but prefer factories for test-specific scenarios:

```tsx
// __tests__/integration/users.test.tsx
import { render, screen } from "@testing-library/react";
import { UserList } from "@/components/UserList";
import { users } from "@/fixtures/users";

describe("UserList", () => {
  it("renders list of users", () => {
    render(<UserList users={users} />);

    expect(screen.getByText(users[0].name)).toBeInTheDocument();
    expect(screen.getByText(users[1].name)).toBeInTheDocument();
  });
});

// But prefer factories for dynamic scenarios:
import { userFactory } from "@/__tests__/factories/user";

it("handles users with long names", async () => {
  const longNameUser = await userFactory.create({
    name: "A".repeat(100),
  });

  render(<UserCard user={longNameUser} />);
  // Test truncation behavior
});
```

## Fixture Structure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Fixtures Layer                         │
│                    (Static Sample Data)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Imported by
                              ▼
         ┌────────────────────────────────────────┐
         │                                        │
    ┌────▼─────┐          ┌──────────┐     ┌────▼─────┐
    │ Storybook│          │   Unit   │     │   Mock   │
    │ Stories  │          │  Tests   │     │ Actions  │
    └──────────┘          └──────────┘     └──────────┘
         │                     │                 │
         │                     │                 │
         ▼                     ▼                 ▼
    Component            Component          Component
     Demos              Testing            Development
```

## How to Add New Fixtures

### 1. Create a new fixture file

```tsx
// web/src/fixtures/deployments.ts
import type { Deployment } from "@/db/schema";

export const deploymentStaging: Deployment = {
  id: "deploy-1",
  projectId: "proj-1",
  environment: "staging",
  status: "running",
  url: "https://staging.example.com",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T10:05:00Z"),
};

export const deploymentProduction: Deployment = {
  id: "deploy-2",
  projectId: "proj-1",
  environment: "production",
  status: "running",
  url: "https://example.com",
  createdAt: new Date("2024-01-10T14:00:00Z"),
  updatedAt: new Date("2024-01-10T14:10:00Z"),
};

export const deployments: Deployment[] = [
  deploymentStaging,
  deploymentProduction,
];
```

### 2. Export from index.ts

```tsx
// web/src/fixtures/index.ts
export * from "./users";
export * from "./teams";
export * from "./projects";
export * from "./deployments"; // Add new export
```

### 3. Use in stories

```tsx
// components/DeploymentCard.stories.tsx
import {
  deploymentStaging,
  deploymentProduction,
} from "@/fixtures/deployments";

export const Staging: Story = {
  args: {
    deployment: deploymentStaging,
  },
};

export const Production: Story = {
  args: {
    deployment: deploymentProduction,
  },
};
```

## Best Practices

### DO

- ✅ Use realistic, production-like data
- ✅ Include edge cases (long names, special characters, etc.)
- ✅ Maintain consistency across related fixtures (foreign keys)
- ✅ Use TypeScript types from your schema
- ✅ Document unusual or complex fixtures
- ✅ Keep fixtures focused and minimal
- ✅ Use fixtures for visual testing in Storybook

### DON'T

- ❌ Generate random data in fixtures (use factories instead)
- ❌ Include sensitive or real user data
- ❌ Create hundreds of fixtures (quality over quantity)
- ❌ Duplicate factory logic in fixtures
- ❌ Use fixtures for complex test scenarios (use factories)
- ❌ Make fixtures dependent on database state
- ❌ Include implementation details in fixtures

## Fixtures vs Factories: Detailed Comparison

### Fixtures Example

```tsx
// Static, hand-crafted data
export const userJohn = {
  id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  role: "admin",
};
```

**Characteristics**:

- Manually created
- Fixed values
- Ideal for demos
- Visually appealing
- Easy to reason about

### Factory Example

```tsx
// Dynamic, generated data
import { userFactory } from "@/__tests__/factories/user";

const admin = await userFactory.create({ role: "admin" });
const member = await userFactory.create({ role: "member" });
const usersWithLongNames = await userFactory.createList(5, {
  name: () => faker.lorem.words(10),
});
```

**Characteristics**:

- Programmatically generated
- Dynamic values
- Database-backed
- Trait support
- Complex variations

## Common Patterns

### Pattern 1: Base Fixtures with Variations

```tsx
// fixtures/projects.ts
const baseProject = {
  teamId: "team-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const projectCatalyst = {
  ...baseProject,
  id: "proj-1",
  name: "Catalyst",
  description: "Development platform",
  status: "active",
};

export const projectArchived = {
  ...baseProject,
  id: "proj-2",
  name: "Old Project",
  description: "Archived project",
  status: "archived",
};
```

### Pattern 2: Related Fixtures

```tsx
// fixtures/teams.ts
export const teamCatalyst = {
  id: "team-1",
  name: "Catalyst Team",
  slug: "catalyst",
};

// fixtures/projects.ts
import { teamCatalyst } from "./teams";

export const projectCatalyst = {
  id: "proj-1",
  teamId: teamCatalyst.id, // Reference related fixture
  name: "Catalyst",
};
```

### Pattern 3: Fixture Helpers

```tsx
// fixtures/users.ts
export const getFixtureUserById = (id: string) => {
  return users.find((u) => u.id === id);
};

export const getFixtureUsersByRole = (role: string) => {
  return users.filter((u) => u.role === role);
};
```

## Integration with Testing Patterns

See also:

- `web/__tests__/README.md` - Testing architecture overview
- `web/__tests__/factories/README.md` - Factory patterns for dynamic test data
- `web/src/actions/README.md` - Mock actions using fixtures

## Migration Guide

### Moving from Inline Data to Fixtures

**Before:**

```tsx
export const Default: Story = {
  args: {
    user: {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
    },
  },
};
```

**After:**

```tsx
import { userJohn } from "@/fixtures/users";

export const Default: Story = {
  args: {
    user: userJohn,
  },
};
```

### Moving from Fixtures to Factories

**When fixture limitations are hit (need database, variations, traits):**

```tsx
// Before: Using fixtures
import { projectCatalyst } from "@/fixtures/projects";

it("creates deployment", () => {
  // Can't actually create in DB with fixtures
  expect(projectCatalyst).toBeDefined();
});

// After: Using factories
import { projectFactory } from "@/__tests__/factories/project";

it("creates deployment", async () => {
  const project = await projectFactory.create();
  const deployment = await createDeployment(project.id);

  expect(deployment).toBeDefined();
  expect(deployment.projectId).toBe(project.id);
});
```

## FAQ

### Q: When should I create a new fixture vs use a factory?

**A**: If you're writing a Storybook story or need simple demo data, use a fixture. If you need database records or dynamic variations, use a factory.

### Q: Can I use fixtures in integration tests?

**A**: Yes, but sparingly. Fixtures work well for expected output comparisons, but factories are better for test setup that requires database interaction.

### Q: Should fixtures match production data exactly?

**A**: Fixtures should be realistic but don't need to match production exactly. They should represent typical data patterns and include interesting edge cases for visual testing.

### Q: How many fixtures should I create?

**A**: Create enough to cover common scenarios and edge cases in Storybook, but avoid creating hundreds. Quality and realism matter more than quantity.

### Q: Can fixtures reference each other?

**A**: Yes, fixtures can reference related fixtures using IDs. This helps maintain referential integrity in your demo data.

### Q: Should I commit fixtures to git?

**A**: Yes, fixtures should be committed to git. They're part of your application's presentation layer and documentation.

## Related Documentation

- [Testing Architecture](../../web/__tests__/README.md)
- [Factory Patterns](../../web/__tests__/factories/README.md)
- [Actions Layer](../../web/src/actions/README.md)
- [Database Schema](../../web/src/db/README.md)

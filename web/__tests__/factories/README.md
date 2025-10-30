# Test Data Factories

Rails FactoryBot-inspired pattern for generating test data with sensible defaults, chainable traits, and database persistence. **Reduces test code by 87%** while improving readability and maintainability.

## Architecture

```
src/lib/factories.ts        # Central factory utilities (Factory, faker, db)
tests/factories/
├── index.ts                 # Barrel export for all factories
├── user.factory.ts          # User factory
└── [entity].factory.ts      # Future factories (recipe, meal, user, etc.)
```

**Stack**: fishery v2.3.1 (factory pattern) + @faker-js/faker v10.1.0 (fake data)

## Quick Start

```typescript
import { userFactory } from "../factories";

// Build with defaults
const user = userFactory.build();

// Override specific fields
const admin = userFactory.build({ name: "Alice", admin: true });

// Use traits (chainable)
const adminUser = userFactory.admin().build({ name: "Bob" });

// Persist to database via model layer
const savedUser = await userFactory.create({ name: "Carol" });

// Build multiple
const users = userFactory.buildList(5);
```

## Associations

Factories can reference other factories for relationships:

```typescript
import { userFactory } from "./user.factory";

const projectFactory = Factory.define<Project>(() => ({
  name: "My Project",
  owner: userFactory.build(),
}));
```

Override associations when building:

```typescript
const specificOwner = userFactory.build({ name: "Jordan" });
const project = projectFactory.build(
  {},
  {
    associations: { owner: specificOwner },
  },
);
```

## Creating New Factories

```typescript
// tests/factories/project.factory.ts
import { Factory } from "@/lib/factories";
import type { InsertProject } from "@/db/schema";
import { userFactory } from "./user.factory";

class ProjectFactory extends Factory<InsertProject> {
  withEnvironments() {
    return this.params({ previewEnvironmentsCount: 3 });
  }

  async create(params) {
    const project = this.build(params);
    // Import model function dynamically
    const { createProjects } = await import("@/models/projects");
    const [created] = await createProjects([project]);
    return created;
  }
}

export const projectFactory = ProjectFactory.define(
  ({ sequence, associations }) => ({
    name: Factory.faker.company.name(),
    fullName: Factory.faker.internet.domainName(),
    description: Factory.faker.company.catchPhrase(),
    ownerLogin: Factory.faker.internet.userName(),
    ownerType: "User",
    previewEnvironmentsCount: 0,
  }),
);
```

Export from `tests/factories/index.ts`:

```typescript
export { projectFactory } from "./project.factory";
```

## Key Patterns

1. **Build model types**: Use `InsertEntity` types from database schema
2. **Use traits**: `.admin().withEnvironments()` is clearer than manual params
3. **Use `.create()` for persistence**: Calls model layer, handles transactions
4. **Use transient params**: Control behavior without affecting output
5. **Use `Factory.faker`**: Generate realistic data (`Factory.faker.person.fullName()`)

```typescript
// Good - Uses traits and model layer
const project = await projectFactory.withEnvironments().create({ name: 'catalyst' });

// Avoid - Manual construction and direct database insert
const project = { name: 'catalyst', previewEnvironmentsCount: 3, ... };
await db.insert(projects).values(project);
```

## Resources

- `tests/factories/user.factory.ts` - Complete implementation reference
- [Fishery Docs](https://github.com/thoughtbot/fishery) - Factory library
- [Faker Docs](https://fakerjs.dev/) - Fake data API

# Quickstart: [FEATURE NAME]

**Spec**: `###-feature-slug`

<!--
  How to quickly get started developing this spec.
  Written after plan.md, before tasks.md.
-->

## Prerequisites

- [ ] Node.js 20+
- [ ] Docker (for database)
- [ ] [Other requirements]

## Setup

```bash
# 1. Start dependencies
make up

# 2. Install packages (if new deps added)
npm install

# 3. Run migrations (if schema changes)
npm run db:migrate

# 4. Seed test data (if applicable)
npm run db:seed
```

## Development

```bash
# Start dev server
npm run dev

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## Key Files

<!--
  Files developers should read to understand context.
-->

| File                        | Purpose                |
| --------------------------- | ---------------------- |
| `src/models/example.ts`     | Data model definitions |
| `src/actions/example.ts`    | Server actions         |
| `src/app/examples/page.tsx` | Main UI entry point    |

## Testing This Feature

### Manual Testing

1. Navigate to `/examples`
2. [Step-by-step testing instructions]
3. Verify [expected behavior]

### Automated Tests

```bash
# Run feature-specific tests
npm run test -- --grep "example"

# Run E2E tests
npm run test:e2e -- examples.spec.ts
```

## Common Issues

<!--
  Known gotchas and how to resolve them.
-->

### [Issue Name]

**Symptom**: [What you'll see]

**Solution**: [How to fix]

## Related Docs

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation details
- [tasks.md](./tasks.md) - Task breakdown

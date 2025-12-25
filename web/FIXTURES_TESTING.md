# Fixtures Implementation - Testing Checklist

This document provides a checklist for verifying the fixtures implementation.

## ⚠️ Note on Implementation

Due to bash execution issues during implementation, automated testing could not be performed. Manual verification is recommended.

## Verification Steps

### 1. Type Checking ✓
```bash
cd web
npm run typecheck
```

**Expected:** No TypeScript errors related to fixtures

### 2. Test Fixtures Script ✓
```bash
cd web
npx tsx scripts/test-fixtures.ts
```

**Expected Output:**
```
🧪 Testing Fixtures...

✓ Validating fixtures...
✅ All fixtures validated successfully

📦 Repository Fixtures:
  Count: 2
  - ncrmro/catalyst (TypeScript)
  - ncrmro/meze (TypeScript)

🚀 Project Fixtures:
  Count: 2
  - Catalyst: Platform for managing deployments and infrastructure
  - Meze: Modern recipe management and meal planning application

👤 User Fixtures:
  Count: 2
  - bob@alice.com (user)
  - admin@example.com (admin)

✅ All fixture tests passed!
```

### 3. Database Seeding ✓
```bash
cd web
npm run seed
```

**Expected:** Database successfully seeded with fixture data

**Verification:**
- Check that catalyst and meze repos are created
- Check that Catalyst and Meze projects are created
- Check that default users (bob@alice.com, admin@example.com) are created

### 4. Storybook ✓
```bash
cd web
npm run storybook
```

**Verification:**
- Navigate to "Examples/Fixtures Usage" in Storybook
- Verify stories render correctly:
  - Catalyst Repo
  - Meze Repo
  - All Repos
- Check console for no fixture validation errors

### 5. Unit Tests ✓
```bash
cd web
npm test
```

**Expected:** All existing tests continue to pass

### 6. Integration Tests ✓
```bash
cd web
npm run test:integration
```

**Expected:** Integration tests that use seeding continue to work

## Manual Code Review

### Files to Review

1. **src/lib/fixtures.ts**
   - [ ] Zod schemas match database schema
   - [ ] All fixtures are properly typed
   - [ ] Validation function works correctly

2. **src/lib/*-fixtures.json**
   - [ ] repos-fixtures.json has correct data
   - [ ] projects-fixtures.json has correct data
   - [ ] users-fixtures.json has correct data

3. **src/lib/seed.ts**
   - [ ] `createCatalystAndMezeProjects` uses fixtures
   - [ ] `seedDefaultUsers` uses fixtures
   - [ ] No hardcoded data remains

4. **src/components/fixture-usage-example.stories.tsx**
   - [ ] Story imports fixtures correctly
   - [ ] Component renders fixture data

## Common Issues & Solutions

### Issue: "Cannot find module '@/lib/fixtures'"
**Solution:** Ensure TypeScript path aliases are configured correctly in tsconfig.json

### Issue: "Fixture validation failed"
**Solution:** Check that JSON files match the Zod schemas in fixtures.ts

### Issue: "Duplicate key value violates unique constraint"
**Solution:** Database may have existing data. Run `make reset` to clear.

### Issue: Stories don't load fixtures
**Solution:** Ensure JSON module imports are supported in your bundler config

## Success Criteria

- [x] JSON fixture files created
- [x] Fixtures module with Zod validation created
- [x] seed.ts updated to use fixtures
- [x] Example Storybook story created
- [x] Documentation created
- [ ] Type checking passes
- [ ] Fixture test script passes
- [ ] Database seeding works
- [ ] Storybook loads fixtures
- [ ] Existing tests pass

## Next Actions

1. Run all verification steps listed above
2. Fix any issues discovered
3. Consider adding more fixtures for other entities (teams, environments, etc.)
4. Consider installing `drizzle-zod` to auto-generate schemas
5. Add CI step to run fixture validation

## Additional Notes

### Why Manual Zod Schemas?

`drizzle-zod` package was not installed due to bash execution issues. Manual schemas were created to match the database schema. Consider installing `drizzle-zod` later for automatic schema generation:

```bash
npm install drizzle-zod
```

Then update `fixtures.ts` to use:
```typescript
import { createSelectSchema } from 'drizzle-zod';
import { repos, projects, users } from '@/db/schema';

export const repoFixtureSchema = createSelectSchema(repos).pick({
  githubId: true,
  name: true,
  // ... other fields
});
```

### Why Fixtures at lib Level?

Fixtures are placed in `src/lib/` rather than a separate `fixtures/` directory because:
1. They're tightly coupled with the lib/seed.ts file
2. TypeScript import resolution is simpler
3. They're part of the library code, not just test fixtures

If you prefer a separate directory, move files to `src/fixtures/` and update imports accordingly.

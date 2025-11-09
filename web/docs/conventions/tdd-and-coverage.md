# TDD and Coverage

## Overview

Test coverage tracking ensures code quality by measuring which parts of the codebase are tested. Coverage is collected separately for unit and integration tests, both locally and in CI.

## Tools

- **Vitest** - Test runner for unit/integration tests
- **@vitest/coverage-v8** - Coverage provider using V8's built-in coverage
- **Playwright** - E2E testing (coverage collection not yet implemented)
- **vitest-coverage-report-action** - GitHub Action for PR coverage reports

## Local Development

### Running Coverage

```bash
# Generate coverage report for all tests
make coverage

# Run specific test suites with coverage
npm run test:unit -- --coverage
npm run test:integration -- --coverage
npm run test:components -- --coverage
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/index.html` - Interactive HTML report
- `coverage/coverage-summary.json` - Summary statistics
- `coverage/coverage-final.json` - Detailed coverage data
- `coverage/lcov.info` - LCOV format for external tools

### Coverage Thresholds

Thresholds are configured in `vitest.config.ts`:

```typescript
thresholds: {
  lines: 20,
  functions: 40,
  branches: 60,
  statements: 20,
  autoUpdate: true,
}
```

**Auto-update behavior**: When `autoUpdate: true`, Vitest automatically updates threshold values in the config file when coverage _exceeds_ them. This prevents coverage from regressing but doesn't lower thresholds when coverage drops.

### Updating Thresholds

1. Run coverage: `make coverage`
2. If tests fail due to coverage below thresholds, either:
   - Write more tests to increase coverage
   - Manually lower thresholds in `vitest.config.ts` to current levels
3. Commit updated `vitest.config.ts` if thresholds changed

## GitHub Actions

### Workflow: `.github/workflows/web.tests.yml`

Coverage is collected in three separate jobs:

1. **quick** - Runs unit tests with coverage
2. **integration-tests** - Runs integration tests with coverage
3. **coverage-report** - Downloads artifacts and posts PR comments

### Coverage Collection

Each test job:

1. Runs tests with `--coverage` flag
2. Uploads `coverage/` directory as artifact
3. Artifacts are retained for 1 day

### PR Coverage Reports

The `coverage-report` job:

1. Depends on `quick` and `integration-tests` completing
2. Downloads coverage artifacts to separate directories
3. Uses `davelosert/vitest-coverage-report-action@v2` to post PR comments
4. Generates separate reports for unit and integration tests
5. Only runs on non-draft PRs

## Coverage Configuration

### Included Files

All TypeScript/JavaScript files in `src/**/*.{js,ts,tsx}` are included.

### Excluded Files

- `node_modules/`
- `tests/` directory
- Test files (`*.test.{js,ts,tsx}`, `*.spec.{js,ts,tsx}`)
- Build outputs (`dist/`, `.next/`)
- Config files (`vitest.config.ts`, `next.config.ts`, etc.)
- Scripts (`scripts/`)
- CI configs (`.github/`)

See `vitest.config.ts` for full exclusion list.

## Future Work

- **E2E Coverage**: Playwright tests don't currently contribute to coverage
  - Requires instrumenting Next.js app with Istanbul/NYC
  - Needs Playwright coverage API or plugin
  - Must merge with Vitest coverage reports
  - See TODO comments in `.github/workflows/web.tests.yml`

## Best Practices

1. **Keep thresholds realistic** - Set to current coverage levels, let auto-update raise them
2. **Review coverage reports** - Check HTML report to find untested code paths
3. **Don't chase 100%** - Focus on testing critical paths and business logic
4. **Separate coverage by test type** - Unit and integration coverage provide different insights
5. **Commit threshold updates** - Include `vitest.config.ts` changes in PRs when auto-update triggers

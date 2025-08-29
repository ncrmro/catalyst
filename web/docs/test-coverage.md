# Test Coverage Guide

This document explains the comprehensive test coverage setup for the Catalyst web application using Istanbul with Jest and Playwright.

## Overview

The test coverage system collects code coverage from multiple test types:
- **Unit Tests**: Function-level tests with mocking (Jest + Istanbul)
- **Integration Tests**: API and service integration tests (Jest + Istanbul) 
- **Component Tests**: React component tests (Jest + Istanbul)
- **End-to-End Tests**: Full application flow tests (Playwright)

## Coverage Tools

### Jest with Istanbul
- **Tool**: Jest uses Istanbul under the hood for code coverage
- **Configuration**: `jest.config.js` and `.nycrc.json`
- **Output**: HTML reports, LCOV, JSON, and text summaries
- **Thresholds**: Configurable minimum coverage requirements

### Playwright Coverage
- **Tool**: Playwright with V8 coverage collection
- **Configuration**: `playwright.config.ts`
- **Output**: HTML test reports with coverage data
- **Integration**: Coverage data merged with Jest reports

## Running Coverage

### Individual Test Types
```bash
# Unit tests with coverage
npm run test:coverage:unit

# Integration tests with coverage  
npm run test:coverage:integration

# Component tests with coverage
npm run test:coverage:components

# E2E tests with coverage
npm run test:e2e:coverage
```

### Combined Coverage Report
```bash
# Generate complete coverage report (all test types)
npm run coverage:report

# Or run comprehensive CI with coverage
make ci-coverage
```

### Development Workflow
```bash
# Watch mode for unit tests with coverage
npm run test:watch

# Quick coverage check
npm run test:coverage

# Generate and merge all coverage
npm run coverage:merge
```

## Coverage Configuration

### Jest Configuration (`jest.config.js`)
- **Coverage Directory**: `./coverage`
- **Include Patterns**: `src/**/*.{js,jsx,ts,tsx}`
- **Exclude Patterns**: Type definitions, configs, migrations
- **Reporters**: text, html, lcov, json
- **Thresholds**: 25% statements, 20% branches, 25% functions/lines

### NYC Configuration (`.nycrc.json`)
- **Istanbul Configuration**: Advanced coverage settings
- **Watermarks**: Coverage quality indicators (25%-70%)
- **Output Formats**: Multiple report formats
- **File Patterns**: Detailed include/exclude rules

### Playwright Configuration (`playwright.config.ts`)
- **Coverage Collection**: V8 coverage enabled
- **Report Generation**: HTML reports with coverage data
- **Browser Configuration**: Chromium with coverage flags

## Coverage Reports

### Local Development
After running coverage commands, reports are available at:
- **HTML Report**: `coverage/html/index.html`
- **Merged Report**: `coverage/html-merged/index.html`
- **LCOV File**: `coverage/lcov.info`
- **JSON Data**: `coverage/coverage-final.json`

### GitHub Actions
Coverage reports are automatically:
1. **Generated** for each test type (unit, integration, component, e2e)
2. **Uploaded** as artifacts for each job
3. **Merged** in a dedicated coverage job
4. **Summarized** in the GitHub Actions summary

### Artifacts
- `jest-coverage-report`: Unit and component test coverage
- `integration-coverage-report`: Integration test coverage  
- `e2e-coverage-report`: Playwright test results and coverage
- `merged-coverage-report`: Combined coverage from all sources

## Coverage Thresholds

### Current Thresholds
```javascript
{
  branches: 20%,    // Conditional branches covered
  functions: 25%,   // Functions called
  lines: 25%,       // Lines executed  
  statements: 25%   // Statements executed
}
```

### Improving Coverage
1. **Add Unit Tests**: Focus on uncovered functions and branches
2. **Enhance Integration Tests**: Cover API endpoints and services
3. **Expand Component Tests**: Test React components thoroughly
4. **Increase E2E Coverage**: Add more user journey tests

## File Exclusions

Coverage collection excludes:
- Type definition files (`*.d.ts`)
- Configuration files (`*.config.{js,ts}`)
- Database migrations (`/migrations/**`)
- Generated files (`/.next/**`, `/drizzle/**`)
- Test files (`/__tests__/**`)
- Documentation (`/docs/**`)

## CI/CD Integration

### GitHub Actions Workflow
The `web.test.yml` workflow includes:
1. **Quick Job**: Unit and component tests with coverage
2. **Integration Job**: Integration tests with coverage
3. **E2E Job**: Playwright tests with coverage
4. **Coverage Report Job**: Merges all coverage data

### Coverage Artifacts
All coverage reports are uploaded as GitHub Actions artifacts with:
- **Retention**: 30 days
- **Download**: Available from the Actions tab
- **Merge**: Automatically combined for comprehensive reporting

## Troubleshooting

### Common Issues

#### Low Coverage Warnings
```bash
Jest: "global" coverage threshold for X (Y%) not met: Z%
```
**Solution**: Either increase test coverage or adjust thresholds in `jest.config.js`

#### Missing Coverage Files
```bash
Coverage file not found, skipping...
```
**Solution**: Ensure tests are run before merging coverage (`npm run test:coverage`)

#### Playwright Coverage Issues
```bash
No Playwright coverage files found
```
**Solution**: Playwright coverage collection is automatic but may not generate files for simple tests

### Debugging Coverage
1. **Check Coverage Files**: Look in `./coverage/` directory
2. **Verify Configuration**: Ensure `jest.config.js` and `.nycrc.json` are correct
3. **Run Individual Commands**: Test each coverage type separately
4. **Check File Paths**: Ensure source files match include patterns

## Best Practices

### Writing Tests for Coverage
1. **Test All Code Paths**: Include positive and negative test cases
2. **Cover Edge Cases**: Test error conditions and boundary values
3. **Mock Dependencies**: Use Jest mocks for unit test isolation
4. **Integration Without Mocks**: Let integration tests use real implementations
5. **Component Testing**: Test React components with user interactions

### Maintaining Coverage
1. **Monitor Trends**: Track coverage changes over time
2. **Review PRs**: Check coverage impact in pull requests
3. **Set Goals**: Gradually increase coverage thresholds
4. **Focus Quality**: Prioritize meaningful tests over coverage percentage

### Performance Optimization
1. **Parallel Execution**: Use Jest and Playwright parallel features
2. **Incremental Coverage**: Only collect coverage when needed
3. **Exclude Unnecessary Files**: Keep exclusion patterns updated
4. **Cache Dependencies**: Use CI caching for faster builds

## Links and Resources

- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#collectcoverage-boolean)
- [Istanbul Coverage Documentation](https://istanbul.js.org/)
- [Playwright Test Documentation](https://playwright.dev/docs/test-coverage)
- [NYC Configuration Reference](https://github.com/istanbuljs/nyc#configuration)
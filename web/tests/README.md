# Playwright End-to-End Testing

This directory contains Playwright end-to-end tests for the Catalyst GitHub App integration.

## Features

- **Video Recording**: Videos are recorded for failed tests and uploaded as GitHub artifacts
- **Screenshot Capture**: Screenshots are taken when tests fail
- **Test Reports**: HTML reports are generated and uploaded as artifacts
- **Automatic Artifact Upload**: Failed test media and reports are automatically uploaded to GitHub Actions

## Running Tests

### Prerequisites

Install Playwright browsers:
```bash
npx playwright install
```

### Local Development

```bash
# Run all Playwright tests
npm run test:e2e

# Run tests with UI mode (for debugging)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# List all available tests
npx playwright test --list
```

### Test Files

- `app.spec.ts` - Main application tests (homepage, GitHub app page, API endpoints)
- `artifacts-demo.spec.ts` - Demonstrates video/screenshot capture (contains skipped failing test)
- `failing-test.spec.ts.disabled` - Example failing test for artifact generation (disabled by default)

## Video and Screenshot Artifacts

### Configuration

The Playwright configuration is set up to:
- Record videos only on test failure (`video: 'retain-on-failure'`)
- Capture screenshots only on test failure (`screenshot: 'only-on-failure'`)
- Save traces on first retry for debugging (`trace: 'on-first-retry'`)

### GitHub Actions Integration

When tests run in GitHub Actions:
1. **All runs**: Test reports are uploaded as `playwright-report` artifact
2. **Failed runs only**: Videos and screenshots are uploaded as `playwright-test-results` artifact

### Artifact Locations

- **Local**: 
  - Videos and screenshots: `test-results/`
  - HTML reports: `playwright-report/`
- **GitHub Actions**: Available in the "Artifacts" section of the workflow run

## Testing Failed Test Artifacts

To test the video and screenshot capture functionality:

1. Enable the failing test:
   ```bash
   mv tests/failing-test.spec.ts.disabled tests/failing-test.spec.ts
   ```

2. Run the test:
   ```bash
   npm run test:e2e
   ```

3. Check the generated artifacts in `test-results/` directory

4. Disable the test again:
   ```bash
   mv tests/failing-test.spec.ts tests/failing-test.spec.ts.disabled
   ```

## CI/CD Integration

The GitHub Actions workflow (`web.test.yml`) includes a dedicated `playwright` job that:
- Installs Playwright browsers with system dependencies
- Builds the Next.js application
- Runs Playwright tests
- Uploads artifacts on both success (reports) and failure (videos/screenshots)

### Artifact Retention

- Artifacts are retained for 30 days
- Videos and screenshots are only uploaded when tests fail
- HTML reports are always uploaded for debugging

## Troubleshooting

### Browser Installation Issues

If browser installation fails locally, you can:
1. Try installing specific browsers: `npx playwright install chromium`
2. Use the CI environment where browser installation is more reliable
3. Check the Playwright documentation for system requirements

### Video/Screenshot Not Generated

Ensure your test:
1. Actually fails (assertions must fail)
2. Runs long enough to capture meaningful content
3. Has the correct Playwright configuration for video/screenshot capture

## Best Practices

1. **Test Design**: Write tests that fail meaningfully to generate useful artifacts
2. **Performance**: Videos and screenshots add overhead - use only on failure
3. **CI Efficiency**: Keep the number of browsers minimal for faster CI runs
4. **Debugging**: Use trace files and HTML reports for detailed debugging information
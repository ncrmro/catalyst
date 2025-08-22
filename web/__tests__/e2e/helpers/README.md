# E2E Test Authentication Helper

This directory contains helpers for E2E testing with unique user authentication.

## Overview

The `auth.ts` helper provides functions to generate unique user credentials for each E2E test, ensuring that parallel test runs don't interfere with each other.

## Usage

### Basic Usage

```typescript
import { test, expect } from '@playwright/test';
import { signInWithUniqueUser } from './helpers/auth';

test.describe('My Feature Tests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Each test gets a unique user
    await signInWithUniqueUser(page, testInfo, 'user');
  });

  test('should work with authenticated user', async ({ page }) => {
    // Test implementation - user is already signed in
    await page.goto('/my-feature');
    // ... test assertions
  });
});
```

### Admin Users

```typescript
test('should work with admin privileges', async ({ page }, testInfo) => {
  await signInWithUniqueUser(page, testInfo, 'admin');
  
  // Test admin-specific functionality
  await page.goto('/admin-dashboard');
  // ... test assertions
});
```

### Manual Credential Generation

```typescript
import { generateUserCredentials } from './helpers/auth';

test('should generate unique credentials', async ({}, testInfo) => {
  const userPassword = generateUserCredentials(testInfo, 'user');
  const adminPassword = generateUserCredentials(testInfo, 'admin');
  
  // Use credentials as needed for manual authentication flows
});
```

## How It Works

1. **Unique Credentials**: Each test gets credentials based on worker index and timestamp (e.g., `password-0-1755900040798`)
2. **Auth System Integration**: The existing auth system already supports suffixed passwords in development mode
3. **Automatic User Creation**: When a new suffixed password is used, the system automatically creates a new user
4. **Team Creation**: New users automatically get personal teams, so team-related tests work immediately

## Configuration

To use these helpers with real authentication (not MOCKED=1 mode), you can:

1. Temporarily modify the Playwright config to remove MOCKED=1:

```typescript
// In playwright.config.ts, change:
command: 'MOCKED=1 npm run dev',
// to:
command: 'npm run dev',
```

2. Or create a separate config file for auth tests and run with:

```bash
npx playwright test --config=your-auth-config.ts
```

Note: The examples in this repository demonstrate the helper usage, but may require a database setup to run fully.

## Benefits

- **Parallel Test Safety**: Each test gets its own user, preventing conflicts
- **Realistic Testing**: Tests use real authentication flows instead of mocks
- **Isolation**: Tests don't affect each other's data
- **Admin Testing**: Easy to test admin vs regular user scenarios

## Files

- `auth.ts` - Main helper functions
- `teams-with-unique-users.spec.ts` - Example usage
- `auth-helper.spec.ts` - Unit tests for the helper functions
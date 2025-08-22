import { test, expect } from '@playwright/test';
import { generateUserCredentials } from './helpers/auth';

test.describe('Auth Helper Tests', () => {
  test('should generate unique user credentials', async ({}, testInfo) => {
    const credentials = generateUserCredentials(testInfo, 'user');
    
    // Credentials should start with 'password-' followed by worker index and timestamp
    expect(credentials).toMatch(/^password-\d+-\d+$/);
    
    // Adding a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    const credentials2 = generateUserCredentials(testInfo, 'user');
    
    // They should be different due to different timestamps
    expect(credentials).not.toBe(credentials2);
  });

  test('should generate admin credentials', async ({}, testInfo) => {
    const adminCredentials = generateUserCredentials(testInfo, 'admin');
    
    // Admin credentials should start with 'admin-'
    expect(adminCredentials).toMatch(/^admin-\d+-\d+$/);
  });

  test('should include worker index in credentials', async ({}, testInfo) => {
    const credentials = generateUserCredentials(testInfo, 'user');
    const workerIndex = testInfo.workerIndex;
    
    // Credentials should contain the worker index
    expect(credentials).toContain(`-${workerIndex}-`);
  });
});
import { describe, it, expect } from 'vitest';

describe('Database Schema', () => {
  it('should export users table', async () => {
    const { users } = await import('@/database/schema');
    expect(users).toBeDefined();
  });

  it('should export accounts table', async () => {
    const { accounts } = await import('@/database/schema');
    expect(accounts).toBeDefined();
  });

  it('should export sessions table', async () => {
    const { sessions } = await import('@/database/schema');
    expect(sessions).toBeDefined();
  });
});
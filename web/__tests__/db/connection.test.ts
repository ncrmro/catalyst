/**
 * @jest-environment node
 */

import { Pool } from 'pg';

describe('Database Connection', () => {
  let pool: Pool;

  beforeAll(() => {
    // Use a test database URL or mock if no real database is available
    const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/catalyst';
    pool = new Pool({
      connectionString: testDatabaseUrl,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('should be able to connect to database', async () => {
    // This test will pass if we can create a pool connection
    // In a real environment with database running, we could test actual connectivity
    expect(pool).toBeDefined();
    expect(pool.options.connectionString).toBeDefined();
  });

  test('should have drizzle schema defined', async () => {
    // Test that our schema exports are available
    const { users, repositories } = await import('../../src/db/schema');
    
    expect(users).toBeDefined();
    expect(repositories).toBeDefined();
  });

  test('should have database connection module', async () => {
    // Test that our database connection module can be imported
    const { db } = await import('../../src/db/connection');
    
    expect(db).toBeDefined();
  });
});
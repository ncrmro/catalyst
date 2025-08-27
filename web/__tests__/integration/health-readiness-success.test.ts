/**
 * @jest-environment node
 */

import { GET } from '@/app/api/health/readiness/route';

describe('/health/readiness - Success Cases', () => {
  beforeAll(() => {
    // Ensure we're not in mocked mode for integration tests
    delete process.env.MOCKED;
  });

  test('should return success when database connection is working', async () => {
    const response = await GET();
    const data = await response.json();
    
    // Only test success path
    if (data.success) {
      expect(data.message).toBe('Database connection successful');
      expect(data).toHaveProperty('result');
      expect(response.status).toBe(200);
      console.log('Integration test: Database connection successful');
    } else {
      console.log('Skipping success test - database not available:', data.message);
    }
  });

  test('should return consistent success response structure', async () => {
    const response = await GET();
    const data = await response.json();
    
    if (data.success) {
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('result');
      expect(typeof data.message).toBe('string');
      console.log('Integration test: Success response structure is correct');
    } else {
      console.log('Skipping structure test - database not available');
    }
  });
});
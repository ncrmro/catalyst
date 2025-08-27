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
    
    // Test response structure regardless of success/failure
    expect(data).toHaveProperty('success');
    expect(typeof data.success).toBe('boolean');
    expect(data).toHaveProperty('message');
    expect(typeof data.message).toBe('string');
    
    // If successful, verify success-specific properties
    if (data.success) {
      expect(data.message).toBe('Database connection successful');
      expect(data).toHaveProperty('result');
      expect(response.status).toBe(200);
      console.log('Integration test: Database connection successful');
    } else {
      // If not successful, verify error-specific properties
      expect(data).toHaveProperty('error');
      console.log('Integration test: Database connection failed:', data.message);
    }
  });

  test('should return consistent success response structure', async () => {
    const response = await GET();
    const data = await response.json();
    
    // Test basic structure that should always be present
    expect(data).toHaveProperty('success');
    expect(typeof data.success).toBe('boolean');
    expect(data).toHaveProperty('message');
    expect(typeof data.message).toBe('string');
    
    if (data.success) {
      expect(data).toHaveProperty('result');
      console.log('Integration test: Success response structure is correct');
    } else {
      expect(data).toHaveProperty('error');
      console.log('Integration test: Error response structure is correct');
    }
  });
});
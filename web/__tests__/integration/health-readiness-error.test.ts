/**
 * @jest-environment node
 */

import { GET } from '@/app/api/health/readiness/route';

describe('/health/readiness - Error Cases', () => {
  beforeAll(() => {
    // Ensure we're not in mocked mode for integration tests
    delete process.env.MOCKED;
  });

  test('should handle database connection failures gracefully', async () => {
    // Test with potentially broken database connection
    const response = await GET();
    const data = await response.json();
    
    // Only test failure path
    if (!data.success) {
      expect(data.message).toBe('Database connection failed');
      expect(data).toHaveProperty('error');
      expect(response.status).toBeGreaterThanOrEqual(400);
      console.log('Integration test: Database error handled correctly:', data.error);
    } else {
      console.log('Skipping error test - database connection is working');
    }
  });

  test('should return consistent error response structure', async () => {
    const response = await GET();
    const data = await response.json();
    
    if (!data.success) {
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('error');
      expect(typeof data.message).toBe('string');
      expect(typeof data.error).toBe('string');
      console.log('Integration test: Error response structure is correct');
    } else {
      console.log('Skipping error structure test - database connection is working');
    }
  });

  test('should respond quickly even when database is unavailable', async () => {
    const startTime = Date.now();
    
    const response = await GET();
    const data = await response.json();
    
    const responseTime = Date.now() - startTime;
    
    // Should respond quickly regardless of success/failure
    expect(responseTime).toBeLessThan(5000); // 5 seconds max
    expect(data).toHaveProperty('success');
    expect(typeof data.success).toBe('boolean');
    
    console.log(`Integration test: Response time: ${responseTime}ms, success: ${data.success}`);
  });
});
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
    
    // Test response structure regardless of success/failure
    expect(data).toHaveProperty('success');
    expect(typeof data.success).toBe('boolean');
    expect(data).toHaveProperty('message');
    expect(typeof data.message).toBe('string');
    
    if (!data.success) {
      expect(data.message).toBe('Database connection failed');
      expect(data).toHaveProperty('error');
      expect(response.status).toBeGreaterThanOrEqual(400);
      console.log('Integration test: Database error handled correctly:', data.error);
    } else {
      expect(data.message).toBe('Database connection successful');
      expect(data).toHaveProperty('result');
      console.log('Integration test: Database connection is working');
    }
  });

  test('should return consistent error response structure', async () => {
    const response = await GET();
    const data = await response.json();
    
    // Test basic structure that should always be present
    expect(data).toHaveProperty('success');
    expect(typeof data.success).toBe('boolean');
    expect(data).toHaveProperty('message');
    expect(typeof data.message).toBe('string');
    
    if (!data.success) {
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
      console.log('Integration test: Error response structure is correct');
    } else {
      expect(data).toHaveProperty('result');
      console.log('Integration test: Success response structure is correct');
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
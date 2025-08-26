/**
 * @jest-environment node
 */

import { GET } from '@/app/api/health/readiness/route';

describe('/health/readiness', () => {
  test('should return database health status', async () => {
    const response = await GET();
    const data = await response.json();
    
    // The endpoint should return a success response structure
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('message');
    
    // In mocked mode (MOCKED=1), it should return mocked response
    if (process.env.MOCKED === '1') {
      expect(data.success).toBe(true);
      expect(data.message).toBe('Health check successful (mocked mode)');
      expect(data).toHaveProperty('mocked', true);
    } else {
      // In a test environment without database, it should fail gracefully
      if (data.success) {
        expect(data.message).toBe('Database connection successful');
        expect(data).toHaveProperty('result');
      } else {
        expect(data.message).toBe('Database connection failed');
        expect(data).toHaveProperty('error');
      }
    }
  });
});
/**
 * @jest-environment node
 */

import { GET } from '@/app/health/readiness/route';

describe('/health/readiness', () => {
  test('should return database health status', async () => {
    const response = await GET();
    const data = await response.json();
    
    // The endpoint should return a success response structure
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('message');
    
    // In a test environment without database, it should fail gracefully
    if (data.success) {
      expect(data.message).toBe('Database connection successful');
      expect(data).toHaveProperty('result');
    } else {
      expect(data.message).toBe('Database connection failed');
      expect(data).toHaveProperty('error');
    }
  });
});
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '../../../../src/app/api/github/register/route';
import { vi } from 'vitest';

describe('/api/github/register', () => {
  beforeEach(() => {
    // Set test environment variables
    process.env.GITHUB_APP_ID = 'test-app-id';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GITHUB_APP_ID;
  });

  describe('GET', () => {
    it('should return registration URL with default state', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/register',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'GitHub App registration initiated',
        state: 'default'
      });
      expect(data.installation_url).toContain('github.com/apps/test-app-id');
    });

    it('should return registration URL with custom state', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/register?state=custom-state',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'GitHub App registration initiated',
        state: 'custom-state'
      });
      expect(data.installation_url).toContain('state=custom-state');
    });

    it('should handle missing GITHUB_APP_ID gracefully', async () => {
      delete process.env.GITHUB_APP_ID;

      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/register',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.installation_url).toContain('your-app-id');
    });
  });

  describe('POST', () => {
    it('should handle installation setup action', async () => {
      const requestBody = {
        installation_id: '12345',
        setup_action: 'install'
      };
      
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: requestBody,
      });

      // Mock the json method
      req.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'GitHub App installed successfully',
        installation_id: '12345'
      });
    });

    it('should handle custom registration data', async () => {
      const customData = { custom: 'data', user_id: '123' };
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: customData,
      });

      // Mock the json method
      req.json = vi.fn().mockResolvedValue(customData);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Registration request processed',
        data: customData
      });
    });

    it('should handle invalid JSON', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: Buffer.from('invalid json'),
      });

      // Mock json() to throw an error
      req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        error: 'Failed to process registration',
        message: 'Invalid JSON'
      });
    });
  });
});
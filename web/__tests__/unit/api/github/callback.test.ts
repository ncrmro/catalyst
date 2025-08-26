import { createMocks } from 'node-mocks-http';
import { GET } from '../../../../src/app/api/github/callback/route';

describe('/api/github/callback', () => {
  describe('GET', () => {
    it('should handle successful installation callback', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?installation_id=12345&setup_action=install&state=test-state',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'GitHub App installed successfully',
        installation_id: '12345',
        state: 'test-state',
        next_steps: [
          'Installation recorded in system',
          'App permissions configured',
          'Ready to access repositories'
        ]
      });
    });

    it('should handle installation request callback', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?installation_id=12345&setup_action=request&state=test-state',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'GitHub App installation requested',
        installation_id: '12345',
        state: 'test-state',
        status: 'pending_approval'
      });
    });

    it('should handle installation update callback', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?installation_id=12345&setup_action=update&state=test-state',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'GitHub App installation updated',
        installation_id: '12345',
        state: 'test-state'
      });
    });

    it('should handle generic callback with authorization code', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?installation_id=12345&code=auth-code&state=test-state',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'OAuth callback processed',
        installation_id: '12345',
        state: 'test-state',
        has_authorization_code: true
      });
    });

    it('should return error when installation_id is missing', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?setup_action=install',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Missing installation_id parameter'
      });
    });

    it('should handle callback without state parameter', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback?installation_id=12345&setup_action=install',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'GitHub App installed successfully',
        installation_id: '12345',
        state: null
      });
    });

    it('should handle malformed URL gracefully', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost:3000/api/github/callback',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Missing installation_id parameter'
      });
    });
  });
});
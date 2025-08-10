import { createMocks } from 'node-mocks-http';
import { POST } from '../../../src/app/api/github/webhook/route';
import crypto from 'crypto';

describe('/api/github/webhook', () => {
  const mockWebhookSecret = 'test-webhook-secret';

  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = mockWebhookSecret;
  });

  afterEach(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  function createSignature(payload: string, secret: string): string {
    return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  describe('POST', () => {
    it('should handle installation event', async () => {
      const payload = {
        action: 'created',
        installation: {
          id: 12345,
          account: { login: 'testuser' },
          permissions: { contents: 'read' }
        },
        sender: { login: 'testuser' }
      };
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, mockWebhookSecret);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'installation',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      // Mock request.text() to return the payload
      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Installation created processed',
        installation_id: 12345
      });
    });

    it('should handle installation_repositories event', async () => {
      const payload = {
        action: 'added',
        installation: { id: 12345 },
        repositories_added: [{ name: 'repo1' }, { name: 'repo2' }],
        repositories_removed: []
      };
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, mockWebhookSecret);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'installation_repositories',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Installation repositories added processed'
      });
    });

    it('should handle push event', async () => {
      const payload = {
        repository: { full_name: 'user/repo' },
        commits: [{ id: 'abc123' }, { id: 'def456' }],
        pusher: { name: 'testuser' },
        ref: 'refs/heads/main'
      };
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, mockWebhookSecret);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Push event processed',
        commits_processed: 2
      });
    });

    it('should handle pull_request event', async () => {
      const payload = {
        action: 'opened',
        pull_request: {
          number: 42,
          title: 'Test PR',
          user: { login: 'testuser' }
        },
        repository: { full_name: 'user/repo' }
      };
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, mockWebhookSecret);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'pull_request',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Pull request opened processed',
        pr_number: 42
      });
    });

    it('should handle unhandled events', async () => {
      const payload = { action: 'test', data: 'value' };
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, mockWebhookSecret);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'custom_event',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Event custom_event received but not handled',
        delivery_id: 'test-delivery-123'
      });
    });

    it('should reject invalid signature', async () => {
      const payload = { action: 'test' };
      const payloadString = JSON.stringify(payload);
      const invalidSignature = 'sha256=invalid-signature';

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'installation',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': invalidSignature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        error: 'Invalid signature'
      });
    });

    it('should handle missing webhook secret gracefully', async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET;

      const payload = { 
        action: 'created',
        installation: {
          id: 12345,
          account: { login: 'testuser' },
          permissions: { contents: 'read' }
        },
        sender: { login: 'testuser' }
      };
      const payloadString = JSON.stringify(payload);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'installation',
          'x-github-delivery': 'test-delivery-123',
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle malformed JSON', async () => {
      const invalidJson = '{ invalid json }';
      const signature = createSignature(invalidJson, mockWebhookSecret);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'installation',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: invalidJson,
      });

      req.text = jest.fn().mockResolvedValue(invalidJson);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        error: 'Failed to process webhook'
      });
    });
  });
});
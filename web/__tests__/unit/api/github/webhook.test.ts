import { createMocks } from 'node-mocks-http';
import { POST } from '../../../../src/app/api/github/webhook/route';
import crypto from 'crypto';

// Mock the Kubernetes action
jest.mock('../../../../src/actions/kubernetes', () => ({
  createKubernetesNamespace: jest.fn(),
  deleteKubernetesNamespace: jest.fn()
}));

// Mock the Octokit/rest module
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      issues: {
        createComment: jest.fn()
      }
    }
  }))
}));

import { createKubernetesNamespace, deleteKubernetesNamespace } from '../../../../src/actions/kubernetes';
import { Octokit } from '@octokit/rest';

describe('/api/github/webhook', () => {
  const mockWebhookSecret = 'test-webhook-secret';
  const mockGithubToken = 'test-github-token';
  const mockCreateKubernetesNamespace = createKubernetesNamespace as jest.MockedFunction<typeof createKubernetesNamespace>;
  const mockDeleteKubernetesNamespace = deleteKubernetesNamespace as jest.MockedFunction<typeof deleteKubernetesNamespace>;
  const mockOctokit = Octokit as jest.MockedClass<typeof Octokit>;

  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = mockWebhookSecret;
    process.env.GITHUB_TOKEN = mockGithubToken;
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.GITHUB_TOKEN;
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

    it('should handle pull_request opened event with namespace creation and comment', async () => {
      // Mock successful namespace creation
      mockCreateKubernetesNamespace.mockResolvedValue({
        success: true,
        message: 'Namespace created successfully',
        namespace: {
          name: 'user-repo-gh-pr-42',
          labels: {
            'catalyst/team': 'user',
            'catalyst/project': 'repo', 
            'catalyst/environment': 'gh-pr-42'
          },
          created: true
        }
      });

      // Mock successful comment creation
      const mockCreateComment = jest.fn().mockResolvedValue({});
      mockOctokit.mockImplementation(() => ({
        rest: {
          issues: {
            createComment: mockCreateComment
          }
        }
      }) as any);

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
        message: 'Pull request opened processed and namespace created',
        pr_number: 42,
        namespace: {
          name: 'user-repo-gh-pr-42',
          labels: {
            'catalyst/team': 'user',
            'catalyst/project': 'repo',
            'catalyst/environment': 'gh-pr-42'
          },
          created: true
        },
        comment_created: true
      });

      // Verify namespace creation was called with correct parameters
      expect(mockCreateKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      
      // Verify comment was created
      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        issue_number: 42,
        body: 'hello from catalyst'
      });
    });

    it('should handle pull_request closed event with namespace deletion', async () => {
      // Mock successful namespace deletion
      mockDeleteKubernetesNamespace.mockResolvedValue({
        success: true,
        message: 'Namespace deleted successfully',
        namespaceName: 'user-repo-gh-pr-42'
      });

      const payload = {
        action: 'closed',
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
        message: 'Pull request closed processed and namespace deleted',
        pr_number: 42,
        namespace_deleted: 'user-repo-gh-pr-42'
      });

      // Verify namespace deletion was called with correct parameters
      expect(mockDeleteKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      // Verify namespace creation was NOT called
      expect(mockCreateKubernetesNamespace).not.toHaveBeenCalled();
    });

    it('should handle pull_request closed event with namespace deletion failure', async () => {
      // Mock failed namespace deletion
      mockDeleteKubernetesNamespace.mockResolvedValue({
        success: false,
        error: 'Failed to delete namespace'
      });

      const payload = {
        action: 'closed',
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
        message: 'Pull request closed processed but namespace deletion failed',
        pr_number: 42,
        namespace_error: 'Failed to delete namespace'
      });

      // Verify namespace deletion was called
      expect(mockDeleteKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      // Verify namespace creation was NOT called
      expect(mockCreateKubernetesNamespace).not.toHaveBeenCalled();
    });

    it('should handle pull_request non-opened/non-closed event without namespace operations', async () => {
      const payload = {
        action: 'synchronize',
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
        message: 'Pull request synchronize processed',
        pr_number: 42
      });

      // Verify neither namespace creation nor deletion was called
      expect(mockCreateKubernetesNamespace).not.toHaveBeenCalled();
      expect(mockDeleteKubernetesNamespace).not.toHaveBeenCalled();
    });

    it('should handle pull_request opened event with namespace creation failure', async () => {
      // Mock failed namespace creation
      mockCreateKubernetesNamespace.mockResolvedValue({
        success: false,
        error: 'Failed to create namespace'
      });

      // Mock successful comment creation
      const mockCreateComment = jest.fn().mockResolvedValue({});
      mockOctokit.mockImplementation(() => ({
        rest: {
          issues: {
            createComment: mockCreateComment
          }
        }
      }) as any);

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
        message: 'Pull request opened processed but namespace creation failed',
        pr_number: 42,
        namespace_error: 'Failed to create namespace',
        comment_created: true
      });

      // Verify namespace creation was called
      expect(mockCreateKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      
      // Verify comment was still created even though namespace creation failed
      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        issue_number: 42,
        body: 'hello from catalyst'
      });
    });

    it('should handle pull_request opened event when GitHub token is not available', async () => {
      // Remove GitHub token from environment
      delete process.env.GITHUB_TOKEN;

      // Mock successful namespace creation
      mockCreateKubernetesNamespace.mockResolvedValue({
        success: true,
        message: 'Namespace created successfully',
        namespace: {
          name: 'user-repo-gh-pr-42',
          labels: {
            'catalyst/team': 'user',
            'catalyst/project': 'repo', 
            'catalyst/environment': 'gh-pr-42'
          },
          created: true
        }
      });

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
        message: 'Pull request opened processed and namespace created',
        pr_number: 42,
        comment_created: false // Should be false when no token is available
      });

      // Verify namespace creation was still called
      expect(mockCreateKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
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
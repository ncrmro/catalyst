import { createMocks } from 'node-mocks-http';
import { POST } from '../../../../src/app/api/github/webhook/route';
import crypto from 'crypto';
import { vi } from 'vitest';

// Mock the Kubernetes action
vi.mock('../../../../src/actions/kubernetes', () => ({
  createKubernetesNamespace: vi.fn(),
  deleteKubernetesNamespace: vi.fn()
}));

// Mock the GitHub library
vi.mock('../../../../src/lib/github', () => ({
  getInstallationOctokit: vi.fn()
}));

// Mock the k8s-pull-request-pod library
vi.mock('../../../../src/lib/k8s-pull-request-pod', () => ({
  createPullRequestPodJob: vi.fn(),
  cleanupPullRequestPodJob: vi.fn()
}));

// Mock the pull requests database operations
vi.mock('../../../../src/actions/pull-requests-db', () => ({
  upsertPullRequest: vi.fn(),
  findRepoByGitHubData: vi.fn()
}));

import { createKubernetesNamespace, deleteKubernetesNamespace } from '../../../../src/actions/kubernetes';
import { getInstallationOctokit } from '../../../../src/lib/github';
import { createPullRequestPodJob, cleanupPullRequestPodJob } from '../../../../src/lib/k8s-pull-request-pod';
import { upsertPullRequest, findRepoByGitHubData } from '../../../../src/actions/pull-requests-db';

describe('/api/github/webhook', () => {
  const mockWebhookSecret = 'test-webhook-secret';
  const mockCreateKubernetesNamespace = createKubernetesNamespace as ReturnType<typeof vi.fn>;
  const mockDeleteKubernetesNamespace = deleteKubernetesNamespace as ReturnType<typeof vi.fn>;
  const mockGetInstallationOctokit = getInstallationOctokit as ReturnType<typeof vi.fn>;
  const mockCreatePullRequestPodJob = createPullRequestPodJob as ReturnType<typeof vi.fn>;
  const mockCleanupPullRequestPodJob = cleanupPullRequestPodJob as ReturnType<typeof vi.fn>;
  const mockUpsertPullRequest = upsertPullRequest as ReturnType<typeof vi.fn>;
  const mockFindRepoByGitHubData = findRepoByGitHubData as ReturnType<typeof vi.fn>;

  // Helper function to create complete pull request payload
  function createPullRequestPayload(action: string, prData: any = {}) {
    return {
      action,
      installation: { id: 12345 },
      pull_request: {
        id: 42,
        number: 42,
        title: 'Test PR',
        body: 'Test PR body',
        state: 'open' as const,
        draft: false,
        html_url: 'https://github.com/user/repo/pull/42',
        user: { 
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png'
        },
        head: { ref: 'feature/test' },
        base: { ref: 'main' },
        comments: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        ...prData
      },
      repository: { 
        id: 123456,
        full_name: 'user/repo',
        owner: { login: 'user' },
        name: 'repo'
      }
    };
  }

  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = mockWebhookSecret;
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up default mocks for database operations
    mockFindRepoByGitHubData.mockResolvedValue({
      success: true,
      repo: null // Default to no repo found to avoid side effects
    });
    
    mockUpsertPullRequest.mockResolvedValue({
      success: true,
      operation: 'create',
      pullRequest: { id: 'mock-pr-id' }
    });
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
        body: Buffer.from(payloadString),
      });

      // Mock request.text() to return the payload
      req.text = vi.fn().mockResolvedValue(payloadString);

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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Push event processed',
        commits_processed: 2
      });
    });

    it('should handle pull_request opened event with namespace creation', async () => {
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

      // Mock successful pull request pod job creation
      // Note: createPullRequestPodJob is tested in detail via integration tests
      mockCreatePullRequestPodJob.mockResolvedValue({
        jobName: 'pr-job-pr-42-repo-1640995200000',
        serviceAccountName: 'pr-42-repo-buildx-sa',
        namespace: 'user-repo-gh-pr-42',
        created: true
      });

      // Mock GitHub octokit for commenting
      const mockRequest = vi.fn().mockResolvedValue({});
      mockGetInstallationOctokit.mockResolvedValue({
        request: mockRequest
      } as any);

      const payload = createPullRequestPayload('opened');
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

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
        podJob: {
          jobName: 'pr-job-pr-42-repo-1640995200000',
          serviceAccountName: 'pr-42-repo-buildx-sa',
          namespace: 'user-repo-gh-pr-42',
          created: true
        }
      });

      // Verify namespace creation was called with correct parameters
      expect(mockCreateKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      
      // Verify pull request pod job creation was called with correct parameters
      expect(mockCreatePullRequestPodJob).toHaveBeenCalledWith({
        name: 'pr-42-repo',
        namespace: 'user-repo-gh-pr-42'
      });
      
      // Verify GitHub comment was created
      expect(mockGetInstallationOctokit).toHaveBeenCalledWith(12345);
      expect(mockRequest).toHaveBeenCalledWith('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
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

      // Mock successful pull request pod job cleanup
      // Note: cleanupPullRequestPodJob is tested in detail via integration tests
      mockCleanupPullRequestPodJob.mockResolvedValue();

      const payload = {
        action: 'closed',
        pull_request: {
          number: 42,
          title: 'Test PR',
          user: { login: 'testuser' }
        },
        repository: { 
          full_name: 'user/repo',
          name: 'repo'
        }
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Pull request closed processed and namespace deleted',
        pr_number: 42,
        namespace_deleted: 'user-repo-gh-pr-42'
      });

      // Verify pull request pod job cleanup was called with correct parameters
      expect(mockCleanupPullRequestPodJob).toHaveBeenCalledWith('pr-42-repo', 'default');

      // Verify namespace deletion was called with correct parameters
      expect(mockDeleteKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      
      // Verify namespace creation was NOT called
      expect(mockCreateKubernetesNamespace).not.toHaveBeenCalled();
      expect(mockCreatePullRequestPodJob).not.toHaveBeenCalled();
    });

    it('should handle pull_request opened event with pod job creation failure but namespace success', async () => {
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

      // Mock failed pull request pod job creation
      mockCreatePullRequestPodJob.mockRejectedValue(new Error('Failed to create pod job'));

      // Mock GitHub octokit for commenting
      const mockRequest = vi.fn().mockResolvedValue({});
      mockGetInstallationOctokit.mockResolvedValue({
        request: mockRequest
      } as any);

      const payload = {
        action: 'opened',
        installation: { id: 12345 },
        pull_request: {
          number: 42,
          title: 'Test PR',
          user: { login: 'testuser' }
        },
        repository: { 
          full_name: 'user/repo',
          owner: { login: 'user' },
          name: 'repo'
        }
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

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
        podJob: null
      });

      // Verify namespace creation was called
      expect(mockCreateKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      
      // Verify pull request pod job creation was attempted
      expect(mockCreatePullRequestPodJob).toHaveBeenCalledWith({
        name: 'pr-42-repo',
        namespace: 'user-repo-gh-pr-42'
      });
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Pull request synchronize processed',
        pr_number: 42
      });

      // Verify neither namespace nor pod job operations were called
      expect(mockCreateKubernetesNamespace).not.toHaveBeenCalled();
      expect(mockDeleteKubernetesNamespace).not.toHaveBeenCalled();
      expect(mockCreatePullRequestPodJob).not.toHaveBeenCalled();
      expect(mockCleanupPullRequestPodJob).not.toHaveBeenCalled();
    });

    it('should handle pull_request opened event with namespace creation failure', async () => {
      // Mock failed namespace creation
      mockCreateKubernetesNamespace.mockResolvedValue({
        success: false,
        error: 'Failed to create namespace'
      });

      // Mock successful pull request pod job creation (it should still try even if namespace fails)
      mockCreatePullRequestPodJob.mockResolvedValue({
        jobName: 'pr-job-pr-42-repo-1640995200000',
        serviceAccountName: 'pr-42-repo-buildx-sa',
        namespace: 'default',
        created: true
      });

      // Mock GitHub octokit for commenting
      const mockRequest = vi.fn().mockResolvedValue({});
      mockGetInstallationOctokit.mockResolvedValue({
        request: mockRequest
      } as any);

      const payload = {
        action: 'opened',
        installation: { id: 12345 },
        pull_request: {
          number: 42,
          title: 'Test PR',
          user: { login: 'testuser' }
        },
        repository: { 
          full_name: 'user/repo',
          owner: { login: 'user' },
          name: 'repo'
        }
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Pull request opened processed but namespace creation failed',
        pr_number: 42,
        namespace_error: 'Failed to create namespace',
        podJob: {
          jobName: 'pr-job-pr-42-repo-1640995200000',
          serviceAccountName: 'pr-42-repo-buildx-sa',
          namespace: 'default',
          created: true
        }
      });

      // Verify namespace creation was called
      expect(mockCreateKubernetesNamespace).toHaveBeenCalledWith('user', 'repo', 'gh-pr-42');
      
      // Verify pull request pod job creation was still called (fallback to default namespace)
      expect(mockCreatePullRequestPodJob).toHaveBeenCalledWith({
        name: 'pr-42-repo',
        namespace: 'default'
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

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
        body: Buffer.from(invalidJson),
      });

      req.text = vi.fn().mockResolvedValue(invalidJson);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        error: 'Failed to process webhook'
      });
    });

    it('should create/update pull request in database when repository exists', async () => {
      // Mock repository found in database
      mockFindRepoByGitHubData.mockResolvedValue({
        success: true,
        repo: {
          id: 'repo-uuid-1',
          githubId: 123456,
          name: 'repo',
          fullName: 'user/repo'
        }
      });

      // Mock successful pull request upsert
      mockUpsertPullRequest.mockResolvedValue({
        success: true,
        operation: 'create',
        pullRequest: {
          id: 'pr-uuid-1',
          repoId: 'repo-uuid-1',
          provider: 'github',
          providerPrId: '42',
          number: 42,
          title: 'Test PR with Database Integration',
          state: 'open',
          status: 'ready'
        }
      });

      // Mock other dependencies
      mockCreateKubernetesNamespace.mockResolvedValue({
        success: true,
        message: 'Namespace created successfully',
        namespace: { name: 'user-repo-gh-pr-42', created: true }
      });

      mockCreatePullRequestPodJob.mockResolvedValue({
        jobName: 'pr-job-pr-42-repo-1640995200000',
        serviceAccountName: 'pr-42-repo-buildx-sa',
        namespace: 'user-repo-gh-pr-42',
        created: true
      });

      const mockRequest = vi.fn().mockResolvedValue({});
      mockGetInstallationOctokit.mockResolvedValue({
        request: mockRequest
      } as any);

      const payload = {
        action: 'opened',
        installation: { id: 12345 },
        pull_request: {
          id: 42,
          number: 42,
          title: 'Test PR with Database Integration',
          body: 'This is a test pull request with full webhook data',
          state: 'open',
          draft: false,
          html_url: 'https://github.com/user/repo/pull/42',
          user: { 
            login: 'testuser',
            avatar_url: 'https://github.com/testuser.png'
          },
          head: { ref: 'feature/database-integration' },
          base: { ref: 'main' },
          comments: 2,
          changed_files: 3,
          additions: 50,
          deletions: 10,
          labels: [{ name: 'enhancement' }, { name: 'database' }],
          assignees: [{ login: 'assignee1' }],
          requested_reviewers: [{ login: 'reviewer1' }],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        },
        repository: { 
          id: 123456,
          full_name: 'user/repo',
          owner: { login: 'user' },
          name: 'repo'
        }
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify repository lookup was called
      expect(mockFindRepoByGitHubData).toHaveBeenCalledWith(123456);

      // Verify pull request was upserted with correct data
      expect(mockUpsertPullRequest).toHaveBeenCalledWith({
        repoId: 'repo-uuid-1',
        provider: 'github',
        providerPrId: '42',
        number: 42,
        title: 'Test PR with Database Integration',
        description: 'This is a test pull request with full webhook data',
        state: 'open',
        status: 'ready',
        url: 'https://github.com/user/repo/pull/42',
        authorLogin: 'testuser',
        authorAvatarUrl: 'https://github.com/testuser.png',
        headBranch: 'feature/database-integration',
        baseBranch: 'main',
        commentsCount: 2,
        reviewsCount: 0,
        changedFilesCount: 3,
        additionsCount: 50,
        deletionsCount: 10,
        priority: 'medium',
        labels: ['enhancement', 'database'],
        assignees: ['assignee1'],
        reviewers: ['reviewer1'],
        mergedAt: undefined,
        closedAt: undefined
      });
    });

    it('should skip database operations when repository not found', async () => {
      // Mock repository not found
      mockFindRepoByGitHubData.mockResolvedValue({
        success: true,
        repo: null
      });

      // Mock other dependencies
      mockCreateKubernetesNamespace.mockResolvedValue({
        success: true,
        message: 'Namespace created successfully',
        namespace: { name: 'user-repo-gh-pr-42', created: true }
      });

      mockCreatePullRequestPodJob.mockResolvedValue({
        jobName: 'pr-job-pr-42-repo-1640995200000',
        created: true
      });

      const mockRequest = vi.fn().mockResolvedValue({});
      mockGetInstallationOctokit.mockResolvedValue({
        request: mockRequest
      } as any);

      const payload = {
        action: 'opened',
        installation: { id: 12345 },
        pull_request: {
          id: 42,
          number: 42,
          title: 'Test PR',
          state: 'open',
          draft: false,
          html_url: 'https://github.com/user/repo/pull/42',
          user: { login: 'testuser' },
          head: { ref: 'feature/test' },
          base: { ref: 'main' },
          comments: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        },
        repository: { 
          id: 999999, // Unknown repo ID
          full_name: 'user/repo',
          owner: { login: 'user' },
          name: 'repo'
        }
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
        body: Buffer.from(payloadString),
      });

      req.text = vi.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify repository lookup was called
      expect(mockFindRepoByGitHubData).toHaveBeenCalledWith(999999);

      // Verify pull request upsert was NOT called
      expect(mockUpsertPullRequest).not.toHaveBeenCalled();
    });
  });
});
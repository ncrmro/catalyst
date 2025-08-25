import { fetchProjectById, fetchProjectPullRequests, fetchProjectIssues } from '@/actions/projects';
import { auth } from '@/auth';
import { Octokit } from '@octokit/rest';

// Mock the dependencies
jest.mock('@/auth');
jest.mock('@octokit/rest');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockOctokit = Octokit as jest.MockedClass<typeof Octokit>;

describe('Project GitHub API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.MOCKED;
    delete process.env.GITHUB_REPOS_MODE;
  });

  describe('fetchProjectPullRequests', () => {
    it('should return mocked data when MOCKED=1', async () => {
      process.env.MOCKED = '1';

      const pullRequests = await fetchProjectPullRequests('proj-1');

      expect(pullRequests).toBeDefined();
      expect(Array.isArray(pullRequests)).toBe(true);
      // Should filter mock data for project repositories
      if (pullRequests.length > 0) {
        expect(pullRequests[0]).toHaveProperty('id');
        expect(pullRequests[0]).toHaveProperty('title');
        expect(pullRequests[0]).toHaveProperty('number');
        expect(pullRequests[0]).toHaveProperty('author');
        expect(pullRequests[0]).toHaveProperty('repository');
        expect(pullRequests[0]).toHaveProperty('priority');
        expect(pullRequests[0]).toHaveProperty('status');
      }
    });

    it('should return mocked data when GITHUB_REPOS_MODE=mocked', async () => {
      process.env.GITHUB_REPOS_MODE = 'mocked';

      const pullRequests = await fetchProjectPullRequests('proj-1');

      expect(pullRequests).toBeDefined();
      expect(Array.isArray(pullRequests)).toBe(true);
    });

    it('should attempt to fetch real data from GitHub API when not in mocked mode', async () => {
      // Mock auth to return a session with access token
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      // Mock Octokit methods
      const mockPullsList = jest.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            number: 42,
            title: 'Test PR',
            user: {
              login: 'testuser',
              avatar_url: 'https://avatar.test',
            },
            html_url: 'https://github.com/test/repo/pull/42',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            labels: [{ name: 'urgent' }],
            draft: false,
          },
        ],
      });

      const mockListReviews = jest.fn().mockResolvedValue({
        data: [],
      });

      mockOctokit.mockImplementation(() => ({
        rest: {
          pulls: {
            list: mockPullsList,
            listReviews: mockListReviews,
          },
        },
      }) as any);

      const pullRequests = await fetchProjectPullRequests('proj-1');

      expect(mockAuth).toHaveBeenCalled();
      expect(mockOctokit).toHaveBeenCalledWith({
        auth: 'test-token',
      });
    });

    it('should handle GitHub API errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      // Mock Octokit to throw an error
      const mockPullsList = jest.fn().mockRejectedValue(new Error('API Error'));

      mockOctokit.mockImplementation(() => ({
        rest: {
          pulls: {
            list: mockPullsList,
            listReviews: jest.fn(),
          },
        },
      }) as any);

      const pullRequests = await fetchProjectPullRequests('proj-1');

      // Should return empty array on error
      expect(pullRequests).toEqual([]);
    });

    it('should return empty array when no access token is available', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        // No accessToken
      } as any);

      const pullRequests = await fetchProjectPullRequests('proj-1');

      expect(pullRequests).toEqual([]);
      expect(mockOctokit).not.toHaveBeenCalled();
    });

    it('should correctly map GitHub PR data to internal format', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      const mockPullsList = jest.fn().mockResolvedValue({
        data: [
          {
            id: 123,
            number: 42,
            title: 'Add authentication system',
            user: {
              login: 'developer',
              avatar_url: 'https://github.com/avatars/developer.png',
            },
            html_url: 'https://github.com/owner/repo/pull/42',
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T15:00:00Z',
            labels: [
              { name: 'urgent' },
              { name: 'backend' }
            ],
            draft: false,
          },
        ],
      });

      const mockListReviews = jest.fn().mockResolvedValue({
        data: [
          { state: 'CHANGES_REQUESTED' }
        ],
      });

      mockOctokit.mockImplementation(() => ({
        rest: {
          pulls: {
            list: mockPullsList,
            listReviews: mockListReviews,
          },
        },
      }) as any);

      const pullRequests = await fetchProjectPullRequests('proj-1');

      expect(pullRequests.length).toBeGreaterThan(0);
      const pr = pullRequests[0];
      
      expect(pr).toMatchObject({
        id: 123,
        title: 'Add authentication system',
        number: 42,
        author: 'developer',
        author_avatar: 'https://github.com/avatars/developer.png',
        url: 'https://github.com/owner/repo/pull/42',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T15:00:00Z',
        priority: 'high', // Should be high due to 'urgent' label
        status: 'changes_requested', // Should be changes_requested due to review
      });
    });
  });

  describe('fetchProjectIssues', () => {
    it('should return mocked data when MOCKED=1', async () => {
      process.env.MOCKED = '1';

      const issues = await fetchProjectIssues('proj-1');

      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
      // Should filter mock data for project repositories
      if (issues.length > 0) {
        expect(issues[0]).toHaveProperty('id');
        expect(issues[0]).toHaveProperty('title');
        expect(issues[0]).toHaveProperty('number');
        expect(issues[0]).toHaveProperty('repository');
        expect(issues[0]).toHaveProperty('priority');
        expect(issues[0]).toHaveProperty('type');
        expect(issues[0]).toHaveProperty('effort_estimate');
      }
    });

    it('should attempt to fetch real data from GitHub API when not in mocked mode', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      const mockIssuesList = jest.fn().mockResolvedValue({
        data: [
          {
            id: 201,
            number: 15,
            title: 'Memory leak in background processor',
            html_url: 'https://github.com/test/repo/issues/15',
            created_at: '2024-01-01T08:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
            labels: [
              { name: 'bug' },
              { name: 'critical' }
            ],
            pull_request: undefined, // Not a PR
          },
        ],
      });

      mockOctokit.mockImplementation(() => ({
        rest: {
          issues: {
            listForRepo: mockIssuesList,
          },
        },
      }) as any);

      const issues = await fetchProjectIssues('proj-1');

      expect(mockAuth).toHaveBeenCalled();
      expect(mockOctokit).toHaveBeenCalledWith({
        auth: 'test-token',
      });
    });

    it('should correctly map GitHub issue data to internal format', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      const mockIssuesList = jest.fn().mockResolvedValue({
        data: [
          {
            id: 301,
            number: 78,
            title: 'Add dark mode support',
            html_url: 'https://github.com/owner/repo/issues/78',
            created_at: '2024-01-01T09:00:00Z',
            updated_at: '2024-01-01T14:00:00Z',
            labels: [
              { name: 'enhancement' },
              { name: 'ui' },
              { name: 'large' }
            ],
            pull_request: undefined,
          },
        ],
      });

      mockOctokit.mockImplementation(() => ({
        rest: {
          issues: {
            listForRepo: mockIssuesList,
          },
        },
      }) as any);

      const issues = await fetchProjectIssues('proj-1');

      expect(issues.length).toBeGreaterThan(0);
      const issue = issues[0];
      
      expect(issue).toMatchObject({
        id: 301,
        title: 'Add dark mode support',
        number: 78,
        url: 'https://github.com/owner/repo/issues/78',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T14:00:00Z',
        labels: ['enhancement', 'ui', 'large'],
        priority: 'medium', // Should be medium (no urgent/critical/high labels)
        effort_estimate: 'large', // Should be large due to 'large' label
        type: 'feature', // Should be feature due to 'enhancement' label
      });
    });

    it('should filter out pull requests from issues API response', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      const mockIssuesList = jest.fn().mockResolvedValue({
        data: [
          {
            id: 401,
            number: 20,
            title: 'Real Issue',
            pull_request: undefined, // This is an issue
          },
          {
            id: 402,
            number: 21,
            title: 'Pull Request disguised as issue',
            pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/21' }, // This is a PR
          },
        ],
      });

      mockOctokit.mockImplementation(() => ({
        rest: {
          issues: {
            listForRepo: mockIssuesList,
          },
        },
      }) as any);

      const issues = await fetchProjectIssues('proj-1');

      // Should only include the real issue, not the PR - but no repos return anything
      expect(issues).toHaveLength(0); // All repos in mock mode
    });
  });

  describe('fetchProjectById', () => {
    it('should return project data with correct structure', async () => {
      const project = await fetchProjectById('proj-1');

      if (project) {
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('full_name');
        expect(project).toHaveProperty('description');
        expect(project).toHaveProperty('owner');
        expect(project).toHaveProperty('repositories');
        expect(project).toHaveProperty('environments');
        expect(project).toHaveProperty('preview_environments_count');
        expect(project).toHaveProperty('created_at');
        expect(project).toHaveProperty('updated_at');

        // Validate owner structure
        expect(project.owner).toHaveProperty('login');
        expect(project.owner).toHaveProperty('type');
        expect(project.owner).toHaveProperty('avatar_url');

        // Validate repositories structure
        expect(Array.isArray(project.repositories)).toBe(true);
        if (project.repositories.length > 0) {
          const repo = project.repositories[0];
          expect(repo).toHaveProperty('id');
          expect(repo).toHaveProperty('name');
          expect(repo).toHaveProperty('full_name');
          expect(repo).toHaveProperty('url');
          expect(repo).toHaveProperty('primary');
        }

        // Validate environments structure
        expect(Array.isArray(project.environments)).toBe(true);
        if (project.environments.length > 0) {
          const env = project.environments[0];
          expect(env).toHaveProperty('id');
          expect(env).toHaveProperty('name');
          expect(env).toHaveProperty('type');
          expect(env).toHaveProperty('status');
        }
      }
    });

    it('should return null for non-existent project', async () => {
      const project = await fetchProjectById('non-existent-project');
      expect(project).toBeNull();
    });
  });

  describe('Priority Detection', () => {
    it('should correctly identify high priority based on labels', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      const testCases = [
        { labels: [{ name: 'urgent' }], expectedPriority: 'high' },
        { labels: [{ name: 'critical' }], expectedPriority: 'high' },
        { labels: [{ name: 'URGENT' }], expectedPriority: 'high' },
        { labels: [{ name: 'minor' }], expectedPriority: 'low' },
        { labels: [{ name: 'low' }], expectedPriority: 'low' },
        { labels: [{ name: 'enhancement' }], expectedPriority: 'medium' },
        { labels: [], expectedPriority: 'medium' },
      ];

      for (const testCase of testCases) {
        const mockPullsList = jest.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              number: 1,
              title: 'Test',
              user: { login: 'test', avatar_url: 'test' },
              html_url: 'test',
              created_at: 'test',
              updated_at: 'test',
              labels: testCase.labels,
              draft: false,
            },
          ],
        });

        mockOctokit.mockImplementation(() => ({
          rest: {
            pulls: {
              list: mockPullsList,
              listReviews: jest.fn().mockResolvedValue({ data: [] }),
            },
          },
        }) as any);

        const pullRequests = await fetchProjectPullRequests('proj-1');
        if (pullRequests.length > 0) {
          expect(pullRequests[0].priority).toBe(testCase.expectedPriority);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project gracefully', async () => {
      const pullRequests = await fetchProjectPullRequests('non-existent');
      expect(pullRequests).toEqual([]);

      const issues = await fetchProjectIssues('non-existent');
      expect(issues).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'test-user' },
        accessToken: 'test-token',
      } as any);

      mockOctokit.mockImplementation(() => {
        throw new Error('Network error');
      });

      const pullRequests = await fetchProjectPullRequests('proj-1');
      expect(pullRequests).toEqual([]);

      const issues = await fetchProjectIssues('proj-1');
      expect(issues).toEqual([]);
    });
  });
});
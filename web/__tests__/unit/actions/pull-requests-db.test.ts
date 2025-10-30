import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  upsertPullRequest, 
  findPullRequestByProviderData, 
  getPullRequestsByRepo, 
  getOpenPullRequests,
  findRepoByGitHubData,
  type CreatePullRequestData 
} from '@/actions/pull-requests-db';

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([]))
            }))
          }))
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([]))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'pr-uuid-1',
          repoId: 'repo-uuid-1',
          provider: 'github',
          providerPrId: '123',
          number: 1,
          title: 'Test PR',
          state: 'open',
          status: 'ready',
          url: 'https://github.com/test/repo/pull/1',
          authorLogin: 'testuser',
          headBranch: 'feature/test',
          baseBranch: 'main',
          commentsCount: 0,
          reviewsCount: 0,
          changedFilesCount: 1,
          additionsCount: 10,
          deletionsCount: 5,
          priority: 'medium',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        }]))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{
            id: 'pr-uuid-1',
            repoId: 'repo-uuid-1',
            provider: 'github',
            providerPrId: '123',
            number: 1,
            title: 'Updated Test PR',
            state: 'open',
            status: 'ready',
            url: 'https://github.com/test/repo/pull/1',
            authorLogin: 'testuser',
            headBranch: 'feature/test',
            baseBranch: 'main',
            commentsCount: 2,
            reviewsCount: 1,
            changedFilesCount: 1,
            additionsCount: 10,
            deletionsCount: 5,
            priority: 'medium',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T01:00:00Z'),
          }]))
        }))
      }))
    }))
  },
  pullRequests: {
    repoId: 'repo_id',
    provider: 'provider',
    providerPrId: 'provider_pr_id',
    id: 'id',
    state: 'state',
    updatedAt: 'updated_at'
  },
  repos: {
    id: 'id',
    githubId: 'github_id'
  }
}));

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((column, value) => ({ column, value, type: 'eq' })),
    and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
    desc: vi.fn((column) => ({ column, type: 'desc' }))
  };
});

describe('Pull Requests Database Operations', () => {
  const mockPullRequestData: CreatePullRequestData = {
    repoId: 'repo-uuid-1',
    provider: 'github',
    providerPrId: '123',
    number: 1,
    title: 'Test PR',
    description: 'This is a test pull request',
    state: 'open',
    status: 'ready',
    url: 'https://github.com/test/repo/pull/1',
    authorLogin: 'testuser',
    authorAvatarUrl: 'https://github.com/testuser.png',
    headBranch: 'feature/test',
    baseBranch: 'main',
    commentsCount: 0,
    reviewsCount: 0,
    changedFilesCount: 1,
    additionsCount: 10,
    deletionsCount: 5,
    priority: 'medium',
    labels: ['enhancement', 'frontend'],
    assignees: ['assignee1'],
    reviewers: ['reviewer1'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertPullRequest', () => {
    it('should create a new pull request when none exists', async () => {
      const { db } = await import('@/db');
      
      // Mock empty result for existing PR check
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])) // No existing PR
          }))
        }))
      });

      const result = await upsertPullRequest(mockPullRequestData);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('create');
      expect(result.pullRequest).toBeDefined();
      expect(result.pullRequest?.title).toBe('Test PR');
    });

    it('should update an existing pull request', async () => {
      const { db } = await import('@/db');
      
      // Mock existing PR result
      const existingPr = { id: 'pr-uuid-1', ...mockPullRequestData };
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([existingPr]))
          }))
        }))
      });

      const updatedData = { ...mockPullRequestData, title: 'Updated Test PR' };
      const result = await upsertPullRequest(updatedData);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('update');
      expect(result.pullRequest).toBeDefined();
    });

    it('should handle JSON serialization of arrays', async () => {
      const { db } = await import('@/db');
      
      // Mock empty result for new PR
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      });

      const result = await upsertPullRequest(mockPullRequestData);

      expect(result.success).toBe(true);
      // Verify that the insert was called with serialized arrays
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      
      // Mock database error
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.reject(new Error('Database connection failed')))
          }))
        }))
      });

      const result = await upsertPullRequest(mockPullRequestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('findPullRequestByProviderData', () => {
    it('should find an existing pull request', async () => {
      const { db } = await import('@/db');
      
      const mockPr = { id: 'pr-uuid-1', ...mockPullRequestData };
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([mockPr]))
          }))
        }))
      });

      const result = await findPullRequestByProviderData('repo-uuid-1', 'github', '123');

      expect(result.success).toBe(true);
      expect(result.pullRequest).toEqual(mockPr);
    });

    it('should return null when pull request not found', async () => {
      const { db } = await import('@/db');
      
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      });

      const result = await findPullRequestByProviderData('repo-uuid-1', 'github', '999');

      expect(result.success).toBe(true);
      expect(result.pullRequest).toBeNull();
    });

    it('should handle database errors', async () => {
      const { db } = await import('@/db');
      
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.reject(new Error('Query failed')))
          }))
        }))
      });

      const result = await findPullRequestByProviderData('repo-uuid-1', 'github', '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });
  });

  describe('getPullRequestsByRepo', () => {
    it('should return pull requests for a repository', async () => {
      const { db } = await import('@/db');
      
      const mockPrs = [
        { id: 'pr-uuid-1', ...mockPullRequestData },
        { id: 'pr-uuid-2', ...mockPullRequestData, number: 2 }
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(mockPrs))
            }))
          }))
        }))
      });

      const result = await getPullRequestsByRepo('repo-uuid-1');

      expect(result.success).toBe(true);
      expect(result.pullRequests).toEqual(mockPrs);
    });

    it('should respect the limit parameter', async () => {
      const { db } = await import('@/db');
      
      const limitSpy = vi.fn(() => Promise.resolve([]));
      
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: limitSpy
            }))
          }))
        }))
      });

      await getPullRequestsByRepo('repo-uuid-1', 25);

      // Verify limit was called with the correct value
      expect(limitSpy).toHaveBeenCalledWith(25);
    });
  });

  describe('getOpenPullRequests', () => {
    it('should return open pull requests with repository info', async () => {
      const { db } = await import('@/db');
      
      const mockResults = [
        {
          pullRequest: { id: 'pr-uuid-1', ...mockPullRequestData },
          repo: { id: 'repo-uuid-1', name: 'test-repo', fullName: 'owner/test-repo' }
        }
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve(mockResults))
              }))
            }))
          }))
        }))
      });

      const result = await getOpenPullRequests();

      expect(result.success).toBe(true);
      expect(result.pullRequests).toEqual(mockResults);
    });
  });

  describe('findRepoByGitHubData', () => {
    it('should find repository by GitHub ID', async () => {
      const { db } = await import('@/db');

      const mockRepo = {
        id: 'repo-uuid-1',
        githubId: 12345,
        name: 'test-repo',
        fullName: 'owner/test-repo'
      };

      // Create a query object that supports orderBy chaining
      const queryMock = Promise.resolve([mockRepo]) as any;
      queryMock.orderBy = vi.fn(() => queryMock);

      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => queryMock)
        }))
      });

      const result = await findRepoByGitHubData(12345);

      expect(result.success).toBe(true);
      expect(result.repo).toEqual(mockRepo);
    });

    it('should return null when repository not found', async () => {
      const { db } = await import('@/db');

      // Create a query object that supports orderBy chaining
      const queryMock = Promise.resolve([]) as any;
      queryMock.orderBy = vi.fn(() => queryMock);

      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => queryMock)
        }))
      });

      const result = await findRepoByGitHubData(99999);

      expect(result.success).toBe(true);
      expect(result.repo).toBeNull();
    });
  });
});
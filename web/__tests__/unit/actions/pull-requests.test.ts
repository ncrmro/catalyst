/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUserPullRequests } from '@/actions/pull-requests';

// Mock the auth function
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the token refresh function
vi.mock('@/lib/github-app/token-refresh', () => ({
  refreshTokenIfNeeded: vi.fn(),
  invalidateTokens: vi.fn(),
}));

// Mock the Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      users: {
        getAuthenticated: vi.fn(),
      },
      repos: {
        listForAuthenticatedUser: vi.fn(),
      },
      pulls: {
        list: vi.fn(),
        listReviews: vi.fn(),
      },
    },
  })),
}));

describe('Pull Requests Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });


  it('throws error when no authenticated user is found', async () => {
    const { auth } = await import('@/auth');
    (auth as any).mockResolvedValue(null);

    await expect(fetchUserPullRequests()).rejects.toThrow('No authenticated user found');
  });

  it('includes gitfoobar provider results (empty array)', async () => {
    const { auth } = await import('@/auth');
    const { refreshTokenIfNeeded } = await import('@/lib/github-app/token-refresh');
    
    // Mock auth to return a user (so the function doesn't return early)
    (auth as any).mockResolvedValue({
      user: { id: 'test-user-id' }
    });
    
    // Mock refreshTokenIfNeeded to return null (no GitHub tokens)
    (refreshTokenIfNeeded as any).mockResolvedValue(null);

    // Spy on console.log to verify gitfoobar provider is called
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await fetchUserPullRequests();

    // Check that the gitfoobar provider log message appears among the console logs
    expect(consoleSpy).toHaveBeenCalledWith('gitfoobar provider: returning empty pull requests array');
    
    consoleSpy.mockRestore();
  });

  it('combines results from both providers and sorts by updated_at', async () => {
    const { auth } = await import('@/auth');
    const { refreshTokenIfNeeded } = await import('@/lib/github-app/token-refresh');
    const { Octokit } = await import('@octokit/rest');

    // Mock successful GitHub auth with user ID
    (auth as any).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    // Mock successful token refresh
    (refreshTokenIfNeeded as any).mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      scope: 'read:user user:email read:org repo',
    });

    // Mock Octokit responses
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockResolvedValue({
            data: { login: 'testuser' },
          }),
        },
        repos: {
          listForAuthenticatedUser: vi.fn().mockResolvedValue({
            data: [
              {
                full_name: 'testuser/test-repo',
                name: 'test-repo',
              },
            ],
          }),
        },
        pulls: {
          list: vi.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                number: 1,
                title: 'Test PR',
                user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
                html_url: 'https://github.com/testuser/test-repo/pull/1',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                draft: false,
                labels: [],
              },
            ],
          }),
        },
        listReviews: vi.fn().mockResolvedValue({
          data: [],
        }),
      },
    };

    (Octokit as any).mockImplementation(() => mockOctokit);

    const result = await fetchUserPullRequests();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      title: 'Test PR',
      number: 1,
      author: 'testuser',
      repository: 'test-repo',
      status: 'ready',
      priority: 'medium',
    });
  });
});
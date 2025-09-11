'use server';

/**
 * Server action to fetch pull requests from multiple git providers
 * - GitHub provider: fetches real pull requests from GitHub API using GitHub App tokens
 * - gitfoobar provider: placeholder that returns empty array
 */

import { auth } from '@/auth';
import { Octokit } from '@octokit/rest';
import { PullRequest } from '@/actions/reports';
import { getMockPullRequests } from '@/mocks/github';
import { refreshTokenIfNeeded } from '@/lib/github-app/token-refresh';
import { invalidateTokens } from '@/lib/github-app/token-refresh';
import { GITHUB_CONFIG } from '@/lib/github';

/**
 * GitHub provider - fetches real pull requests from GitHub API using GitHub App tokens or PAT
 * Gets user's repositories and then fetches open pull requests from them
 */
async function fetchGitHubPullRequests(): Promise<{ pullRequests: PullRequest[]; authMethod: 'github-app' | 'pat' | 'none' }> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('No authenticated user found for fetching pull requests');
  }

  // Check for GitHub Personal Access Token in environment (for local development)
  let octokit: Octokit;
  let authMethod: 'github-app' | 'pat' | 'none' = 'none';

  if (GITHUB_CONFIG.PAT) {
    console.log('Using GitHub Personal Access Token for pull requests');
    octokit = new Octokit({
      auth: GITHUB_CONFIG.PAT,
    });
    authMethod = 'pat';
  } else {
    // Get tokens from the database, refreshing if needed
    const tokens = await refreshTokenIfNeeded(session.user.id);
    
    if (!tokens) {
      console.warn('No GitHub App tokens found for user. User may need to authorize the GitHub App');
      return { pullRequests: [], authMethod: 'none' };
    }

    octokit = new Octokit({
      auth: tokens.accessToken,
    });
    authMethod = 'github-app';
  }

  try {
    // First, get the authenticated user to filter PRs by author
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // Get user's repositories (both owned and collaborator repos)
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator'
    });

    const allPullRequests: PullRequest[] = [];

    // Fetch pull requests from each repository where user is the author
    for (const repo of repos) {
      try {
        const [owner, repoName] = repo.full_name.split('/');
        if (!owner || !repoName) {
          continue;
        }

        const { data: prs } = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          state: 'open',
          per_page: 100,
          sort: 'updated',
          direction: 'desc',
        });

        // Include all PRs from this repository (not just authored by current user)
        for (const pr of prs) {
          // Determine priority based on labels (simple heuristic)
          const labels = pr.labels.map(label => typeof label === 'string' ? label : label.name || '');
          let priority: 'high' | 'medium' | 'low' = 'medium';
          if (labels.some(label => label.toLowerCase().includes('urgent') || label.toLowerCase().includes('critical'))) {
            priority = 'high';
          } else if (labels.some(label => label.toLowerCase().includes('minor') || label.toLowerCase().includes('low'))) {
            priority = 'low';
          }

          // Determine status based on review state and draft status
          let status: 'draft' | 'ready' | 'changes_requested' = 'ready';
          if (pr.draft) {
            status = 'draft';
          } else {
            // Check for requested changes in reviews (this is a simplified check)
            try {
              const { data: reviews } = await octokit.rest.pulls.listReviews({
                owner,
                repo: repoName,
                pull_number: pr.number,
              });
              
              if (reviews.some(review => review.state === 'CHANGES_REQUESTED')) {
                status = 'changes_requested';
              }
            } catch (error) {
              console.warn(`Could not fetch reviews for PR ${pr.number}:`, error);
            }
          }

          allPullRequests.push({
            id: pr.id,
            title: pr.title,
            number: pr.number,
            author: pr.user?.login || 'unknown',
            author_avatar: pr.user?.avatar_url || '',
            repository: repoName,
            url: pr.html_url,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            comments_count: 0, // Comments count would need separate API calls for accurate count
            priority,
            status,
          });
        }
      } catch (error) {
        console.warn(`Could not fetch pull requests for repository ${repo.full_name}:`, error);
      }
    }

    return { pullRequests: allPullRequests, authMethod };
  } catch (error) {
    // Handle potential token errors
    if (isTokenError(error)) {
      console.error('Token error during pull request fetch:', error);
      // Only invalidate tokens if using GitHub App auth (not PAT)
      if (authMethod === 'github-app') {
        await invalidateTokens(session.user.id);
      }
    } else {
      console.error('Error fetching GitHub pull requests:', error);
    }
    return { pullRequests: [], authMethod };
  }
}

/**
 * gitfoobar provider - placeholder provider that returns empty array
 * This acts as a placeholder for future git providers
 * 
 * DOCUMENTATION: This is a placeholder git provider called "gitfoobar" that
 * always returns an empty array of pull requests. It serves as a template
 * for future git provider integrations and demonstrates the multi-provider
 * architecture of the pull requests system.
 */
async function fetchGitFoobarPullRequests(): Promise<PullRequest[]> {
  // This is a placeholder provider that returns no pull requests
  // In the future, this could be replaced with actual integration to another git provider
  console.log('gitfoobar provider: returning empty pull requests array');
  return [];
}

export interface PullRequestsResult {
  pullRequests: PullRequest[];
  hasGitHubToken: boolean;
  authMethod: 'github-app' | 'pat' | 'none';
}

/**
 * Fetch pull requests from all configured providers
 * Combines results from GitHub and gitfoobar providers
 */
export async function fetchUserPullRequestsWithTokenStatus(): Promise<PullRequestsResult> {
  // Check if we should return mocked data (using same env var as GitHub repos)
  const mocked = process.env.MOCKED === '1';
  
  console.log('Environment check - MOCKED:', mocked, 'GITHUB_REPOS_MODE:', GITHUB_CONFIG.REPOS_MODE);
  
  if (GITHUB_CONFIG.REPOS_MODE === 'mocked' || mocked) {
    console.log('Returning mocked pull requests data');
    return {
      pullRequests: getMockPullRequests(),
      hasGitHubToken: true, // Assume we have token in mocked mode
      authMethod: 'github-app' as const,
    };
  }

  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('No authenticated user found');
  }

  // Check for PAT first, then GitHub App tokens
  const hasGitHubToken = !!GITHUB_CONFIG.PAT || !!(await refreshTokenIfNeeded(session.user.id));

  try {
    // Fetch from all providers in parallel
    const [githubResult, gitfoobarPrs] = await Promise.all([
      fetchGitHubPullRequests(),
      fetchGitFoobarPullRequests(),
    ]);

    // Combine all pull requests and sort by updated date (newest first)
    const allPullRequests = [...githubResult.pullRequests, ...gitfoobarPrs];
    
    return {
      pullRequests: allPullRequests.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
      hasGitHubToken,
      authMethod: githubResult.authMethod,
    };
  } catch (error) {
    console.error('Error fetching user pull requests:', error);
    return {
      pullRequests: [],
      hasGitHubToken,
      authMethod: 'none' as const,
    };
  }
}

export async function fetchUserPullRequests(): Promise<PullRequest[]> {
  const result = await fetchUserPullRequestsWithTokenStatus();
  return result.pullRequests;
}

/**
 * Fetch pull requests from specific repositories using PAT authentication
 * Useful for scripts and contexts without user sessions
 */
export async function fetchPullRequestsFromRepos(repositories: string[]): Promise<PullRequest[]> {
  if (!GITHUB_CONFIG.PAT) {
    console.warn('No GitHub PAT token found');
    return [];
  }

  console.log(`Using GitHub Personal Access Token to fetch PRs from: ${repositories.join(', ')}`);
  console.log(`PAT token available: ${GITHUB_CONFIG.PAT ? 'Yes' : 'No'}`);
  
  const octokit = new Octokit({
    auth: GITHUB_CONFIG.PAT,
  });

  // Test PAT authentication by getting user info
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login} (${user.name || 'No name'})`);
    console.log(`User type: ${user.type}, Public repos: ${user.public_repos}, Private repos: ${user.total_private_repos || 'unknown'}`);
  } catch (error) {
    console.error('PAT authentication failed:', error);
    return [];
  }

  const allPullRequests: PullRequest[] = [];

  // Fetch pull requests from each specified repository
  for (const repoFullName of repositories) {
    try {
      const [owner, repoName] = repoFullName.split('/');
      if (!owner || !repoName) {
        console.warn(`Invalid repository format: ${repoFullName}. Expected format: owner/repo`);
        continue;
      }

      console.log(`Fetching PRs from ${repoFullName}...`);

      // First, try to access the repository to check permissions
      try {
        const { data: repoInfo } = await octokit.rest.repos.get({
          owner,
          repo: repoName,
        });
        console.log(`  Repository ${repoFullName} - Private: ${repoInfo.private}, Permissions: ${JSON.stringify(repoInfo.permissions || 'unknown')}`);
      } catch (repoError) {
        console.warn(`  Cannot access repository ${repoFullName}:`, repoError.message);
        // Continue to try fetching PRs anyway
      }

      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo: repoName,
        state: 'open',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      });

      console.log(`  Found ${prs.length} PRs in ${repoFullName}`);

      // Include all PRs from this repository
      for (const pr of prs) {
        // Determine priority based on labels (simple heuristic)
        const labels = pr.labels.map(label => typeof label === 'string' ? label : label.name || '');
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (labels.some(label => label.toLowerCase().includes('urgent') || label.toLowerCase().includes('critical'))) {
          priority = 'high';
        } else if (labels.some(label => label.toLowerCase().includes('minor') || label.toLowerCase().includes('low'))) {
          priority = 'low';
        }

        // Determine status based on review state and draft status
        let status: 'draft' | 'ready' | 'changes_requested' = 'ready';
        if (pr.draft) {
          status = 'draft';
        } else {
          // Check for requested changes in reviews (this is a simplified check)
          try {
            const { data: reviews } = await octokit.rest.pulls.listReviews({
              owner,
              repo: repoName,
              pull_number: pr.number,
            });
            
            if (reviews.some(review => review.state === 'CHANGES_REQUESTED')) {
              status = 'changes_requested';
            }
          } catch (error) {
            console.warn(`Could not fetch reviews for PR ${pr.number}:`, error);
          }
        }

        allPullRequests.push({
          id: pr.id,
          title: pr.title,
          number: pr.number,
          author: pr.user?.login || 'unknown',
          author_avatar: pr.user?.avatar_url || '',
          repository: repoName,
          url: pr.html_url,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          comments_count: 0, // Comments count would need separate API calls for accurate count
          priority,
          status,
        });
      }
    } catch (error) {
      console.warn(`Could not fetch pull requests for repository ${repoFullName}:`, error);
    }
  }

  return allPullRequests.sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

/**
 * Fetch pull requests using PAT authentication only (legacy - fetches from all user repos)
 * Useful for scripts and contexts without user sessions
 */
export async function fetchPullRequestsWithPAT(): Promise<PullRequest[]> {
  if (!GITHUB_CONFIG.PAT) {
    console.warn('No GitHub PAT token found');
    return [];
  }

  console.log('Using GitHub Personal Access Token for pull requests');
  
  const octokit = new Octokit({
    auth: GITHUB_CONFIG.PAT,
  });

  try {
    // First, get the authenticated user to filter PRs by author
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // Get user's repositories (both owned and collaborator repos)
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator'
    });

    const allPullRequests: PullRequest[] = [];

    // Fetch pull requests from each repository where user is the author
    for (const repo of repos) {
      try {
        const [owner, repoName] = repo.full_name.split('/');
        if (!owner || !repoName) {
          continue;
        }

        const { data: prs } = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          state: 'open',
          per_page: 100,
          sort: 'updated',
          direction: 'desc',
        });

        // Include all PRs from this repository (not just authored by current user)
        for (const pr of prs) {
          // Determine priority based on labels (simple heuristic)
          const labels = pr.labels.map(label => typeof label === 'string' ? label : label.name || '');
          let priority: 'high' | 'medium' | 'low' = 'medium';
          if (labels.some(label => label.toLowerCase().includes('urgent') || label.toLowerCase().includes('critical'))) {
            priority = 'high';
          } else if (labels.some(label => label.toLowerCase().includes('minor') || label.toLowerCase().includes('low'))) {
            priority = 'low';
          }

          // Determine status based on review state and draft status
          let status: 'draft' | 'ready' | 'changes_requested' = 'ready';
          if (pr.draft) {
            status = 'draft';
          } else {
            // Check for requested changes in reviews (this is a simplified check)
            try {
              const { data: reviews } = await octokit.rest.pulls.listReviews({
                owner,
                repo: repoName,
                pull_number: pr.number,
              });
              
              if (reviews.some(review => review.state === 'CHANGES_REQUESTED')) {
                status = 'changes_requested';
              }
            } catch (error) {
              console.warn(`Could not fetch reviews for PR ${pr.number}:`, error);
            }
          }

          allPullRequests.push({
            id: pr.id,
            title: pr.title,
            number: pr.number,
            author: pr.user?.login || 'unknown',
            author_avatar: pr.user?.avatar_url || '',
            repository: repoName,
            url: pr.html_url,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            comments_count: 0, // Comments count would need separate API calls for accurate count
            priority,
            status,
          });
        }
      } catch (error) {
        console.warn(`Could not fetch pull requests for repository ${repo.full_name}:`, error);
      }
    }

    return allPullRequests.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  } catch (error) {
    if (isTokenError(error)) {
      console.error('Token error during pull request fetch:', error);
    } else {
      console.error('Error fetching GitHub pull requests:', error);
    }
    return [];
  }
}

/**
 * Helper to identify token-related errors
 * @param error The error to check
 * @returns True if the error is token-related
 */
function isTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  
  const err = error as { status?: number; message?: string };
  return (
    err?.status === 401 ||
    err?.status === 403 ||
    (err?.message?.includes('token') ?? false) ||
    (err?.message?.includes('authentication') ?? false)
  );
}
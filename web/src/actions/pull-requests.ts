'use server';

/**
 * Server action to fetch pull requests from multiple git providers
 * - GitHub provider: fetches real pull requests from GitHub API
 * - gitfoobar provider: placeholder that returns empty array
 */

import { auth } from '@/auth';
import { Octokit } from '@octokit/rest';
import { PullRequest } from '@/actions/reports';

/**
 * GitHub provider - fetches real pull requests from GitHub API
 * Gets user's repositories and then fetches open pull requests from them
 */
async function fetchGitHubPullRequests(): Promise<PullRequest[]> {
  const session = await auth();
  
  if (!session?.accessToken) {
    console.warn('No GitHub access token found for fetching pull requests');
    return [];
  }

  const octokit = new Octokit({
    auth: session.accessToken,
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

        // Filter to only include PRs authored by the current user
        const userPrs = prs.filter(pr => pr.user?.login === user.login);

        for (const pr of userPrs) {
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

    return allPullRequests;
  } catch (error) {
    console.error('Error fetching GitHub pull requests:', error);
    return [];
  }
}

/**
 * gitfoobar provider - placeholder provider that returns empty array
 * This acts as a placeholder for future git providers
 */
async function fetchGitFoobarPullRequests(): Promise<PullRequest[]> {
  // This is a placeholder provider that returns no pull requests
  // In the future, this could be replaced with actual integration to another git provider
  console.log('gitfoobar provider: returning empty pull requests array');
  return [];
}

/**
 * Fetch pull requests from all configured providers
 * Combines results from GitHub and gitfoobar providers
 */
export async function fetchUserPullRequests(): Promise<PullRequest[]> {
  try {
    // Fetch from all providers in parallel
    const [githubPrs, gitfoobarPrs] = await Promise.all([
      fetchGitHubPullRequests(),
      fetchGitFoobarPullRequests(),
    ]);

    // Combine all pull requests and sort by updated date (newest first)
    const allPullRequests = [...githubPrs, ...gitfoobarPrs];
    
    return allPullRequests.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  } catch (error) {
    console.error('Error fetching user pull requests:', error);
    return [];
  }
}
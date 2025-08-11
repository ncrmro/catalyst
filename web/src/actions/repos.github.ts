'use server';

import { auth } from '@/auth';
import { Octokit } from '@octokit/rest';

/**
 * Server action to fetch GitHub repositories for the current user and organizations
 */

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url: string;
  };
  html_url: string;
  clone_url: string;
  ssh_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

interface ReposData {
  user_repos: GitHubRepo[];
  organizations: GitHubOrganization[];
  org_repos: Record<string, GitHubRepo[]>;
}

/**
 * Mock data for development and testing
 */
function getMockReposData(): ReposData {
  return {
    user_repos: [
      {
        id: 1,
        name: 'my-awesome-project',
        full_name: 'testuser/my-awesome-project',
        description: 'An awesome project built with Next.js',
        private: false,
        owner: {
          login: 'testuser',
          type: 'User',
          avatar_url: 'https://github.com/identicons/testuser.png'
        },
        html_url: 'https://github.com/testuser/my-awesome-project',
        clone_url: 'https://github.com/testuser/my-awesome-project.git',
        ssh_url: 'git@github.com:testuser/my-awesome-project.git',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-20T15:30:00Z',
        pushed_at: '2024-01-20T15:30:00Z',
        language: 'TypeScript',
        stargazers_count: 42,
        forks_count: 8,
        open_issues_count: 3
      },
      {
        id: 2,
        name: 'personal-website',
        full_name: 'testuser/personal-website',
        description: 'My personal portfolio website',
        private: true,
        owner: {
          login: 'testuser',
          type: 'User',
          avatar_url: 'https://github.com/identicons/testuser.png'
        },
        html_url: 'https://github.com/testuser/personal-website',
        clone_url: 'https://github.com/testuser/personal-website.git',
        ssh_url: 'git@github.com:testuser/personal-website.git',
        created_at: '2023-12-01T08:00:00Z',
        updated_at: '2024-01-18T12:00:00Z',
        pushed_at: '2024-01-18T12:00:00Z',
        language: 'JavaScript',
        stargazers_count: 5,
        forks_count: 1,
        open_issues_count: 0
      }
    ],
    organizations: [
      {
        login: 'awesome-org',
        id: 100,
        avatar_url: 'https://github.com/identicons/awesome-org.png',
        description: 'An awesome organization building great software'
      },
      {
        login: 'open-source-collective',
        id: 101,
        avatar_url: 'https://github.com/identicons/open-source-collective.png',
        description: 'Collective for open source projects'
      }
    ],
    org_repos: {
      'awesome-org': [
        {
          id: 201,
          name: 'main-product',
          full_name: 'awesome-org/main-product',
          description: 'The main product of our organization',
          private: true,
          owner: {
            login: 'awesome-org',
            type: 'Organization',
            avatar_url: 'https://github.com/identicons/awesome-org.png'
          },
          html_url: 'https://github.com/awesome-org/main-product',
          clone_url: 'https://github.com/awesome-org/main-product.git',
          ssh_url: 'git@github.com:awesome-org/main-product.git',
          created_at: '2023-06-01T10:00:00Z',
          updated_at: '2024-01-19T14:20:00Z',
          pushed_at: '2024-01-19T14:20:00Z',
          language: 'Python',
          stargazers_count: 156,
          forks_count: 23,
          open_issues_count: 12
        },
        {
          id: 202,
          name: 'infrastructure',
          full_name: 'awesome-org/infrastructure',
          description: 'Infrastructure as code for our services',
          private: true,
          owner: {
            login: 'awesome-org',
            type: 'Organization',
            avatar_url: 'https://github.com/identicons/awesome-org.png'
          },
          html_url: 'https://github.com/awesome-org/infrastructure',
          clone_url: 'https://github.com/awesome-org/infrastructure.git',
          ssh_url: 'git@github.com:awesome-org/infrastructure.git',
          created_at: '2023-08-15T16:30:00Z',
          updated_at: '2024-01-21T09:45:00Z',
          pushed_at: '2024-01-21T09:45:00Z',
          language: 'HCL',
          stargazers_count: 34,
          forks_count: 7,
          open_issues_count: 5
        }
      ],
      'open-source-collective': [
        {
          id: 301,
          name: 'community-tools',
          full_name: 'open-source-collective/community-tools',
          description: 'Tools for managing open source communities',
          private: false,
          owner: {
            login: 'open-source-collective',
            type: 'Organization',
            avatar_url: 'https://github.com/identicons/open-source-collective.png'
          },
          html_url: 'https://github.com/open-source-collective/community-tools',
          clone_url: 'https://github.com/open-source-collective/community-tools.git',
          ssh_url: 'git@github.com:open-source-collective/community-tools.git',
          created_at: '2023-10-10T12:00:00Z',
          updated_at: '2024-01-20T11:30:00Z',
          pushed_at: '2024-01-20T11:30:00Z',
          language: 'TypeScript',
          stargazers_count: 89,
          forks_count: 15,
          open_issues_count: 7
        }
      ]
    }
  };
}

/**
 * Fetch real GitHub repositories for the current user and organizations
 */
async function fetchRealGitHubRepos(): Promise<ReposData> {
  const session = await auth();
  
  if (!session?.accessToken) {
    throw new Error('No GitHub access token found. Please sign in with GitHub first.');
  }

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  try {
    // Fetch user repositories
    const userReposResponse = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });

    // Fetch user organizations
    const orgsResponse = await octokit.rest.orgs.listForAuthenticatedUser({
      per_page: 100,
    });

    // Fetch repositories for each organization
    const orgRepos: Record<string, GitHubRepo[]> = {};
    
    for (const org of orgsResponse.data) {
      try {
        const orgReposResponse = await octokit.rest.repos.listForOrg({
          org: org.login,
          per_page: 100,
          sort: 'updated',
        });
        orgRepos[org.login] = orgReposResponse.data as GitHubRepo[];
      } catch (error) {
        // If we can't access org repos (permissions), skip it
        console.warn(`Could not fetch repos for org ${org.login}:`, error instanceof Error ? error.message : 'Unknown error');
        orgRepos[org.login] = [];
      }
    }

    return {
      user_repos: userReposResponse.data as GitHubRepo[],
      organizations: orgsResponse.data as GitHubOrganization[],
      org_repos: orgRepos,
    };
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to fetch repositories: ${error.message}`
        : 'Failed to fetch repositories from GitHub API'
    );
  }
}

/**
 * Fetch GitHub repositories for the current user and their organizations
 */
export async function fetchGitHubRepos(): Promise<ReposData> {
  // Check if we should return mocked data
  // We'll check for both MOCKED=1 and a custom GITHUB_REPOS_MODE=mocked for flexibility
  const mocked = process.env.MOCKED;
  const reposMode = process.env.GITHUB_REPOS_MODE;
  
  console.log('Environment check - MOCKED:', mocked, 'GITHUB_REPOS_MODE:', reposMode);
  
  if (mocked === '1' || reposMode === 'mocked') {
    console.log('Returning mocked GitHub repos data');
    return getMockReposData();
  }

  // For non-mocked environments, fetch real data from GitHub API
  console.log('Fetching real GitHub repos data');
  return await fetchRealGitHubRepos();
}
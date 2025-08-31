/**
 * Centralized GitHub mock data for development and testing
 * 
 * This file contains mock data for:
 * - GitHub repositories (user and organization repos)
 * - GitHub organizations  
 * - Pull requests
 * 
 * Used by actions when MOCKED=1 or GITHUB_REPOS_MODE=mocked environment variables are set
 */

import { PullRequest } from '@/actions/reports';

/*
 * Note: These interfaces are based on @octokit/rest API responses but simplified for our use case.
 * For full type definitions, use:
 * 
 * import { GetResponseDataTypeFromEndpointMethod } from "@octokit/types";
 * import { Octokit } from "@octokit/rest";
 * 
 * const octokit = new Octokit();
 * type FullGitHubRepo = GetResponseDataTypeFromEndpointMethod<
 *   typeof octokit.repos.listForAuthenticatedUser
 * >[0];
 * type FullGitHubOrganization = GetResponseDataTypeFromEndpointMethod<
 *   typeof octokit.orgs.listForAuthenticatedUser  
 * >[0];
 */

// GitHub Repository Interface
// Simplified subset of @octokit/rest repos.listForAuthenticatedUser response
export interface GitHubRepo {
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
  clone_url?: string;
  ssh_url?: string;
  created_at?: string;
  updated_at: string;
  pushed_at?: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  connection?: {
    projectId: string;
    isPrimary: boolean;
  } | null;
  database_id?: string;
  teamId?: string;
}

// GitHub Organization Interface
// Simplified subset of @octokit/rest orgs.listForAuthenticatedUser response
export interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

// Repository Data Structure
export interface ReposData {
  user_repos: GitHubRepo[];
  organizations: GitHubOrganization[];
  org_repos: Record<string, GitHubRepo[]>;
  github_integration_enabled: boolean;
}

/**
 * Mock user repositories
 */
export const mockUserRepos: GitHubRepo[] = [
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
];

/**
 * Mock organizations
 */
export const mockOrganizations: GitHubOrganization[] = [
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
];

/**
 * Mock organization repositories
 */
export const mockOrgRepos: Record<string, GitHubRepo[]> = {
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
};

/**
 * Mock pull requests for testing
 */
export const mockPullRequests: PullRequest[] = [
  {
    id: 101,
    title: 'Add authentication middleware for API endpoints',
    number: 247,
    author: 'testuser',
    author_avatar: 'https://github.com/identicons/testuser.png',
    repository: 'my-awesome-project',
    url: 'https://github.com/testuser/my-awesome-project/pull/247',
    created_at: '2024-01-18T14:30:00Z',
    updated_at: '2024-01-21T10:15:00Z',
    comments_count: 8,
    priority: 'high',
    status: 'ready'
  },
  {
    id: 102,
    title: 'Implement caching layer for database queries',
    number: 156,
    author: 'testuser',
    author_avatar: 'https://github.com/identicons/testuser.png',
    repository: 'my-awesome-project',
    url: 'https://github.com/testuser/my-awesome-project/pull/156',
    created_at: '2024-01-19T09:20:00Z',
    updated_at: '2024-01-20T16:45:00Z',
    comments_count: 12,
    priority: 'medium',
    status: 'ready'
  },
  {
    id: 103,
    title: 'Update documentation for new features',
    number: 89,
    author: 'testuser',
    author_avatar: 'https://github.com/identicons/testuser.png',
    repository: 'personal-website',
    url: 'https://github.com/testuser/personal-website/pull/89',
    created_at: '2024-01-16T11:15:00Z',
    updated_at: '2024-01-19T13:30:00Z',
    comments_count: 3,
    priority: 'low',
    status: 'draft'
  },
  {
    id: 104,
    title: 'Fix responsive design issues on mobile',
    number: 112,
    author: 'testuser',
    author_avatar: 'https://github.com/identicons/testuser.png',
    repository: 'personal-website',
    url: 'https://github.com/testuser/personal-website/pull/112',
    created_at: '2024-01-20T08:45:00Z',
    updated_at: '2024-01-21T14:20:00Z',
    comments_count: 5,
    priority: 'high',
    status: 'changes_requested'
  }
];

/**
 * Get complete mock repositories data
 */
export function getMockReposData(): ReposData {
  return {
    user_repos: mockUserRepos,
    organizations: mockOrganizations,
    org_repos: mockOrgRepos,
    github_integration_enabled: true
  };
}

/**
 * Get mock pull requests data
 */
export function getMockPullRequests(): PullRequest[] {
  return mockPullRequests;
}
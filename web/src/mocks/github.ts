/**
 * Centralized GitHub mock data for development and testing
 * 
 * This file contains mock data for:
 * - GitHub repositories (user and organization repos)
 * - GitHub organizations  
 * - Pull requests
 * 
 * Used by actions when MOCKED=1 or GITHUB_REPOS_MODE=mocked environment variables are set
 * Data is loaded from github-data.yaml for realistic real-world scenarios
 * All data is validated using Zod schemas to ensure type safety
 */

import { PullRequest } from '@/types/reports';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { 
  githubMockDataSchema,
  type GitHubRepo,
  type GitHubOrganization,
  type GitHubMockData,
  type ReposData
} from '@/schemas/github-mock';
import { z } from 'zod';

// Re-export types from schema for backward compatibility
export type { 
  GitHubRepo, 
  GitHubOrganization, 
  ReposData, 
  GitHubMockData 
} from '@/schemas/github-mock';

/**
 * Load mock data from YAML file with Zod validation
 */
function loadMockDataFromYaml(): GitHubMockData {
  try {
    // Use import.meta.url to get current file directory in ES modules
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const yamlPath = path.join(currentDir, 'github-data.yaml');
    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    const rawData = yaml.load(fileContents);
    
    // Validate the data using Zod schema
    const validatedData = githubMockDataSchema.parse(rawData);
    
    // GitHub mock data loaded and validated successfully
    
    // Convert MockPullRequest to PullRequest format for compatibility
    const pullRequests: PullRequest[] = validatedData.pull_requests.map(pr => ({
      ...pr,
      created_at: pr.created_at,
      updated_at: pr.updated_at
    }));
    
    return {
      ...validatedData,
      pull_requests: pullRequests
    } as GitHubMockData & { pull_requests: PullRequest[] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ YAML validation failed:', error.errors);
      console.error('Please check github-data.yaml matches the expected schema');
    } else if (error instanceof Error) {
      console.warn('⚠️ Failed to load YAML mock data:', error.message);
    } else {
      console.warn('⚠️ Unknown error loading YAML mock data:', error);
    }
    
    // Fallback to minimal static data if YAML loading/validation fails
    console.log('ℹ️ Falling back to static mock data');
    return {
      user_repos: mockUserRepos,
      organizations: mockOrganizations,
      org_repos: mockOrgRepos,
      pull_requests: mockPullRequests,
      projects: []
    };
  }
}

// Load data from YAML on module import with proper error handling
let mockData: GitHubMockData & { pull_requests: PullRequest[] };
try {
  mockData = loadMockDataFromYaml();
} catch (error) {
  console.error('Failed to initialize mock data:', error);
  // Initialize with empty validated data as fallback
  mockData = {
    user_repos: [],
    organizations: [],
    org_repos: {},
    pull_requests: [],
    projects: []
  };
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
    user_repos: mockData.user_repos || mockUserRepos,
    organizations: mockData.organizations || mockOrganizations,
    org_repos: mockData.org_repos || mockOrgRepos,
    github_integration_enabled: true
  };
}

/**
 * Get mock pull requests data
 */
export function getMockPullRequests(): PullRequest[] {
  return mockData.pull_requests || mockPullRequests;
}

/**
 * Get mock project data (if available from YAML)
 */
export function getMockProjects() {
  return mockData.projects || [];
}

/**
 * Get specific repository by full name from mock data
 */
export function getMockRepoByFullName(fullName: string): GitHubRepo | undefined {
  const allRepos = [
    ...(mockData.user_repos || []),
    ...Object.values(mockData.org_repos || {}).flat()
  ];
  
  return allRepos.find(repo => repo.full_name === fullName);
}

/**
 * Reload mock data from YAML (useful for testing)
 */
export function reloadMockData(): GitHubMockData & { pull_requests: PullRequest[] } {
  mockData = loadMockDataFromYaml();
  return mockData;
}

/**
 * Validate a GitHub repository object against the schema
 */
export function validateGitHubRepo(repo: unknown): GitHubRepo {
  try {
    return githubMockDataSchema.shape.user_repos.element.parse(repo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid GitHub repository data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Get the current mock data (for debugging/testing)
 */
export function getCurrentMockData(): GitHubMockData & { pull_requests: PullRequest[] } {
  return mockData;
}
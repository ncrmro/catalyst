'use server';

/**
 * Server action to fetch projects data for the current user and organizations
 */

interface ProjectEnvironment {
  id: string;
  name: string;
  type: 'branch_push' | 'cron';
  branch?: string;
  cron_schedule?: string;
  status: 'active' | 'inactive' | 'deploying';
  url?: string;
  last_deployed?: string;
}

interface ProjectRepo {
  id: number;
  name: string;
  full_name: string;
  url: string;
  primary: boolean;
}

interface Project {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url: string;
  };
  repositories: ProjectRepo[];
  environments: ProjectEnvironment[];
  preview_environments_count: number;
  created_at: string;
  updated_at: string;
}

interface ProjectsData {
  projects: Project[];
  total_count: number;
}

/**
 * Mock data for development and testing
 */
function getMockProjectsData(): ProjectsData {
  return {
    projects: [
      {
        id: 'proj-1',
        name: 'foo',
        full_name: 'jdoe/foo',
        description: 'A sample project with multiple environments and repositories',
        owner: {
          login: 'jdoe',
          type: 'User',
          avatar_url: 'https://github.com/identicons/jdoe.png'
        },
        repositories: [
          {
            id: 1001,
            name: 'foo-frontend',
            full_name: 'jdoe/foo-frontend',
            url: 'https://github.com/jdoe/foo-frontend',
            primary: true
          },
          {
            id: 1002,
            name: 'foo-backend',
            full_name: 'jdoe/foo-backend',
            url: 'https://github.com/jdoe/foo-backend',
            primary: false
          },
          {
            id: 1003,
            name: 'foo-shared',
            full_name: 'jdoe/foo-shared',
            url: 'https://github.com/jdoe/foo-shared',
            primary: false
          }
        ],
        environments: [
          {
            id: 'env-1',
            name: 'production',
            type: 'branch_push',
            branch: 'main',
            status: 'active',
            url: 'https://foo.example.com',
            last_deployed: '2024-01-21T14:30:00Z'
          },
          {
            id: 'env-2',
            name: 'staging',
            type: 'branch_push',
            branch: 'develop',
            status: 'active',
            url: 'https://staging-foo.example.com',
            last_deployed: '2024-01-21T12:15:00Z'
          },
          {
            id: 'env-3',
            name: 'nightly-build',
            type: 'cron',
            cron_schedule: '0 2 * * *',
            status: 'active',
            url: 'https://nightly-foo.example.com',
            last_deployed: '2024-01-21T02:00:00Z'
          }
        ],
        preview_environments_count: 7,
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2024-01-21T14:30:00Z'
      },
      {
        id: 'proj-2',
        name: 'bar',
        full_name: 'jdoe/bar',
        description: 'A microservices project with automated deployments',
        owner: {
          login: 'jdoe',
          type: 'User',
          avatar_url: 'https://github.com/identicons/jdoe.png'
        },
        repositories: [
          {
            id: 2001,
            name: 'bar-api',
            full_name: 'jdoe/bar-api',
            url: 'https://github.com/jdoe/bar-api',
            primary: true
          },
          {
            id: 2002,
            name: 'bar-web',
            full_name: 'jdoe/bar-web',
            url: 'https://github.com/jdoe/bar-web',
            primary: false
          }
        ],
        environments: [
          {
            id: 'env-4',
            name: 'production',
            type: 'cron',
            cron_schedule: '0 6 * * 1',
            status: 'active',
            url: 'https://bar.example.com',
            last_deployed: '2024-01-15T06:00:00Z'
          },
          {
            id: 'env-5',
            name: 'staging',
            type: 'branch_push',
            branch: 'main',
            status: 'deploying',
            last_deployed: '2024-01-20T16:45:00Z'
          },
          {
            id: 'env-6',
            name: 'development',
            type: 'branch_push',
            branch: 'develop',
            status: 'active',
            url: 'https://dev-bar.example.com',
            last_deployed: '2024-01-21T09:20:00Z'
          }
        ],
        preview_environments_count: 3,
        created_at: '2023-12-01T08:00:00Z',
        updated_at: '2024-01-21T09:20:00Z'
      },
      {
        id: 'proj-3',
        name: 'analytics-dashboard',
        full_name: 'jdoe/analytics-dashboard',
        description: 'Real-time analytics dashboard with scheduled reports',
        owner: {
          login: 'jdoe',
          type: 'User',
          avatar_url: 'https://github.com/identicons/jdoe.png'
        },
        repositories: [
          {
            id: 3001,
            name: 'analytics-dashboard',
            full_name: 'jdoe/analytics-dashboard',
            url: 'https://github.com/jdoe/analytics-dashboard',
            primary: true
          }
        ],
        environments: [
          {
            id: 'env-7',
            name: 'production',
            type: 'branch_push',
            branch: 'main',
            status: 'active',
            url: 'https://analytics.example.com',
            last_deployed: '2024-01-20T11:00:00Z'
          },
          {
            id: 'env-8',
            name: 'report-generator',
            type: 'cron',
            cron_schedule: '0 0 1 * *',
            status: 'inactive',
            last_deployed: '2024-01-01T00:00:00Z'
          }
        ],
        preview_environments_count: 12,
        created_at: '2024-01-05T14:20:00Z',
        updated_at: '2024-01-20T11:00:00Z'
      }
    ],
    total_count: 3
  };
}

/**
 * Fetch projects data
 * For now, this always returns mocked data, but it could be extended
 * to fetch real data from a projects API in the future
 */
export async function fetchProjects(): Promise<ProjectsData> {
  // For now, always return mocked data
  // In the future, this could check environment variables or user preferences
  console.log('Returning mocked projects data');
  return getMockProjectsData();
}
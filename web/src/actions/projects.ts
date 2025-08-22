'use server';

/**
 * Server action to fetch projects data for the current user and organizations
 */

import { db, projects, repos, projectsRepos } from '@/db';
import { eq } from 'drizzle-orm';

export interface ProjectEnvironment {
  id: string;
  name: string;
  type: 'branch_push' | 'cron';
  branch?: string;
  cron_schedule?: string;
  status: 'active' | 'inactive' | 'deploying';
  url?: string;
  last_deployed?: string;
}

export interface ProjectRepo {
  id: number;
  name: string;
  full_name: string;
  url: string;
  primary: boolean;
}

export interface Project {
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

export interface ProjectsData {
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
 * Fetch projects data from database or fallback to mock data
 */
export async function fetchProjects(): Promise<ProjectsData> {
  // Check if we should return mocked data
  const mocked = process.env.MOCKED;
  
  if (mocked === '1') {
    console.log('Returning mocked projects data');
    return getMockProjectsData();
  }

  try {
    // First, try to fetch from database
    const projectsFromDb = await db
      .select({
        project: projects,
        repo: repos,
        projectRepo: projectsRepos,
      })
      .from(projects)
      .leftJoin(projectsRepos, eq(projects.id, projectsRepos.projectId))
      .leftJoin(repos, eq(projectsRepos.repoId, repos.id));

    if (projectsFromDb.length === 0) {
      console.log('No projects found in database, returning mocked data');
      return getMockProjectsData();
    }

    // Group the results by project
    const projectMap = new Map<string, Project>();

    for (const row of projectsFromDb) {
      const projectData = row.project;
      const repoData = row.repo;
      const projectRepoData = row.projectRepo;

      // Validate project data
      if (!projectData || !projectData.id || !projectData.name || !projectData.fullName) {
        console.warn('Invalid project data found, skipping:', projectData);
        continue;
      }

      if (!projectMap.has(projectData.id)) {
        projectMap.set(projectData.id, {
          id: projectData.id,
          name: projectData.name,
          full_name: projectData.fullName,
          description: projectData.description,
          owner: {
            login: projectData.ownerLogin,
            type: (projectData.ownerType as 'User' | 'Organization') || 'User',
            avatar_url: projectData.ownerAvatarUrl || '',
          },
          repositories: [],
          environments: [], // Mock environments for now
          preview_environments_count: projectData.previewEnvironmentsCount || 0,
          created_at: projectData.createdAt.toISOString(),
          updated_at: projectData.updatedAt.toISOString(),
        });
      }

      // Add repository if it exists and is valid
      if (repoData && projectRepoData && repoData.githubId && repoData.name && repoData.fullName) {
        const project = projectMap.get(projectData.id)!;
        
        // Check if this repository is already added (prevent duplicates)
        const existingRepo = project.repositories.find(r => r.id === repoData.githubId);
        if (!existingRepo) {
          project.repositories.push({
            id: repoData.githubId,
            name: repoData.name,
            full_name: repoData.fullName,
            url: repoData.url,
            primary: projectRepoData.isPrimary || false,
          });
        }
      }
    }

    // Convert to array and add mock environments
    const projectsList = Array.from(projectMap.values()).map(project => ({
      ...project,
      environments: getMockEnvironmentsForProject(project.name),
    }));

    // Validate that we have valid projects
    const validProjects = projectsList.filter(project => 
      project.id && project.name && project.full_name && project.owner.login
    );

    if (validProjects.length === 0) {
      console.warn('No valid projects found in database, falling back to mock data');
      return getMockProjectsData();
    }

    console.log(`Returning ${validProjects.length} projects from database`);
    return {
      projects: validProjects,
      total_count: validProjects.length,
    };

  } catch (error) {
    console.error('Error fetching projects from database:', error);
    console.log('Falling back to mocked data');
    return getMockProjectsData();
  }
}

/**
 * Get mock environments for a project (since environments aren't in the database yet)
 */
function getMockEnvironmentsForProject(projectName: string): ProjectEnvironment[] {
  const baseEnvironments: ProjectEnvironment[] = [
    {
      id: `env-${projectName}-1`,
      name: 'production',
      type: 'branch_push' as const,
      branch: 'main',
      status: 'active' as const,
      url: `https://${projectName}.example.com`,
      last_deployed: new Date().toISOString(),
    },
    {
      id: `env-${projectName}-2`,
      name: 'staging',
      type: 'branch_push' as const,
      branch: 'develop',
      status: 'active' as const,
      url: `https://staging-${projectName}.example.com`,
      last_deployed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
  ];

  // Add a cron environment for some projects
  if (projectName === 'foo' || projectName === 'bar') {
    baseEnvironments.push({
      id: `env-${projectName}-3`,
      name: 'nightly-build',
      type: 'cron' as const,
      cron_schedule: '0 2 * * *',
      status: 'active' as const,
      url: `https://nightly-${projectName}.example.com`,
      last_deployed: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    });
  }

  return baseEnvironments;
}
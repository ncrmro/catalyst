'use server';

/**
 * Server action to fetch projects data for the current user and organizations
 */

import { db, projects, repos, projectsRepos } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { Octokit } from '@octokit/rest';
import { getUserTeamIds } from '@/lib/team-auth';

type ProjectQueryResult = {
  project: typeof projects.$inferSelect;
  repo: typeof repos.$inferSelect | null;
  projectRepo: typeof projectsRepos.$inferSelect | null;
}[];

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
    // Get user's team IDs for authorization
    const userTeamIds = await getUserTeamIds();
    
    // First, try to fetch from database, filtering by team membership
    let projectsFromDb: ProjectQueryResult;
    
    if (userTeamIds.length > 0) {
      // Fetch projects where teamId is in user's teams
      projectsFromDb = await db
        .select({
          project: projects,
          repo: repos,
          projectRepo: projectsRepos,
        })
        .from(projects)
        .leftJoin(projectsRepos, eq(projects.id, projectsRepos.projectId))
        .leftJoin(repos, eq(projectsRepos.repoId, repos.id))
        .where(inArray(projects.teamId, userTeamIds));
    } else {
      // If user has no teams, they have no projects
      projectsFromDb = [];
    }

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

/**
 * Fetch individual project by ID
 */
export async function fetchProjectById(projectId: string): Promise<Project | null> {
  try {
    // First try to get from real database
    if (process.env.MOCKED !== '1') {
      // Get user's team IDs for authorization
      const userTeamIds = await getUserTeamIds();
      
      const projectData = await db
        .select({
          project: projects,
          repo: repos,
          projectRepo: projectsRepos,
        })
        .from(projects)
        .leftJoin(projectsRepos, eq(projects.id, projectsRepos.projectId))
        .leftJoin(repos, eq(projectsRepos.repoId, repos.id))
        .where(eq(projects.id, projectId));

      if (projectData.length > 0) {
        const firstRow = projectData[0];
        if (firstRow.project) {
          // Check if user has access to this project through team membership
          // Allow access if teamId is null (legacy projects) or user is in the team
          if (firstRow.project.teamId && !userTeamIds.includes(firstRow.project.teamId)) {
            return null; // User doesn't have access to this project
          }
          
          const project: Project = {
            id: firstRow.project.id,
            name: firstRow.project.name,
            full_name: firstRow.project.fullName,
            description: firstRow.project.description,
            owner: {
              login: firstRow.project.ownerLogin,
              type: (firstRow.project.ownerType as 'User' | 'Organization') || 'User',
              avatar_url: firstRow.project.ownerAvatarUrl || '',
            },
            repositories: [],
            environments: [],
            preview_environments_count: firstRow.project.previewEnvironmentsCount || 0,
            created_at: firstRow.project.createdAt.toISOString(),
            updated_at: firstRow.project.updatedAt.toISOString(),
          };

          // Collect repositories
          const repoMap = new Map<number, ProjectRepo>();
          for (const row of projectData) {
            if (row.repo && row.projectRepo && row.repo.githubId) {
              repoMap.set(row.repo.githubId, {
                id: row.repo.githubId,
                name: row.repo.name,
                full_name: row.repo.fullName,
                url: row.repo.url,
                primary: row.projectRepo.isPrimary || false,
              });
            }
          }

          project.repositories = Array.from(repoMap.values());
          project.environments = getMockEnvironmentsForProject(project.name);

          return project;
        }
      }
    }

    // Fallback to mock data
    const mockData = getMockProjectsData();
    return mockData.projects.find(p => p.id === projectId) || null;
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    
    // Fallback to mock data
    const mockData = getMockProjectsData();
    return mockData.projects.find(p => p.id === projectId) || null;
  }
}

/**
 * Fetch pull requests for a specific project across all its repositories
 */
export async function fetchProjectPullRequests(projectId: string): Promise<import('@/actions/reports').PullRequest[]> {
  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return [];
    }

    // Check if we should return mocked data
    const mocked = process.env.MOCKED;
    const reposMode = process.env.GITHUB_REPOS_MODE;
    
    if (mocked === '1' || reposMode === 'mocked') {
      console.log('Returning mocked pull requests data for project', projectId);
      // Return mock pull requests filtered by project repositories
      const allMockPRs = getMockPullRequestsData();
      const projectRepoNames = project.repositories.map(repo => repo.full_name);
      
      return allMockPRs.filter(pr => 
        projectRepoNames.some(repoName => pr.repository.includes(repoName.split('/')[1]))
      );
    }

    // Fetch real pull requests from GitHub API
    console.log('Fetching real pull requests for project', projectId);
    return await fetchRealPullRequests(project.repositories);
  } catch (error) {
    console.error('Error fetching project pull requests:', error);
    return [];
  }
}

/**
 * Fetch priority issues for a specific project across all its repositories
 */
export async function fetchProjectIssues(projectId: string): Promise<import('@/actions/reports').Issue[]> {
  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return [];
    }

    // Check if we should return mocked data
    const mocked = process.env.MOCKED;
    const reposMode = process.env.GITHUB_REPOS_MODE;
    
    if (mocked === '1' || reposMode === 'mocked') {
      console.log('Returning mocked issues data for project', projectId);
      // Return mock issues filtered by project repositories
      const allMockIssues = getMockIssuesData();
      const projectRepoNames = project.repositories.map(repo => repo.full_name);
      
      return allMockIssues.filter(issue => 
        projectRepoNames.some(repoName => issue.repository.includes(repoName.split('/')[1]))
      );
    }

    // Fetch real issues from GitHub API
    console.log('Fetching real issues for project', projectId);
    return await fetchRealIssues(project.repositories);
  } catch (error) {
    console.error('Error fetching project issues:', error);
    return [];
  }
}

/**
 * Fetch real pull requests from GitHub API for given repositories
 */
async function fetchRealPullRequests(repositories: ProjectRepo[]): Promise<import('@/actions/reports').PullRequest[]> {
  const session = await auth();
  
  if (!session?.accessToken) {
    console.warn('No GitHub access token found for fetching pull requests');
    return [];
  }

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  const allPullRequests: import('@/actions/reports').PullRequest[] = [];

  for (const repo of repositories) {
    try {
      const [owner, repoName] = repo.full_name.split('/');
      if (!owner || !repoName) {
        console.warn(`Invalid repository name format: ${repo.full_name}`);
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

  return allPullRequests;
}

/**
 * Fetch real issues from GitHub API for given repositories
 */
async function fetchRealIssues(repositories: ProjectRepo[]): Promise<import('@/actions/reports').Issue[]> {
  const session = await auth();
  
  if (!session?.accessToken) {
    console.warn('No GitHub access token found for fetching issues');
    return [];
  }

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  const allIssues: import('@/actions/reports').Issue[] = [];

  for (const repo of repositories) {
    try {
      const [owner, repoName] = repo.full_name.split('/');
      if (!owner || !repoName) {
        console.warn(`Invalid repository name format: ${repo.full_name}`);
        continue;
      }

      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner,
        repo: repoName,
        state: 'open',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
        // Only get issues, not pull requests
        filter: 'all',
      });

      for (const issue of issues) {
        // Skip pull requests (they show up in issues API)
        if (issue.pull_request) {
          continue;
        }

        const labels = issue.labels.map(label => typeof label === 'string' ? label : label.name || '');
        
        // Determine priority based on labels
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (labels.some(label => label.toLowerCase().includes('urgent') || label.toLowerCase().includes('critical') || label.toLowerCase().includes('high'))) {
          priority = 'high';
        } else if (labels.some(label => label.toLowerCase().includes('minor') || label.toLowerCase().includes('low'))) {
          priority = 'low';
        }

        // Determine effort estimate based on labels
        let effort_estimate: 'small' | 'medium' | 'large' = 'medium';
        if (labels.some(label => label.toLowerCase().includes('small') || label.toLowerCase().includes('quick'))) {
          effort_estimate = 'small';
        } else if (labels.some(label => label.toLowerCase().includes('large') || label.toLowerCase().includes('epic'))) {
          effort_estimate = 'large';
        }

        // Determine type based on labels
        let type: 'bug' | 'feature' | 'improvement' | 'idea' = 'improvement';
        if (labels.some(label => label.toLowerCase().includes('bug') || label.toLowerCase().includes('defect'))) {
          type = 'bug';
        } else if (labels.some(label => label.toLowerCase().includes('feature') || label.toLowerCase().includes('enhancement'))) {
          type = 'feature';
        } else if (labels.some(label => label.toLowerCase().includes('idea') || label.toLowerCase().includes('proposal'))) {
          type = 'idea';
        }

        allIssues.push({
          id: issue.id,
          title: issue.title,
          number: issue.number,
          repository: repoName,
          url: issue.html_url,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          labels,
          priority,
          effort_estimate,
          type,
        });
      }
    } catch (error) {
      console.warn(`Could not fetch issues for repository ${repo.full_name}:`, error);
    }
  }

  return allIssues;
}

/**
 * Mock pull requests data for development
 */
function getMockPullRequestsData(): import('@/actions/reports').PullRequest[] {
  return [
    {
      id: 1,
      title: "Add user authentication system",
      number: 42,
      author: "jdoe",
      author_avatar: "https://github.com/identicons/jdoe.png",
      repository: "foo-frontend",
      url: "https://github.com/jdoe/foo-frontend/pull/42",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      comments_count: 5,
      priority: 'high' as const,
      status: 'ready' as const,
    },
    {
      id: 2,
      title: "Fix responsive design issues on mobile",
      number: 38,
      author: "alice",
      author_avatar: "https://github.com/identicons/alice.png",
      repository: "foo-frontend",
      url: "https://github.com/jdoe/foo-frontend/pull/38",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      comments_count: 12,
      priority: 'medium' as const,
      status: 'changes_requested' as const,
    },
    {
      id: 3,
      title: "Optimize database queries for better performance",
      number: 67,
      author: "bob",
      author_avatar: "https://github.com/identicons/bob.png",
      repository: "foo-backend",
      url: "https://github.com/jdoe/foo-backend/pull/67",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      comments_count: 8,
      priority: 'high' as const,
      status: 'ready' as const,
    },
    {
      id: 4,
      title: "Add rate limiting middleware",
      number: 23,
      author: "carol",
      author_avatar: "https://github.com/identicons/carol.png",
      repository: "bar-api",
      url: "https://github.com/jdoe/bar-api/pull/23",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
      comments_count: 3,
      priority: 'medium' as const,
      status: 'draft' as const,
    },
    {
      id: 5,
      title: "Update React components to use hooks",
      number: 15,
      author: "dave",
      author_avatar: "https://github.com/identicons/dave.png",
      repository: "bar-web",
      url: "https://github.com/jdoe/bar-web/pull/15",
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      comments_count: 7,
      priority: 'low' as const,
      status: 'ready' as const,
    },
  ];
}

/**
 * Mock issues data for development
 */
function getMockIssuesData(): import('@/actions/reports').Issue[] {
  return [
    {
      id: 101,
      title: "Memory leak in background job processor",
      number: 178,
      repository: "foo-backend",
      url: "https://github.com/jdoe/foo-backend/issues/178",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ["bug", "critical", "backend"],
      priority: 'high' as const,
      effort_estimate: 'large' as const,
      type: 'bug' as const,
    },
    {
      id: 102,
      title: "Add dark mode support to UI",
      number: 145,
      repository: "foo-frontend",
      url: "https://github.com/jdoe/foo-frontend/issues/145",
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ["enhancement", "ui", "frontend"],
      priority: 'medium' as const,
      effort_estimate: 'medium' as const,
      type: 'feature' as const,
    },
    {
      id: 103,
      title: "Implement caching layer for API responses",
      number: 89,
      repository: "bar-api",
      url: "https://github.com/jdoe/bar-api/issues/89",
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ["performance", "api", "backend"],
      priority: 'high' as const,
      effort_estimate: 'large' as const,
      type: 'improvement' as const,
    },
    {
      id: 104,
      title: "Add integration tests for payment flow",
      number: 56,
      repository: "foo-backend",
      url: "https://github.com/jdoe/foo-backend/issues/56",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ["testing", "integration", "payment"],
      priority: 'medium' as const,
      effort_estimate: 'medium' as const,
      type: 'improvement' as const,
    },
    {
      id: 105,
      title: "Explore using WebSockets for real-time updates",
      number: 203,
      repository: "bar-web",
      url: "https://github.com/jdoe/bar-web/issues/203",
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ["research", "websockets", "realtime"],
      priority: 'low' as const,
      effort_estimate: 'large' as const,
      type: 'idea' as const,
    },
    {
      id: 106,
      title: "Fix Docker container startup issues",
      number: 67,
      repository: "foo-shared",
      url: "https://github.com/jdoe/foo-shared/issues/67",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ["bug", "docker", "infrastructure"],
      priority: 'high' as const,
      effort_estimate: 'small' as const,
      type: 'bug' as const,
    },
  ];
}
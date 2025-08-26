'use server';

import { db, projects, repos, projectsRepos } from '@/db';
import { eq } from 'drizzle-orm';

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
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
}

interface ConnectRepoRequest {
  repoId: number;
  connectionType: 'new' | 'existing';
  projectName?: string;
  projectId?: string;
  description?: string;
  isPrimary: boolean;
  repo: GitHubRepo;
}

interface ConnectRepoResponse {
  success: boolean;
  error?: string;
  projectId?: string;
}

/**
 * Connect a repository to a project (new or existing)
 */
export async function connectRepoToProject(request: ConnectRepoRequest): Promise<ConnectRepoResponse> {
  try {
    const { repoId, connectionType, projectName, projectId, description, isPrimary, repo } = request;

    // Use mocked implementation only if MOCKED env var is set
    if (process.env.MOCKED === '1') {
      // Since we're using mocked data and don't have a real database connection,
      // we'll simulate the operation and return success
      // In a real implementation, this would:
      // 1. Create/find the project
      // 2. Create/find the repository record
      // 3. Create the projects_repos relationship

      if (connectionType === 'new') {
        if (!projectName) {
          return { success: false, error: 'Project name is required for new projects' };
        }

        // Simulate creating a new project
        const newProjectId = `proj-${Date.now()}`;
        
        console.log('Mock: Creating new project', {
          projectId: newProjectId,
          name: projectName,
          fullName: `${repo.owner.login}/${projectName}`,
          description,
          repoId,
          isPrimary
        });

        return { success: true, projectId: newProjectId };
      } else {
        if (!projectId) {
          return { success: false, error: 'Project ID is required for existing projects' };
        }

        // Simulate adding repo to existing project
        console.log('Mock: Adding repository to existing project', {
          projectId,
          repoId,
          isPrimary
        });

        return { success: true, projectId };
      }
    } else {
      // Use the real database implementation
      return await connectRepoToProjectReal(request);
    }
  } catch (error) {
    console.error('Error connecting repository to project:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to connect repository' 
    };
  }
}

/**
 * Real implementation for when database is available
 */
async function connectRepoToProjectReal(request: ConnectRepoRequest): Promise<ConnectRepoResponse> {
  try {
    const { repoId, connectionType, projectName, projectId, description, isPrimary, repo } = request;

    let finalProjectId: string;

    if (connectionType === 'new') {
      if (!projectName) {
        return { success: false, error: 'Project name is required for new projects' };
      }

      // Create new project
      const newProject = await db.insert(projects).values({
        name: projectName,
        fullName: `${repo.owner.login}/${projectName}`,
        description: description || null,
        ownerLogin: repo.owner.login,
        ownerType: repo.owner.type,
        ownerAvatarUrl: repo.owner.avatar_url,
      }).returning();

      finalProjectId = newProject[0].id;
    } else {
      if (!projectId) {
        return { success: false, error: 'Project ID is required for existing projects' };
      }

      // Verify project exists
      const existingProject = await db.select().from(projects).where(eq(projects.id, projectId));
      if (existingProject.length === 0) {
        return { success: false, error: 'Project not found' };
      }

      finalProjectId = projectId;
    }

    // Check if repo already exists
    let repoRecord = await db.select().from(repos).where(eq(repos.githubId, repoId));
    
    if (repoRecord.length === 0) {
      // Create repo record
      const newRepo = await db.insert(repos).values({
        githubId: repoId,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        isPrivate: repo.private,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        ownerLogin: repo.owner.login,
        ownerType: repo.owner.type,
        ownerAvatarUrl: repo.owner.avatar_url,
      }).returning();

      repoRecord = newRepo;
    }

    // If this is set as primary, unset any existing primary repos for this project
    if (isPrimary) {
      await db.update(projectsRepos)
        .set({ isPrimary: false })
        .where(eq(projectsRepos.projectId, finalProjectId));
    }

    // Create the project-repo relationship
    await db.insert(projectsRepos).values({
      projectId: finalProjectId,
      repoId: repoRecord[0].id,
      isPrimary,
    });

    return { success: true, projectId: finalProjectId };
  } catch (error) {
    console.error('Error connecting repository to project:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to connect repository' 
    };
  }
}
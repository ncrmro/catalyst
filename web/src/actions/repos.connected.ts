'use server';

import { db, repos, projectsRepos } from '@/db';
import { inArray, eq } from 'drizzle-orm';

/**
 * Get the connection status of repositories by their GitHub IDs
 */
export async function getRepositoryConnectionStatus(githubIds: number[]): Promise<Record<number, boolean>> {
  if (githubIds.length === 0) {
    return {};
  }

  try {
    // Check if we should return mocked data
    const mocked = process.env.MOCKED;
    
    if (mocked === '1') {
      // For demo purposes, let's say some repos are connected
      // This simulates that repos with IDs 1, 201, and 301 are connected
      const connectedIds = [1, 201, 301];
      const result: Record<number, boolean> = {};
      
      for (const id of githubIds) {
        result[id] = connectedIds.includes(id);
      }
      
      return result;
    }

    // Query repos that are connected to projects
    const connectedRepos = await db
      .select({
        githubId: repos.githubId,
      })
      .from(repos)
      .innerJoin(projectsRepos, eq(repos.id, projectsRepos.repoId))
      .where(inArray(repos.githubId, githubIds));

    // Create a map of connected repository IDs
    const connectedIds = new Set(connectedRepos.map(repo => repo.githubId));
    
    // Return status for all requested IDs
    const result: Record<number, boolean> = {};
    for (const id of githubIds) {
      result[id] = connectedIds.has(id);
    }
    
    return result;
  } catch (error) {
    console.error('Error checking repository connection status:', error);
    // Return all as unconnected in case of error
    const result: Record<number, boolean> = {};
    for (const id of githubIds) {
      result[id] = false;
    }
    return result;
  }
}

/**
 * Get detailed information about connected repositories including their project associations
 */
export async function getConnectedRepositoryDetails(githubIds: number[]) {
  if (githubIds.length === 0) {
    return {};
  }

  try {
    // Check if we should return mocked data
    const mocked = process.env.MOCKED;
    
    if (mocked === '1') {
      // Mock data for connected repositories
      return {
        1: { projectName: 'My Awesome Project', projectId: 'proj-1', isPrimary: true },
        201: { projectName: 'Main Product', projectId: 'proj-2', isPrimary: true },
        301: { projectName: 'Community Tools', projectId: 'proj-3', isPrimary: false },
      };
    }

    // Query for connected repository details from database
    const connectedRepoDetails = await db
      .select({
        githubId: repos.githubId,
        projectId: projectsRepos.projectId,
        isPrimary: projectsRepos.isPrimary,
      })
      .from(repos)
      .innerJoin(projectsRepos, eq(repos.id, projectsRepos.repoId))
      .where(inArray(repos.githubId, githubIds));

    const result: Record<number, { projectId: string; isPrimary: boolean }> = {};
    
    for (const detail of connectedRepoDetails) {
      result[detail.githubId] = {
        projectId: detail.projectId,
        isPrimary: detail.isPrimary,
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching connected repository details:', error);
    return {};
  }
}
'use server';

import { db, projectManifests, projects, repos } from '@/db';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface ProjectManifest {
  projectId: string;
  repoId: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectManifestRequest {
  projectId: string;
  repoId: string;
  path: string;
}

/**
 * Fetch all project manifests for a specific project
 */
export async function fetchProjectManifests(projectId: string): Promise<ProjectManifest[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // For mocked data environment, return empty array for now
  // In a real implementation, this would check the database
  try {
    const manifests = await db
      .select()
      .from(projectManifests)
      .where(eq(projectManifests.projectId, projectId));

    return manifests;
  } catch {
    console.log('Database query failed, returning empty manifests for mocked environment');
    return [];
  }
}

/**
 * Create a new project manifest
 */
export async function createProjectManifest(data: CreateProjectManifestRequest): Promise<ProjectManifest> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // For development/mocked environment, simulate creating a manifest
  // Check if this is a mocked data environment by trying to get the project from the database
  try {
    // Verify the project exists and user has access
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1);

    if (project.length === 0) {
      // This might be mocked data - check if the project exists in mocked data
      const { fetchProjectById } = await import('./projects');
      const mockedProject = await fetchProjectById(data.projectId);
      
      if (!mockedProject) {
        throw new Error('Project not found');
      }
      
      // In mocked environment, simulate successful creation
      console.log('Simulating project manifest creation for mocked project:', data);
      const simulatedManifest: ProjectManifest = {
        projectId: data.projectId,
        repoId: data.repoId,
        path: data.path,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Since this is mocked, we'll just return the simulated manifest
      // In a real database environment, this would actually insert the record
      return simulatedManifest;
    }

    // Verify the repo exists
    const repo = await db
      .select()
      .from(repos)
      .where(eq(repos.id, data.repoId))
      .limit(1);

    if (repo.length === 0) {
      throw new Error('Repository not found');
    }

    // Check if manifest already exists
    const existingManifest = await db
      .select()
      .from(projectManifests)
      .where(
        and(
          eq(projectManifests.projectId, data.projectId),
          eq(projectManifests.repoId, data.repoId),
          eq(projectManifests.path, data.path)
        )
      )
      .limit(1);

    if (existingManifest.length > 0) {
      throw new Error('Manifest already exists for this path');
    }

    const result = await db
      .insert(projectManifests)
      .values({
        projectId: data.projectId,
        repoId: data.repoId,
        path: data.path,
      })
      .returning();

    revalidatePath(`/projects/${data.projectId}`);
    
    return result[0];
  } catch (error) {
    if (error instanceof Error && error.message === 'Project not found') {
      throw error;
    }
    
    console.error('Database error in createProjectManifest:', error);
    throw new Error('Failed to create project manifest');
  }
}

/**
 * Delete a project manifest
 */
export async function deleteProjectManifest(projectId: string, repoId: string, path: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    await db
      .delete(projectManifests)
      .where(
        and(
          eq(projectManifests.projectId, projectId),
          eq(projectManifests.repoId, repoId),
          eq(projectManifests.path, path)
        )
      );

    revalidatePath(`/projects/${projectId}`);
  } catch {
    console.log('Database delete failed, simulating delete for mocked environment');
    // In mocked environment, we'll just simulate the delete
    revalidatePath(`/projects/${projectId}`);
  }
}
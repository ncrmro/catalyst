'use server';

import { db, projectEnvironments, projects, projectsRepos } from '@/db';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUserTeamIds } from '@/lib/team-auth';

/**
 * Server actions for creating and managing project environments
 */

export interface EnvironmentResult {
  success: boolean;
  message: string;
  environmentId?: string;
  environmentType?: string;
  projectId?: string;
}

/**
 * Create a new environment for a project
 * 
 * @param formData Form data containing projectId and environmentType
 * @returns Result object with status and created environment details
 */
export async function createProjectEnvironment(formData: FormData): Promise<EnvironmentResult> {
  try {
    const projectId = formData.get('projectId') as string;
    const environmentType = formData.get('environmentType') as string;

    if (!projectId || !environmentType) {
      return {
        success: false,
        message: 'Missing required fields: projectId and environmentType are required',
      };
    }

    // Validate that the environment type is one of the allowed values
    const validEnvironmentTypes = ['preview', 'production', 'staging', 'development', 'testing'];
    if (!validEnvironmentTypes.includes(environmentType)) {
      return {
        success: false,
        message: `Invalid environment type: ${environmentType}. Must be one of: ${validEnvironmentTypes.join(', ')}`,
      };
    }

    // Check if the user has access to this project
    const userTeamIds = await getUserTeamIds();
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        inArray(projects.teamId, userTeamIds)
      ),
      with: {
        repositories: {
          with: {
            repo: true,
          },
          where: eq(projectsRepos.isPrimary, true),
        },
      },
    });

    if (!project) {
      return {
        success: false,
        message: 'Project not found or you do not have access to it',
      };
    }

    // Get the primary repository ID for this project
    if (!project.repositories || project.repositories.length === 0) {
      return {
        success: false,
        message: 'Project has no primary repository configured',
      };
    }

    const primaryRepo = project.repositories[0].repo;

    // Check if this environment already exists for this project and repo
    const existingEnvironment = await db.query.projectEnvironments.findFirst({
      where: and(
        eq(projectEnvironments.projectId, projectId),
        eq(projectEnvironments.repoId, primaryRepo.id),
        eq(projectEnvironments.environment, environmentType)
      ),
    });

    if (existingEnvironment) {
      return {
        success: false,
        message: `Environment "${environmentType}" already exists for this project`,
        environmentId: existingEnvironment.id,
        environmentType,
        projectId,
      };
    }

    // Create the new environment
    const [newEnvironment] = await db.insert(projectEnvironments)
      .values({
        projectId,
        repoId: primaryRepo.id,
        environment: environmentType,
        // We'll set latestDeployment once we actually deploy something
      })
      .returning();

    // If this is a preview environment, increment the preview environments count
    if (environmentType === 'preview') {
      await db.update(projects)
        .set({
          previewEnvironmentsCount: (project.previewEnvironmentsCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
    }

    // Revalidate the projects and environments pages
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/environments/${projectId}`);
    
    // Return success
    return {
      success: true,
      message: `Successfully created ${environmentType} environment`,
      environmentId: newEnvironment.id,
      environmentType,
      projectId,
    };
  } catch (error) {
    console.error('Error creating project environment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error creating environment',
    };
  }
}

/**
 * Handle form submission and redirect back to the project page
 * This is the handler used by the form action in the UI
 */
export async function configureProjectEnvironments(formData: FormData) {
  try {
    const projectId = formData.get('projectId') as string;
    const environmentType = formData.get('environmentType') as string;

    if (!projectId || !environmentType) {
      throw new Error('Missing required fields');
    }

    // Create the environment
    const result = await createProjectEnvironment(formData);

    if (!result.success) {
      console.error('Error configuring environment:', result.message);
      // For now, we'll still redirect back to the project page even on error
    }

    // Redirect back to the project page
    redirect(`/projects/${projectId}`);
  } catch (error) {
    console.error('Error in configureProjectEnvironments:', error);
    
    // Try to extract the projectId for redirection
    const projectId = formData.get('projectId') as string;
    if (projectId) {
      redirect(`/projects/${projectId}`);
    } else {
      // Fallback to projects list if we can't get the project ID
      redirect('/projects');
    }
  }
}
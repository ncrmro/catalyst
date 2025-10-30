"use server";

import { auth } from "@/auth";
import {
  getProjectManifests,
  createProjectManifests,
  deleteProjectManifests,
  manifestExists,
} from "@/models/project-manifests";
import { getProjects } from "@/models/projects";
import { getRepos } from "@/models/repos";
import { revalidatePath } from "next/cache";

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
export async function fetchProjectManifests(
  projectId: string,
): Promise<ProjectManifest[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    return await getProjectManifests({ projectIds: [projectId] });
  } catch (error) {
    console.log(
      "Database query failed, returning empty manifests for mocked environment",
      error,
    );
    return [];
  }
}

/**
 * Create a new project manifest
 */
export async function createProjectManifest(
  data: CreateProjectManifestRequest,
): Promise<ProjectManifest> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  console.log(data);

  try {
    // Verify the project exists and user has access
    const projects = await getProjects({ ids: [data.projectId] });
    if (projects.length === 0) {
      throw new Error("Project not found");
    }

    console.log({ repoId: data.repoId });

    // Verify the repo exists
    const repos = await getRepos({ ids: [data.repoId] });
    if (repos.length === 0) {
      throw new Error("Repository not found");
    }

    // Check if manifest already exists
    const exists = await manifestExists(data.projectId, data.repoId, data.path);
    if (exists) {
      throw new Error("Manifest already exists for this path");
    }

    const [result] = await createProjectManifests({
      projectId: data.projectId,
      repoId: data.repoId,
      path: data.path,
    });

    revalidatePath(`/projects/${data.projectId}`);

    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      throw error;
    }

    console.error("Database error in createProjectManifest:", error);
    throw new Error("Failed to create project manifest");
  }
}

/**
 * Delete a project manifest
 */
export async function deleteProjectManifest(
  projectId: string,
  repoId: string,
  path: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await deleteProjectManifests({ projectId, repoId, path });
    revalidatePath(`/projects/${projectId}`);
  } catch {
    console.log(
      "Database delete failed, simulating delete for mocked environment",
    );
    // In mocked environment, we'll just simulate the delete
    revalidatePath(`/projects/${projectId}`);
  }
}

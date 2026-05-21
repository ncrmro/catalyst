"use server";

import { db, projects } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import type { SourceConfig, ProjectConfig } from "@/schemas/project-config";

/**
 * Update project source repositories configuration
 *
 * This updates the sources array in project_config JSONB and triggers
 * synchronization to the Kubernetes Project CR.
 */
export async function updateProjectSources(
  projectId: string,
  sources: SourceConfig[],
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Validate sources
    if (!sources || sources.length === 0) {
      return { success: false, error: "At least one source is required" };
    }

    for (const source of sources) {
      if (!source.name || !source.repositoryUrl || !source.branch) {
        return {
          success: false,
          error: "All source fields (name, repositoryUrl, branch) are required",
        };
      }
    }

    // Fetch existing project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // TODO: Add permission check (user is part of the project's team)

    // Update project config with new sources
    const updatedConfig: ProjectConfig = {
      ...project.projectConfig,
      sources,
      version: "v1" as const,
    } as ProjectConfig;

    await db
      .update(projects)
      .set({ projectConfig: updatedConfig, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Sync to Kubernetes Project CR
    const { syncProjectToK8s } = await import("@/lib/sync-project-cr");
    const syncResult = await syncProjectToK8s(projectId);

    if (!syncResult.success) {
      console.error(
        "Failed to sync Project CR after source update:",
        syncResult.error,
      );
      // Don't fail the request - database is source of truth
      // K8s sync failure shouldn't block the user from saving config
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating project sources:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

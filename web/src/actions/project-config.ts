"use server";

import { db, projects } from "@/db";
import { eq } from "drizzle-orm";
import {
  ProjectConfigSchema,
  type ProjectConfig,
} from "@/types/project-config";
import { z } from "zod";
import { auth } from "@/auth";

export async function getProjectConfig(
  projectId: string,
): Promise<ProjectConfig | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // TODO: Add permission check (user is part of the project's team)

  const [project] = await db
    .select({ projectConfig: projects.projectConfig })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return project?.projectConfig || null;
}

export async function updateProjectConfig(
  projectId: string,
  config: ProjectConfig,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // TODO: Add permission check

  try {
    // Validate config
    const validatedConfig = ProjectConfigSchema.parse(config);

    await db
      .update(projects)
      .set({ projectConfig: validatedConfig })
      .where(eq(projects.id, projectId));

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid configuration: " + error.message,
      };
    }
    return { success: false, error: "Failed to update configuration" };
  }
}

export async function validateProjectConfig(
  config: unknown,
): Promise<{ valid: boolean; errors?: z.ZodError }> {
  const result = ProjectConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, errors: result.error };
}

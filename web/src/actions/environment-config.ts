"use server";

import { db, projectEnvironments } from "@/db";
import { eq, and } from "drizzle-orm";
import {
  EnvironmentConfigSchema,
  type EnvironmentConfig,
} from "@/types/environment-config";
import { auth } from "@/auth";
import { z } from "zod";

export async function getEnvironmentConfig(
  projectId: string,
  environmentName: string,
): Promise<EnvironmentConfig | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [result] = await db
    .select({ config: projectEnvironments.config })
    .from(projectEnvironments)
    .where(
      and(
        eq(projectEnvironments.projectId, projectId),
        eq(projectEnvironments.environment, environmentName),
      ),
    )
    .limit(1);

  return result?.config || null;
}

export async function updateEnvironmentConfig(
  projectId: string,
  environmentName: string,
  config: EnvironmentConfig,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const validatedConfig = EnvironmentConfigSchema.parse(config);

    await db
      .update(projectEnvironments)
      .set({ config: validatedConfig })
      .where(
        and(
          eq(projectEnvironments.projectId, projectId),
          eq(projectEnvironments.environment, environmentName),
        ),
      );

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid configuration: " + error.message,
      };
    }
    return { success: false, error: "Failed to update environment config" };
  }
}

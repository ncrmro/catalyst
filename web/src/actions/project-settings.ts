/**
 * Project Settings Actions
 *
 * Server actions for updating project configuration including domain settings.
 */

"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isUserTeamMember } from "@/lib/team-auth";

export interface UpdateProjectDomainSettingsParams {
  projectId: string;
  customDomain?: string | null;
  ingressEnabled: boolean;
  tlsEnabled: boolean;
}

export interface UpdateProjectDomainSettingsResult {
  success: boolean;
  error?: string;
}

/**
 * Update project domain and ingress settings.
 *
 * @param params - Update parameters
 * @returns Update result
 */
export async function updateProjectDomainSettings(
  params: UpdateProjectDomainSettingsParams,
): Promise<UpdateProjectDomainSettingsResult> {
  try {
    const { projectId, customDomain, ingressEnabled, tlsEnabled } = params;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to update project settings",
      };
    }

    // Fetch project to verify team membership
    const project = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return { success: false, error: "Project not found" };
    }

    // Check if user is a member of the project's team
    const hasAccess = await isUserTeamMember(project[0].teamId);
    if (!hasAccess) {
      return {
        success: false,
        error: "Unauthorized: You do not have access to this project",
      };
    }

    // Validate custom domain format if provided
    if (customDomain && customDomain.trim() !== "") {
      const domainRegex =
        /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
      if (!domainRegex.test(customDomain.trim())) {
        return {
          success: false,
          error:
            "Invalid domain format. Please use a valid domain name (e.g., previews.example.com)",
        };
      }
    }

    // Update project settings
    await db
      .update(projects)
      .set({
        customDomain: customDomain?.trim() || null,
        ingressEnabled,
        tlsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Revalidate project pages
    revalidatePath("/projects");
    revalidatePath(`/projects/[slug]`, "page");

    return { success: true };
  } catch (error) {
    console.error("Error updating project domain settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get project domain settings.
 *
 * @param projectId - Project ID
 * @returns Project domain settings
 */
export async function getProjectDomainSettings(projectId: string): Promise<{
  success: boolean;
  settings?: {
    customDomain: string | null;
    ingressEnabled: boolean;
    tlsEnabled: boolean;
  };
  error?: string;
}> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to view project settings",
      };
    }

    // Fetch project with team info
    const result = await db
      .select({
        customDomain: projects.customDomain,
        ingressEnabled: projects.ingressEnabled,
        tlsEnabled: projects.tlsEnabled,
        teamId: projects.teamId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Project not found" };
    }

    // Check if user is a member of the project's team
    const hasAccess = await isUserTeamMember(result[0].teamId);
    if (!hasAccess) {
      return {
        success: false,
        error: "Unauthorized: You do not have access to this project",
      };
    }

    return {
      success: true,
      settings: {
        customDomain: result[0].customDomain,
        ingressEnabled: result[0].ingressEnabled,
        tlsEnabled: result[0].tlsEnabled,
      },
    };
  } catch (error) {
    console.error("Error fetching project domain settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

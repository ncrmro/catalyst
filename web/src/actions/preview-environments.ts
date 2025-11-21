"use server";

/**
 * Server actions for PR Preview Environments
 * Boundary layer between React components and backend models
 */

import { auth } from "@/auth";
import { getUserTeamIds } from "@/lib/team-auth";
import {
  listActivePreviewPods,
  getPreviewPodLogs,
  type GetPreviewPodsParams,
  type PreviewPodWithRelations,
} from "@/models/preview-environments";

// Re-export types for frontend components
export type {
  PreviewPodWithRelations,
} from "@/models/preview-environments";
export type {
  SelectPullRequestPod,
  InsertPullRequestPod,
  PodStatus,
  ResourceAllocation,
  DeploymentComment,
  PreviewEnvironmentConfig,
} from "@/types/preview-environments";

/**
 * T024: Get preview environments with session auth and team filtering
 * Returns all preview environments that the user has access to based on team membership
 */
export async function getPreviewEnvironments(params?: {
  statuses?: Array<'pending' | 'deploying' | 'running' | 'failed' | 'deleting'>;
  namespaces?: string[];
}) {
  // Get session for authentication
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized - authentication required",
      environments: [],
    };
  }

  // Get user's team IDs for authorization
  const userTeamIds = await getUserTeamIds();

  try {
    // Build query parameters with team filtering
    const queryParams: GetPreviewPodsParams = {
      teamIds: userTeamIds,
      statuses: params?.statuses,
      namespaces: params?.namespaces,
    };

    // Fetch preview environments from models layer
    const environments = await listActivePreviewPods(queryParams);

    return {
      success: true,
      environments,
      total: environments.length,
    };
  } catch (error) {
    console.error("Failed to fetch preview environments:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch preview environments",
      environments: [],
    };
  }
}

/**
 * T025: Get single preview environment with authorization
 * Fetches a specific preview environment by ID with team-based access control
 */
export async function getPreviewEnvironment(id: string) {
  // Get session for authentication
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized - authentication required",
      environment: null,
    };
  }

  // Get user's team IDs for authorization
  const userTeamIds = await getUserTeamIds();

  try {
    // Fetch the specific preview environment
    const environments = await listActivePreviewPods({
      ids: [id],
      teamIds: userTeamIds,
    });

    const environment = environments.length > 0 ? environments[0] : null;

    if (!environment) {
      return {
        success: false,
        error: "Preview environment not found or access denied",
        environment: null,
      };
    }

    return {
      success: true,
      environment,
    };
  } catch (error) {
    console.error("Failed to fetch preview environment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch preview environment",
      environment: null,
    };
  }
}

/**
 * T029 (from User Story 2): Get pod logs with session auth and team filtering
 * Returns container logs for a specific preview environment pod
 */
export async function getPodLogs(params: {
  namespace: string;
  podName: string;
  containerName?: string;
  tailLines?: number;
}) {
  // Get session for authentication
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized - authentication required",
      logs: "",
    };
  }

  // Get user's team IDs for authorization
  const userTeamIds = await getUserTeamIds();

  try {
    // First verify the user has access to this preview environment by namespace
    const environments = await listActivePreviewPods({
      namespaces: [params.namespace],
      teamIds: userTeamIds,
    });

    if (environments.length === 0) {
      return {
        success: false,
        error: "Preview environment not found or access denied",
        logs: "",
      };
    }

    // Fetch logs from Kubernetes
    const logs = await getPreviewPodLogs(
      params.namespace,
      params.podName,
      params.containerName,
      params.tailLines || 100
    );

    return {
      success: true,
      logs,
    };
  } catch (error) {
    console.error("Failed to fetch pod logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch pod logs",
      logs: "",
    };
  }
}

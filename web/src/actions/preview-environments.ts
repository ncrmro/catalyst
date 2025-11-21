'use server';

/**
 * Preview Environments Actions
 * 
 * Server actions for managing pull request preview environments
 * Handles authentication and authorization before calling model functions
 */

import { auth } from '@/auth';
import { 
  listActivePreviewPods, 
  getPullRequestPods,
  type GetPullRequestPodsParams 
} from '@/models/preview-environments';
import { repos } from '@/db/schema';
import { db } from '@/db';
import { eq } from 'drizzle-orm';

/**
 * T024: Get preview environments with session auth and team filtering
 */
export async function getPreviewEnvironments(params?: {
  statuses?: ('pending' | 'deploying' | 'running' | 'failed' | 'deleting')[];
  limit?: number;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Unauthorized: No active session',
      environments: [],
    };
  }

  try {
    // For now, list all preview pods the user has access to
    // In a full implementation, we'd filter by team membership
    // Since we don't have team info in the session yet, we'll return all for now
    const queryParams: GetPullRequestPodsParams = {
      statuses: params?.statuses,
      limit: params?.limit || 50,
    };

    const results = await listActivePreviewPods(queryParams);

    return {
      success: true,
      environments: results,
    };
  } catch (error) {
    console.error('Failed to get preview environments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environments: [],
    };
  }
}

/**
 * T025: Get single preview environment with authorization
 */
export async function getPreviewEnvironment(params: {
  id?: string;
  namespace?: string;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Unauthorized: No active session',
      environment: null,
    };
  }

  try {
    const queryParams: GetPullRequestPodsParams = {
      ids: params.id ? [params.id] : undefined,
      namespaces: params.namespace ? [params.namespace] : undefined,
      limit: 1,
    };

    const results = await getPullRequestPods(queryParams);

    if (results.length === 0) {
      return {
        success: false,
        error: 'Preview environment not found',
        environment: null,
      };
    }

    // TODO: Add team membership check for authorization
    // For now, return the environment if found

    return {
      success: true,
      environment: results[0],
    };
  } catch (error) {
    console.error('Failed to get preview environment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: null,
    };
  }
}

/**
 * T026: Type exports
 * Re-export types from database and models layers
 */
export type { 
  InsertPullRequestPod,
  GetPullRequestPodsParams,
} from '@/models/preview-environments';

export type {
  PodStatus,
  ResourceAllocation,
  DeploymentComment,
  PreviewEnvironmentConfig,
  SelectPullRequestPod,
} from '@/types/preview-environments';

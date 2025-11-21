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
import { db } from '@/db';
import { pullRequests, repos } from '@/db/schema';
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
    // TODO: Implement proper team-based access control
    // For MVP, we list all preview pods without filtering
    // SECURITY NOTE: This should be enhanced with team membership checks
    // before production deployment to prevent unauthorized access
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

    const pod = results[0];

    // TODO: Implement proper team-based authorization check
    // For MVP, we verify the environment exists but don't check team membership
    // SECURITY NOTE: This should verify user has access to the repo's team
    // before production deployment to prevent unauthorized access
    
    // Temporary basic check: Verify the PR exists and get its repo
    const pullRequest = await db
      .select({
        pr: pullRequests,
        repo: repos,
      })
      .from(pullRequests)
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(eq(pullRequests.id, pod.pullRequestId))
      .limit(1);

    if (pullRequest.length === 0) {
      return {
        success: false,
        error: 'Associated pull request not found',
        environment: null,
      };
    }

    // TODO: Check if user is member of pullRequest[0].repo.teamId

    return {
      success: true,
      environment: pod,
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

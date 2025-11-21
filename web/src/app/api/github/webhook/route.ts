import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { deleteKubernetesNamespace } from '@/actions/kubernetes';
import { GITHUB_CONFIG } from '@/lib/github';
import { cleanupPullRequestPodJob } from '@/lib/k8s-pull-request-pod';
import { upsertPullRequest, findRepoByGitHubData } from '@/actions/pull-requests-db';
import { createPreviewDeployment } from '@/models/preview-environments';

/**
 * GitHub App Webhook Endpoint
 * 
 * Handles webhook events from GitHub for the GitHub App.
 * This includes installation events, push events, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');
    
    // Verify webhook signature (required for security)
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', GITHUB_CONFIG.WEBHOOK_SECRET)
      .update(body)
      .digest('hex')}`;
    
    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    const payload = JSON.parse(body);
    
    // Handle different webhook events
    switch (event) {
      case 'installation':
        return handleInstallationEvent(payload);
      case 'installation_repositories':
        return handleInstallationRepositoriesEvent(payload);
      case 'push':
        return handlePushEvent(payload);
      case 'pull_request':
        return await handlePullRequestEvent(payload);
      default:
        console.log(`Received unhandled event: ${event}`);
        return NextResponse.json({ 
          success: true, 
          message: `Event ${event} received but not handled`,
          delivery_id: delivery
        });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GitHub App installation events
 */
function handleInstallationEvent(payload: {
  action: string;
  installation: {
    id: number;
    account: { login: string };
    permissions: Record<string, string>;
  };
  sender: { login: string };
}) {
  const { action, installation, sender } = payload;
  
  console.log(`Installation ${action} by ${sender.login}`, {
    installation_id: installation.id,
    account: installation.account.login,
    permissions: installation.permissions
  });
  
  return NextResponse.json({
    success: true,
    message: `Installation ${action} processed`,
    installation_id: installation.id
  });
}

/**
 * Handle installation repositories events
 */
function handleInstallationRepositoriesEvent(payload: {
  action: string;
  installation: { id: number };
  repositories_added?: Array<{ name: string }>;
  repositories_removed?: Array<{ name: string }>;
}) {
  const { action, installation, repositories_added, repositories_removed } = payload;
  
  console.log(`Installation repositories ${action}`, {
    installation_id: installation.id,
    added: repositories_added?.length || 0,
    removed: repositories_removed?.length || 0
  });
  
  return NextResponse.json({
    success: true,
    message: `Installation repositories ${action} processed`
  });
}

/**
 * Handle push events
 */
function handlePushEvent(payload: {
  repository: { full_name: string };
  commits: Array<{ id: string }>;
  pusher: { name: string };
  ref: string;
}) {
  const { repository, commits, pusher } = payload;
  
  console.log(`Push to ${repository.full_name}`, {
    commits_count: commits.length,
    pusher: pusher.name,
    ref: payload.ref
  });
  
  return NextResponse.json({
    success: true,
    message: 'Push event processed',
    commits_processed: commits.length
  });
}

/**
 * T018: Handle pull request events
 * Routes PR events to appropriate handlers based on action
 */
async function handlePullRequestEvent(payload: {
  action: string;
  installation: { id: number };
  pull_request: {
    id: number;
    number: number;
    title: string;
    body?: string;
    state: 'open' | 'closed';
    draft: boolean;
    html_url: string;
    user: { 
      login: string;
      avatar_url?: string;
    };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
    comments: number;
    changed_files?: number;
    additions?: number;
    deletions?: number;
    labels?: Array<{ name: string }>;
    assignees?: Array<{ login: string }>;
    requested_reviewers?: Array<{ login: string }>;
    merged_at?: string;
    closed_at?: string;
    created_at: string;
    updated_at: string;
  };
  repository: { 
    id: number;
    full_name: string;
    owner: { login: string };
    name: string;
  };
}) {
  // T023: Error handling - wrap entire handler to always return 200 OK
  try {
    const { action, installation, pull_request, repository } = payload;
    
    console.log(`Pull request ${action} in ${repository.full_name}`, {
      pr_number: pull_request.number,
      title: pull_request.title,
      author: pull_request.user.login,
      commit_sha: pull_request.head.sha
    });

    // Find the repository in our database
    const repoResult = await findRepoByGitHubData(repository.id);
    
    // Create/update pull request record in database first
    let pullRequestId: string | undefined;
    
    if (repoResult.success && repoResult.repo) {
      try {
        // Determine status based on draft and state
        let status: 'draft' | 'ready' | 'changes_requested' = 'ready';
        if (pull_request.draft) {
          status = 'draft';
        }

        // Determine state - GitHub uses 'open'/'closed', we need to check if it was merged
        let state: 'open' | 'closed' | 'merged' = pull_request.state;
        if (pull_request.state === 'closed' && pull_request.merged_at) {
          state = 'merged';
        }

        const prData = {
          repoId: repoResult.repo.id,
          provider: 'github',
          providerPrId: pull_request.id.toString(),
          number: pull_request.number,
          title: pull_request.title,
          description: pull_request.body || undefined,
          state,
          status,
          url: pull_request.html_url,
          authorLogin: pull_request.user.login,
          authorAvatarUrl: pull_request.user.avatar_url,
          headBranch: pull_request.head.ref,
          baseBranch: pull_request.base.ref,
          commentsCount: pull_request.comments || 0,
          reviewsCount: 0,
          changedFilesCount: pull_request.changed_files || 0,
          additionsCount: pull_request.additions || 0,
          deletionsCount: pull_request.deletions || 0,
          priority: 'medium' as const,
          labels: pull_request.labels?.map(l => l.name) || [],
          assignees: pull_request.assignees?.map(a => a.login) || [],
          reviewers: pull_request.requested_reviewers?.map(r => r.login) || [],
          mergedAt: pull_request.merged_at ? new Date(pull_request.merged_at) : undefined,
          closedAt: pull_request.closed_at ? new Date(pull_request.closed_at) : undefined,
        };

        const dbResult = await upsertPullRequest(prData);
        if (dbResult.success && dbResult.pullRequest) {
          pullRequestId = dbResult.pullRequest.id;
          console.log(`Pull request ${dbResult.operation}d in database:`, {
            pr_id: pullRequestId,
            provider_pr_id: pull_request.id,
            number: pull_request.number
          });
        } else {
          console.error(`Failed to ${dbResult.operation} pull request in database:`, dbResult.error);
        }
      } catch (error) {
        console.error('Error processing pull request for database:', error);
      }
    } else {
      console.warn(`Repository with GitHub ID ${repository.id} not found in database. Skipping PR database operation.`);
    }

    // T019: Handle 'opened' action - create preview deployment
    if (action === 'opened' && pullRequestId) {
      return await handlePullRequestOpened({
        pullRequestId,
        commitSha: pull_request.head.sha,
        branch: pull_request.head.ref,
        repoFullName: repository.full_name,
        prNumber: pull_request.number,
        installationId: installation.id,
        repoUrl: `https://github.com/${repository.full_name}.git`,
      });
    }

    // T020: Handle 'synchronize' action - redeploy on new commits
    if (action === 'synchronize' && pullRequestId) {
      return await handlePullRequestSynchronize({
        pullRequestId,
        commitSha: pull_request.head.sha,
        branch: pull_request.head.ref,
        repoFullName: repository.full_name,
        prNumber: pull_request.number,
        installationId: installation.id,
        repoUrl: `https://github.com/${repository.full_name}.git`,
      });
    }

    // T021: Handle 'reopened' action - recreate preview environment
    if (action === 'reopened' && pullRequestId) {
      return await handlePullRequestReopened({
        pullRequestId,
        commitSha: pull_request.head.sha,
        branch: pull_request.head.ref,
        repoFullName: repository.full_name,
        prNumber: pull_request.number,
        installationId: installation.id,
        repoUrl: `https://github.com/${repository.full_name}.git`,
      });
    }

    // Delete namespace when PR is closed
    if (action === 'closed') {
      try {
        const [owner, repo] = repository.full_name.split('/');
        const environment = `gh-pr-${pull_request.number}`;
        
        // Clean up pull request pod job resources
        try {
          const prJobName = `pr-${pull_request.number}-${repository.name}`;
          await cleanupPullRequestPodJob(prJobName, 'default');
          console.log(`Pull request pod job cleaned up for PR ${pull_request.number}`);
        } catch (podJobError) {
          console.error(`Failed to cleanup pull request pod job for PR ${pull_request.number}:`, podJobError);
        }
        
        const deleteResult = await deleteKubernetesNamespace(owner, repo, environment);
        
        if (deleteResult.success) {
          return NextResponse.json({
            success: true,
            message: `Pull request ${action} processed and namespace deleted`,
            pr_number: pull_request.number,
            namespace_deleted: deleteResult.namespaceName
          });
        } else {
          console.error(`Failed to delete namespace for PR ${pull_request.number}:`, deleteResult.error);
          return NextResponse.json({
            success: true,
            message: `Pull request ${action} processed but namespace deletion failed`,
            pr_number: pull_request.number,
            namespace_error: deleteResult.error
          });
        }
      } catch (error) {
        console.error(`Error deleting namespace for PR ${pull_request.number}:`, error);
        return NextResponse.json({
          success: true,
          message: `Pull request ${action} processed but namespace deletion failed`,
          pr_number: pull_request.number,
          namespace_error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Pull request ${action} processed`,
      pr_number: pull_request.number
    });
  } catch (error) {
    // T023: Always return 200 OK to prevent GitHub retries
    console.error('Webhook processing error for pull request event:', error);
    return NextResponse.json({
      success: true, // Return success to prevent retries
      message: 'Pull request event received but processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * T019: Handle PR opened event - create preview deployment
 */
async function handlePullRequestOpened(params: {
  pullRequestId: string;
  commitSha: string;
  branch: string;
  repoFullName: string;
  prNumber: number;
  installationId: number;
  repoUrl: string;
}) {
  try {
    // T022: Idempotency is handled in createPreviewDeployment via unique constraint
    const result = await createPreviewDeployment(params);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Pull request opened - preview deployment created`,
        pr_number: params.prNumber,
        pod: result.pod
      });
    } else {
      console.error(`Failed to create preview deployment for PR ${params.prNumber}:`, result.error);
      return NextResponse.json({
        success: true, // Still return success to prevent retries
        message: `Pull request opened but preview deployment failed`,
        pr_number: params.prNumber,
        error: result.error
      });
    }
  } catch (error) {
    console.error(`Error in handlePullRequestOpened for PR ${params.prNumber}:`, error);
    return NextResponse.json({
      success: true,
      message: `Pull request opened but preview deployment failed`,
      pr_number: params.prNumber,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * T020: Handle PR synchronize event - redeploy on new commits
 */
async function handlePullRequestSynchronize(params: {
  pullRequestId: string;
  commitSha: string;
  branch: string;
  repoFullName: string;
  prNumber: number;
  installationId: number;
  repoUrl: string;
}) {
  try {
    // T022: Idempotency check - createPreviewDeployment handles duplicate commits
    const result = await createPreviewDeployment(params);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Pull request synchronized - preview redeployed`,
        pr_number: params.prNumber,
        pod: result.pod
      });
    } else {
      console.error(`Failed to redeploy preview for PR ${params.prNumber}:`, result.error);
      return NextResponse.json({
        success: true,
        message: `Pull request synchronized but preview redeployment failed`,
        pr_number: params.prNumber,
        error: result.error
      });
    }
  } catch (error) {
    console.error(`Error in handlePullRequestSynchronize for PR ${params.prNumber}:`, error);
    return NextResponse.json({
      success: true,
      message: `Pull request synchronized but preview redeployment failed`,
      pr_number: params.prNumber,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * T021: Handle PR reopened event - recreate preview environment
 */
async function handlePullRequestReopened(params: {
  pullRequestId: string;
  commitSha: string;
  branch: string;
  repoFullName: string;
  prNumber: number;
  installationId: number;
  repoUrl: string;
}) {
  try {
    // T022: Idempotency is handled in createPreviewDeployment
    const result = await createPreviewDeployment(params);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Pull request reopened - preview deployment recreated`,
        pr_number: params.prNumber,
        pod: result.pod
      });
    } else {
      console.error(`Failed to recreate preview deployment for PR ${params.prNumber}:`, result.error);
      return NextResponse.json({
        success: true,
        message: `Pull request reopened but preview deployment failed`,
        pr_number: params.prNumber,
        error: result.error
      });
    }
  } catch (error) {
    console.error(`Error in handlePullRequestReopened for PR ${params.prNumber}:`, error);
    return NextResponse.json({
      success: true,
      message: `Pull request reopened but preview deployment failed`,
      pr_number: params.prNumber,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

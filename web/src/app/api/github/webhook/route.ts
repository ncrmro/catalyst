import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createKubernetesNamespace, deleteKubernetesNamespace } from '../../../../actions/kubernetes';
import { debug } from '../../../../lib/debug';

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
    
    // Verify webhook signature (optional but recommended for production)
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')}`;
      
      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
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
        debug(`Received unhandled event: ${event}`);
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
  
  debug(`Installation ${action} by ${sender.login}`, {
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
  
  debug(`Installation repositories ${action}`, {
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
  
  debug(`Push to ${repository.full_name}`, {
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
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: {
  action: string;
  pull_request: {
    number: number;
    title: string;
    user: { login: string };
  };
  repository: { full_name: string };
}) {
  const { action, pull_request, repository } = payload;
  
  debug(`Pull request ${action} in ${repository.full_name}`, {
    pr_number: pull_request.number,
    title: pull_request.title,
    author: pull_request.user.login
  });

  // Create namespace when PR is opened
  if (action === 'opened') {
    try {
      // Extract team and project from repository full_name (owner/repo)
      const [owner, repo] = repository.full_name.split('/');
      const environment = `gh-pr-${pull_request.number}`;
      
      const namespaceResult = await createKubernetesNamespace(owner, repo, environment);
      
      if (namespaceResult.success) {
        debug(`Namespace created for PR ${pull_request.number}:`, namespaceResult.namespace?.name);
        return NextResponse.json({
          success: true,
          message: `Pull request ${action} processed and namespace created`,
          pr_number: pull_request.number,
          namespace: namespaceResult.namespace
        });
      } else {
        console.error(`Failed to create namespace for PR ${pull_request.number}:`, namespaceResult.error);
        return NextResponse.json({
          success: true,
          message: `Pull request ${action} processed but namespace creation failed`,
          pr_number: pull_request.number,
          namespace_error: namespaceResult.error
        });
      }
    } catch (error) {
      console.error(`Error creating namespace for PR ${pull_request.number}:`, error);
      return NextResponse.json({
        success: true,
        message: `Pull request ${action} processed but namespace creation failed`,
        pr_number: pull_request.number,
        namespace_error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete namespace when PR is closed
  if (action === 'closed') {
    try {
      // Extract team and project from repository full_name (owner/repo)
      const [owner, repo] = repository.full_name.split('/');
      const environment = `gh-pr-${pull_request.number}`;
      
      const deleteResult = await deleteKubernetesNamespace(owner, repo, environment);
      
      if (deleteResult.success) {
        debug(`Namespace deleted for PR ${pull_request.number}:`, deleteResult.namespaceName);
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
}
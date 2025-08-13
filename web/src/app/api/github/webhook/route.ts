import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  findWorkloadConfig, 
  shouldTriggerDeployment, 
  createPRWorkloadConfig 
} from '../../../../lib/workload-config';
import { kubernetesService } from '../../../../lib/kubernetes-service';

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
        return handlePullRequestEvent(payload);
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
 * Handle push events and trigger workload deployments
 */
async function handlePushEvent(payload: {
  repository: { full_name: string };
  commits: Array<{ id: string }>;
  pusher: { name: string };
  ref: string;
}) {
  const { repository, commits, pusher } = payload;
  const branch = payload.ref.replace('refs/heads/', '');
  
  console.log(`Push to ${repository.full_name}`, {
    commits_count: commits.length,
    pusher: pusher.name,
    ref: payload.ref,
    branch
  });

  // Check if this branch should trigger a deployment
  if (shouldTriggerDeployment(branch)) {
    const workloadConfig = findWorkloadConfig(repository.full_name, branch);
    
    if (workloadConfig) {
      console.log(`Triggering deployment for ${repository.full_name}:${branch}`, {
        releaseName: workloadConfig.releaseName,
        namespace: workloadConfig.namespace,
        environment: workloadConfig.environment
      });

      try {
        // Deploy the workload
        const deploymentResult = await kubernetesService.deployWorkload(workloadConfig);
        
        if (deploymentResult.success) {
          // Run tests if enabled
          if (workloadConfig.enableTests) {
            console.log(`Running tests for ${workloadConfig.releaseName}`);
            const testResult = await kubernetesService.runTests(workloadConfig);
            
            return NextResponse.json({
              success: true,
              message: 'Push event processed with deployment and tests',
              commits_processed: commits.length,
              deployment: deploymentResult,
              tests: testResult
            });
          }
          
          return NextResponse.json({
            success: true,
            message: 'Push event processed with deployment',
            commits_processed: commits.length,
            deployment: deploymentResult
          });
        } else {
          console.error(`Deployment failed for ${repository.full_name}:${branch}`, deploymentResult.error);
          return NextResponse.json({
            success: false,
            message: 'Push event processed but deployment failed',
            commits_processed: commits.length,
            deployment: deploymentResult
          });
        }
      } catch (error) {
        console.error('Deployment error:', error);
        return NextResponse.json({
          success: false,
          message: 'Push event processed but deployment error occurred',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      console.log(`No workload configuration found for ${repository.full_name}:${branch}`);
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Push event processed',
    commits_processed: commits.length
  });
}

/**
 * Handle pull request events and manage PR environments
 */
async function handlePullRequestEvent(payload: {
  action: string;
  pull_request: {
    number: number;
    title: string;
    user: { login: string };
    head: { ref: string };
    base: { ref: string };
  };
  repository: { full_name: string };
}) {
  const { action, pull_request, repository } = payload;
  
  console.log(`Pull request ${action} in ${repository.full_name}`, {
    pr_number: pull_request.number,
    title: pull_request.title,
    author: pull_request.user.login,
    head_branch: pull_request.head.ref,
    base_branch: pull_request.base.ref
  });

  try {
    switch (action) {
      case 'opened':
      case 'synchronize':
        // Create or update PR environment
        const baseConfig = findWorkloadConfig(repository.full_name, pull_request.base.ref);
        const prConfig = createPRWorkloadConfig(repository.full_name, pull_request.number, baseConfig || undefined);
        
        if (!prConfig) {
          return NextResponse.json({
            success: true,
            message: `Pull request ${action} processed (no environment changes)`,
            pr_number: pull_request.number
          });
        }
        
        console.log(`Creating PR environment for PR #${pull_request.number}`, {
          releaseName: prConfig.releaseName,
          namespace: prConfig.namespace
        });

        const deploymentResult = await kubernetesService.deployWorkload(prConfig);
        
        if (deploymentResult.success && prConfig.enableTests) {
          const testResult = await kubernetesService.runTests(prConfig);
          
          return NextResponse.json({
            success: true,
            message: `Pull request ${action} processed with PR environment and tests`,
            pr_number: pull_request.number,
            deployment: deploymentResult,
            tests: testResult
          });
        }
        
        return NextResponse.json({
          success: true,
          message: `Pull request ${action} processed with PR environment`,
          pr_number: pull_request.number,
          deployment: deploymentResult
        });

      case 'closed':
        // Clean up PR environment
        const prReleaseName = `pr-${repository.full_name.split('/').pop()}-${pull_request.number}`.toLowerCase();
        const prNamespace = `pr-${pull_request.number}`;
        
        console.log(`Cleaning up PR environment for PR #${pull_request.number}`, {
          releaseName: prReleaseName,
          namespace: prNamespace
        });

        const deleteSuccess = await kubernetesService.deleteWorkload(prReleaseName, prNamespace);
        
        return NextResponse.json({
          success: true,
          message: `Pull request ${action} processed with environment cleanup`,
          pr_number: pull_request.number,
          cleanup_success: deleteSuccess
        });

      default:
        return NextResponse.json({
          success: true,
          message: `Pull request ${action} processed (no environment changes)`,
          pr_number: pull_request.number
        });
    }
  } catch (error) {
    console.error('PR environment management error:', error);
    return NextResponse.json({
      success: false,
      message: `Pull request ${action} processed but environment management failed`,
      pr_number: pull_request.number,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
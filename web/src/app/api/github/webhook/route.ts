import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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
 * Handle pull request events
 */
function handlePullRequestEvent(payload: {
  action: string;
  pull_request: {
    number: number;
    title: string;
    user: { login: string };
  };
  repository: { full_name: string };
}) {
  const { action, pull_request, repository } = payload;
  
  console.log(`Pull request ${action} in ${repository.full_name}`, {
    pr_number: pull_request.number,
    title: pull_request.title,
    author: pull_request.user.login
  });
  
  return NextResponse.json({
    success: true,
    message: `Pull request ${action} processed`,
    pr_number: pull_request.number
  });
}
#!/usr/bin/env ts-node

import * as crypto from 'crypto';
import axios from 'axios';
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface PullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    user: { login: string };
  };
  repository: { full_name: string };
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('url', {
    type: 'string',
    description: 'Target webhook URL',
    default: 'https://catalyst.ncrmro.com/api/github/webhook',
  })
  .option('secret', {
    type: 'string',
    description: 'GitHub webhook secret',
    demandOption: true,
  })
  .option('repo', {
    type: 'string',
    description: 'Repository full name (e.g., "owner/repo")',
    default: 'testorg/testrepo',
  })
  .option('pr', {
    type: 'number',
    description: 'Pull request number',
    default: 42,
  })
  .option('action', {
    type: 'string',
    description: 'Pull request action (opened, closed, etc.)',
    default: 'opened',
    choices: ['opened', 'closed', 'synchronize', 'reopened'],
  })
  .option('title', {
    type: 'string',
    description: 'Pull request title',
    default: 'Test Pull Request',
  })
  .option('user', {
    type: 'string',
    description: 'GitHub username of PR creator',
    default: 'testuser',
  })
  .help()
  .alias('h', 'help')
  .parseSync();

/**
 * Generate the HMAC SHA-256 signature for the webhook payload
 */
function createSignature(payload: string, secret: string): string {
  return `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
}

/**
 * Send a GitHub webhook for a pull request event
 */
async function sendGitHubWebhook() {
  try {
    // Create the webhook payload
    const payload: PullRequestPayload = {
      action: argv.action,
      pull_request: {
        number: argv.pr,
        title: argv.title,
        user: { login: argv.user },
      },
      repository: { full_name: argv.repo },
    };

    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, argv.secret);
    const deliveryId = crypto.randomUUID();

    console.log(`Sending ${argv.action} pull request webhook to ${argv.url}`);
    console.log(`Repository: ${argv.repo}, PR #${argv.pr}`);

    // Send the webhook
    const response = await axios.post(argv.url, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-GitHub-Delivery': deliveryId,
        'X-Hub-Signature-256': signature,
      },
    });

    console.log('Webhook sent successfully!');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to send webhook:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

// Execute the function
sendGitHubWebhook();
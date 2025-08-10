# GitHub App Setup Guide

This document explains how to set up and configure the GitHub App integration for the Catalyst application.

## Overview

The Catalyst web application provides endpoints for registering and managing a public GitHub App. This allows users to install the app on their repositories and enables the application to interact with GitHub on their behalf.

## Prerequisites

- A GitHub account with organization admin rights (if installing on an organization)
- Node.js and npm installed
- Access to the Catalyst web application

## GitHub App Creation

### Step 1: Create a GitHub App

1. Navigate to your GitHub settings:
   - For personal apps: `https://github.com/settings/apps`
   - For organization apps: `https://github.com/organizations/YOUR_ORG/settings/apps`

2. Click "New GitHub App"

3. Fill in the required information:
   - **GitHub App name**: Choose a unique name (e.g., "Catalyst App")
   - **Description**: Brief description of your app
   - **Homepage URL**: Your application's homepage
   - **Webhook URL**: `https://your-domain.com/api/github/webhook`
   - **Webhook secret**: Generate a secure random string

### Step 2: Configure Permissions

Set the following permissions based on your needs:

#### Repository permissions:
- **Contents**: Read & Write (to access repository files)
- **Issues**: Read & Write (if working with issues)
- **Pull requests**: Read & Write (if working with PRs)
- **Metadata**: Read (basic repository info)

#### Organization permissions:
- **Members**: Read (if needed)

#### Account permissions:
- **Email addresses**: Read (if needed)

### Step 3: Subscribe to Events

Subscribe to relevant webhook events:
- [x] Installation
- [x] Installation repositories
- [x] Push
- [x] Pull request
- [x] Issues (if applicable)

### Step 4: Installation Options

Choose who can install the app:
- **Only on this account**: Limits installation to your account/organization
- **Any account**: Allows public installation

## Environment Configuration

Create a `.env.local` file in the web directory with the following variables:

```env
# GitHub App Configuration
GITHUB_APP_ID=your_app_id_here
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your_private_key_here
-----END RSA PRIVATE KEY-----"

# Application Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Getting GitHub App Credentials

1. **App ID**: Found on your GitHub App's settings page
2. **Client ID**: Found on your GitHub App's settings page
3. **Client Secret**: Generate and copy from the GitHub App settings
4. **Webhook Secret**: The secret you created during app setup
5. **Private Key**: Generate and download from the GitHub App settings

## API Endpoints

The application provides the following endpoints:

### Registration Endpoint
- **URL**: `/api/github/register`
- **Methods**: GET, POST
- **Description**: Initiates GitHub App installation process

**GET Example**:
```bash
curl https://your-domain.com/api/github/register?state=user123
```

**Response**:
```json
{
  "success": true,
  "message": "GitHub App registration initiated",
  "installation_url": "https://github.com/apps/your-app/installations/new?state=user123",
  "state": "user123"
}
```

### Webhook Endpoint
- **URL**: `/api/github/webhook`
- **Method**: POST
- **Description**: Receives GitHub webhook events

### OAuth Callback Endpoint
- **URL**: `/api/github/callback`
- **Method**: GET
- **Description**: Handles OAuth callbacks after app installation

## Installation Flow

### For End Users

1. **Initiate Installation**:
   - Visit your application
   - Click the "Install GitHub App" button
   - Or make a GET request to `/api/github/register`

2. **GitHub Installation**:
   - User is redirected to GitHub
   - They select repositories to install the app on
   - They confirm the installation

3. **Callback Processing**:
   - GitHub redirects back to `/api/github/callback`
   - The application processes the installation
   - User sees confirmation of successful installation

### Installation URL Parameters

When redirected back from GitHub, the callback will receive:
- `installation_id`: Unique ID for this installation
- `setup_action`: Type of action (install, update, request)
- `state`: Optional state parameter for tracking

## Testing the Integration

### 1. Local Development

```bash
# Start the development server
cd web
npm run dev

# Test the registration endpoint
curl http://localhost:3000/api/github/register
```

### 2. Webhook Testing

Use tools like ngrok to expose your local server for webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Update your GitHub App webhook URL to the ngrok URL
# Example: https://abc123.ngrok.io/api/github/webhook
```

### 3. Manual Testing

1. Navigate to your GitHub App's public page
2. Click "Install" 
3. Select repositories
4. Verify the callback is received
5. Check application logs for successful processing

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**:
   - Verify webhook URL is accessible from the internet
   - Check webhook secret configuration
   - Ensure webhook is active in GitHub App settings

2. **Installation fails**:
   - Verify callback URL is correct
   - Check application logs for errors
   - Ensure all required environment variables are set

3. **Permission errors**:
   - Review GitHub App permissions
   - Ensure app has necessary repository access
   - Check if installation was approved (for organizations)

### Debug Mode

Set the following environment variable for verbose logging:

```env
NODE_ENV=development
DEBUG=github:*
```

## Security Considerations

1. **Webhook Signature Verification**: Always verify webhook signatures in production
2. **Secure Storage**: Store GitHub App credentials securely
3. **HTTPS Only**: Use HTTPS for all webhook URLs
4. **State Parameter**: Use state parameter to prevent CSRF attacks
5. **Minimal Permissions**: Request only necessary permissions

## Production Deployment

1. Set all environment variables in your production environment
2. Update GitHub App webhook URL to production URL
3. Ensure proper error logging and monitoring
4. Set up health checks for webhook endpoint
5. Configure rate limiting if needed

## Support

For issues or questions:
1. Check the application logs
2. Verify GitHub App configuration
3. Test webhook connectivity
4. Review this documentation

## Additional Resources

- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [GitHub Webhooks Guide](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [Octokit Documentation](https://github.com/octokit)
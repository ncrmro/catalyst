# GitHub Personal Access Token Setup for Local Development

For local development, you can use a GitHub Personal Access Token (PAT) instead of going through the GitHub App OAuth flow. This is especially useful for testing pull request functionality.

## Creating a GitHub PAT

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set an expiration date (recommended: 90 days for security)
4. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `read:user` (Read access to profile info)
   - `user:email` (Access to user email addresses)
   - `read:org` (Read access to organization data)

## Environment Setup

Add your PAT to your local environment by setting one of these environment variables:

```bash
# Option 1: GITHUB_PAT (recommended)
export GITHUB_PAT=your_personal_access_token_here

# Option 2: GITHUB_TOKEN (alternative)
export GITHUB_TOKEN=your_personal_access_token_here
```

Or add to your `.env.local` file:

```bash
GITHUB_PAT=your_personal_access_token_here
```

## Usage

When a PAT is detected in the environment variables, the pull requests page will:

1. **Prioritize PAT over GitHub App tokens** - PAT is checked first
2. **Show authentication method** - The UI displays "🔑 Auth: Personal Access Token" 
3. **Fetch all your pull requests** - Uses your PAT to access GitHub API
4. **Log PAT usage** - Console shows "Using GitHub Personal Access Token for pull requests"

## Benefits for Local Development

- **No OAuth flow needed** - Skip the GitHub App authentication step
- **Full access** - PATs often have broader permissions than app tokens
- **Easy testing** - Quick setup for testing pull request features
- **Debugging** - Clear indication in UI when PAT is being used

## Security Notes

- **Never commit PATs** - Add `.env.local` to your `.gitignore`
- **Use expiration dates** - Set reasonable expiration times
- **Minimal scopes** - Only grant necessary permissions
- **Rotate regularly** - Generate new tokens periodically

## Troubleshooting

If you're not seeing pull requests:
1. Verify PAT has correct scopes (especially `repo`)
2. Check console logs for "Using GitHub Personal Access Token" message
3. Ensure you have open pull requests in your repositories
4. Verify the PAT hasn't expired

The system will automatically fall back to GitHub App tokens if no PAT is found in environment variables.
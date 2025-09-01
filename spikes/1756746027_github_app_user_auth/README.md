# GitHub App User Authentication Migration for Catalyst Web App

## Overview

This spike continues the work on migrating the Catalyst web application from GitHub OAuth2 authentication to GitHub Apps authentication using the "on behalf of a user" flow. The GitHub App has already been created and configured in our organization settings. This spike focuses on implementing the authentication flow and token management in the web application to complete the migration. This approach will enhance our GitHub integration capabilities with more granular permissions and higher API rate limits.

## Current Implementation

The Catalyst web app currently implements GitHub authentication using OAuth2:

- Authentication configured in `/web/src/lib/auth.config.ts`
- OAuth flow managed by NextAuth in `/web/src/auth.ts`
- GitHub access tokens stored in user sessions
- These tokens used for API calls in components like `/web/src/actions/pull-requests.ts`
- Broad permission scope: `read:user user:email read:org repo`

## Goals

1. Replace GitHub OAuth authentication with GitHub App user authentication
2. Maintain or improve user experience during authentication
3. Implement more granular permission scoping
4. Establish a secure token management system
5. Support token refresh without requiring user re-authentication

## Technical Investigation

### 1. GitHub App Configuration (✓ Already Completed)

- ✓ GitHub App already created in the GitHub organization settings
- ✓ Permissions configured based on app functionality:
  - Repository contents: Read (for accessing repo files)
  - Pull requests: Read (for PR listing/details)
  - Metadata: Read (for basic repo information)
- ✓ User Authorization callback URL set up
- ✓ Private key generated and securely stored

### 2. Authentication Flow Changes

Update the authentication flow in the Next.js application:

1. Replace OAuth provider in `web/src/lib/auth.config.ts` with GitHub App configuration
2. Implement the GitHub App authorization URL construction
3. Handle the authorization callback to exchange code for user tokens
4. Store both user access token and refresh token securely

### 3. Token Management System

Develop a token management system:

```
web/src/lib/github-app/
├── auth.ts          # Authentication flow
├── tokens.ts        # Token storage and refresh
└── api-client.ts    # API client with token handling
```

#### Why Database Storage is Essential for GitHub App Tokens

Unlike our current OAuth implementation, GitHub App user authentication requires storing tokens in the database for several critical reasons:

1. **Token Refresh Requirements**: 
   - GitHub App user tokens expire after 8 hours by default
   - Refresh tokens (valid for 6 months) must be securely stored to obtain new access tokens
   - Without database storage, users would need to re-authenticate every 8 hours

2. **Session Independence**:
   - Our current implementation stores tokens in the user's session
   - This approach is insufficient for GitHub Apps because:
     - Sessions may expire before tokens
     - Background jobs need access to tokens without an active session
     - Token refreshes must persist across session boundaries

3. **Installation Tracking**:
   - We need to store the user's GitHub App installation ID
   - This ID is required for certain API operations and webhooks
   - It establishes the link between our user and their GitHub App installation

4. **Security Best Practices**:
   - Database storage enables encryption at rest
   - Tokens can be invalidated centrally if compromised
   - Access patterns can be audited and monitored

5. **Cross-Request Persistence**:
   - Server actions and API routes need consistent access to valid tokens
   - Database storage ensures tokens are available to all server components

Key features of the token management system:
- Secure encrypted storage of tokens in database
- Automatic background token refresh before expiration
- Token validation before API requests
- Graceful handling of token revocation or permission changes

### 4. API Client Updates

Modify existing GitHub API calls:

- Update Octokit initialization in `web/src/actions/pull-requests.ts`
- Replace direct token usage with token management system
- Handle potential permission errors gracefully

### 5. Database Schema Updates

Create a dedicated table for GitHub App tokens to better isolate sensitive data:

```typescript
// Drizzle schema for github_user_tokens table
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const githubUserTokens = pgTable('github_user_tokens', {
  userId: text('user_id')
    .references(() => users.id)
    .notNull()
    .primaryKey(),
  installationId: text('installation_id'),
  accessTokenEncrypted: text('access_token_encrypted'),
  accessTokenIv: text('access_token_iv'),
  accessTokenAuthTag: text('access_token_auth_tag'),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  refreshTokenIv: text('refresh_token_iv'),
  refreshTokenAuthTag: text('refresh_token_auth_tag'),
  tokenExpiresAt: timestamp('token_expires_at'),
  tokenScope: text('token_scope'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations between users and their GitHub tokens
export const usersRelations = relations(users, ({ one }) => ({
  githubToken: one(githubUserTokens, {
    fields: [users.id],
    references: [githubUserTokens.userId],
  }),
}));
```

This schema design provides:

1. **Improved Security through Isolation**:
   - Sensitive token data is separated from user profiles
   - Easier to implement row-level security policies
   - Allows for different backup/retention policies for sensitive data

2. **Comprehensive Token Lifecycle Management**:
   - Encrypted `access_token`: The short-lived (8 hour) user access token
   - Encrypted `refresh_token`: The long-lived (6 month) token used to refresh access tokens
   - `token_expires_at`: Timestamp to proactively refresh tokens before expiration
   - `token_scope`: The specific permissions granted during authorization

3. **Installation Tracking**:
   - `installation_id`: Links the user to their specific GitHub App installation
   - Required for webhook processing and certain API operations
   - Enables management of installation-specific settings

4. **Audit Trail**:
   - `created_at` and `updated_at` timestamps track token issuance and refresh
   - Helps with debugging and security monitoring

3. **Security Considerations**:
   - In production, these token fields should be encrypted at rest
   - Consider using a dedicated secrets management service for production
   - At minimum, ensure the database has proper access controls

#### Token Encryption with Node.js Crypto

We'll use Node.js crypto module to encrypt tokens before storing them in the database, integrated with the Drizzle ORM approach:

```typescript
// web/src/lib/github-app/token-crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Key should be stored in environment variables
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY as string;
const ALGORITHM = 'aes-256-gcm';

export interface EncryptedToken {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export function encryptToken(token: string): EncryptedToken {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encryptedData = cipher.update(token, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  
  // GCM mode provides authentication tag for integrity verification
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedData,
    iv: iv.toString('hex'),
    authTag
  };
}

export function decryptToken(encryptedData: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

Now we can create a token service that uses this encryption with our Drizzle schema:

```typescript
// web/src/lib/github-app/token-service.ts
import { db } from "@/db";
import { githubUserTokens } from "@/db/schema";
import { encryptToken, decryptToken, EncryptedToken } from "./token-crypto";
import { eq } from "drizzle-orm";

export interface GitHubTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  installationId?: string;
}

export async function storeGitHubTokens(userId: string, tokens: GitHubTokens): Promise<void> {
  // Encrypt the tokens
  const encryptedAccess = encryptToken(tokens.accessToken);
  const encryptedRefresh = encryptToken(tokens.refreshToken);
  
  // Update or insert tokens
  await db
    .insert(githubUserTokens)
    .values({
      userId,
      installationId: tokens.installationId,
      accessTokenEncrypted: encryptedAccess.encryptedData,
      accessTokenIv: encryptedAccess.iv,
      accessTokenAuthTag: encryptedAccess.authTag,
      refreshTokenEncrypted: encryptedRefresh.encryptedData,
      refreshTokenIv: encryptedRefresh.iv,
      refreshTokenAuthTag: encryptedRefresh.authTag,
      tokenExpiresAt: tokens.expiresAt,
      tokenScope: tokens.scope,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: githubUserTokens.userId,
      set: {
        accessTokenEncrypted: encryptedAccess.encryptedData,
        accessTokenIv: encryptedAccess.iv,
        accessTokenAuthTag: encryptedAccess.authTag,
        refreshTokenEncrypted: encryptedRefresh.encryptedData,
        refreshTokenIv: encryptedRefresh.iv,
        refreshTokenAuthTag: encryptedRefresh.authTag,
        tokenExpiresAt: tokens.expiresAt,
        tokenScope: tokens.scope,
        updatedAt: new Date(),
      },
    });
}

export async function getGitHubTokens(userId: string): Promise<GitHubTokens | null> {
  const tokenRecord = await db
    .select()
    .from(githubUserTokens)
    .where(eq(githubUserTokens.userId, userId))
    .limit(1);
    
  if (!tokenRecord.length) {
    return null;
  }
  
  const record = tokenRecord[0];
  
  // Decrypt the tokens
  const accessToken = decryptToken(
    record.accessTokenEncrypted!,
    record.accessTokenIv!,
    record.accessTokenAuthTag!
  );
  
  const refreshToken = decryptToken(
    record.refreshTokenEncrypted!,
    record.refreshTokenIv!,
    record.refreshTokenAuthTag!
  );
  
  return {
    accessToken,
    refreshToken,
    expiresAt: record.tokenExpiresAt!,
    scope: record.tokenScope || '',
    installationId: record.installationId,
  };
}
```

Benefits of this approach:
- Uses AES-256-GCM, a secure authenticated encryption algorithm
- Fully integrated with Drizzle ORM for type safety and query building
- Implements upsert pattern for token storage (insert or update)
- Encapsulates encryption/decryption logic in service functions
- Provides clean interfaces for token management

### 6. Pull Request Fetching with GitHub App Tokens

The existing pull request fetching in `/web/src/actions/pull-requests.ts` will need to be updated to use our new token management system:

```typescript
// web/src/actions/pull-requests.ts
'use server';

import { Octokit } from '@octokit/rest';
import { PullRequest } from '@/actions/reports';
import { getMockPullRequests } from '@/mocks/github';
import { getGitHubTokens } from '@/lib/github-app/token-service';
import { refreshTokenIfNeeded } from '@/lib/github-app/token-refresh';
import { auth } from '@/auth';

/**
 * GitHub provider - fetches real pull requests from GitHub API using GitHub App tokens
 */
async function fetchGitHubPullRequests(): Promise<PullRequest[]> {
  const session = await auth();
  
  if (!session?.user?.id) {
    console.warn('No authenticated user found for fetching pull requests');
    return [];
  }

  // Get tokens from the database, refreshing if needed
  const tokens = await refreshTokenIfNeeded(session.user.id);
  
  if (!tokens) {
    console.warn('No GitHub App tokens found for user. User may need to authorize the GitHub App');
    return [];
  }

  const octokit = new Octokit({
    auth: tokens.accessToken,
  });

  try {
    // Rest of the pull request fetching code remains the same
    // First, get the authenticated user to filter PRs by author
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // Get user's repositories (both owned and collaborator repos)
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator'
    });

    // ... existing code to process pull requests ...
    
    return allPullRequests;
  } catch (error) {
    // Handle potential token errors
    if (isTokenError(error)) {
      console.error('Token error during pull request fetch:', error);
      // Invalidate tokens to force re-authentication on next request
      await invalidateTokens(session.user.id);
    } else {
      console.error('Error fetching GitHub pull requests:', error);
    }
    return [];
  }
}

// Helper to identify token-related errors
function isTokenError(error: any): boolean {
  return (
    error?.status === 401 ||
    error?.status === 403 ||
    error?.message?.includes('token') ||
    error?.message?.includes('authentication')
  );
}
```

#### Token Refresh System

The token refresh system handles checking expiration and refreshing tokens automatically:

```typescript
// web/src/lib/github-app/token-refresh.ts
import { getGitHubTokens, storeGitHubTokens, GitHubTokens } from './token-service';
import { exchangeRefreshToken } from './auth';

// Buffer time (5 minutes) before expiration to refresh token
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

/**
 * Check if token needs refresh and refresh if needed
 */
export async function refreshTokenIfNeeded(userId: string): Promise<GitHubTokens | null> {
  // Get current tokens
  const tokens = await getGitHubTokens(userId);
  
  if (!tokens) {
    return null;
  }
  
  // Check if token is about to expire (within buffer time)
  const now = new Date();
  const expirationWithBuffer = new Date(tokens.expiresAt.getTime() - EXPIRATION_BUFFER_MS);
  
  if (now > expirationWithBuffer) {
    try {
      // Token is expiring soon, refresh it
      console.log(`Refreshing token for user ${userId} that expires at ${tokens.expiresAt}`);
      
      const newTokens = await exchangeRefreshToken(tokens.refreshToken);
      
      // Store the new tokens
      await storeGitHubTokens(userId, {
        ...newTokens,
        installationId: tokens.installationId, // Preserve installation ID
      });
      
      return newTokens;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, return null to indicate re-authorization is needed
      await invalidateTokens(userId);
      return null;
    }
  }
  
  // Token is still valid
  return tokens;
}

/**
 * Invalidate tokens when they can't be refreshed
 */
export async function invalidateTokens(userId: string): Promise<void> {
  // We don't delete the record but set tokens to null and expiration to now
  // This preserves the installation ID but forces re-authentication
  await storeGitHubTokens(userId, {
    accessToken: '',
    refreshToken: '',
    expiresAt: new Date(),
    scope: '',
  });
}
```

#### Token Exchange for Refresh Tokens

```typescript
// web/src/lib/github-app/auth.ts

/**
 * Exchange a refresh token for a new access token
 */
export async function exchangeRefreshToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}> {
  const clientId = process.env.GITHUB_APP_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET!;

  // GitHub API endpoint for refreshing tokens
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub refresh error: ${data.error_description || data.error}`);
  }

  // Calculate expiration (GitHub App user tokens expire in 8 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided
    expiresAt,
    scope: data.scope,
  };
}
```

## Implementation Steps

1. **Preparation** ✓
   - ✓ GitHub App created in GitHub Developer settings
   - ✓ Permissions and callback URLs configured
   - ✓ Private key generated and secured

2. **Authentication Flow**
   - Implement GitHub App authorization URL generation
   - Create callback handler for authorization code exchange
   - Update session handling to store necessary tokens

3. **Token Management**
   - Build token storage system in database
   - Implement token refresh logic
   - Create middleware for checking token validity

4. **API Integration**
   - Update Pull Requests fetching to use new authentication
   - Modify other GitHub-dependent features
   - Implement permission error handling

5. **Testing**
   - Test token refresh scenarios
   - Verify all GitHub features work with new auth method
   - Test installation/uninstallation flows

## Testing Strategy

Testing GitHub App authentication presents unique challenges, particularly for integration testing. For this implementation, we'll focus primarily on comprehensive unit testing due to the difficulties of testing real OAuth flows.

### Unit Testing Focus

Given the challenges of integration testing with a real GitHub App, our testing strategy will prioritize thorough unit testing:

#### Areas for Unit Testing

1. **Token Encryption/Decryption**
   - Unit test the encryption and decryption functions
   - Verify tokens are properly protected
   - Test error handling for encryption edge cases

2. **Token Storage/Retrieval**
   - Test the database operations with mocked Drizzle ORM
   - Verify proper storage and retrieval of encrypted tokens
   - Test upsert functionality for token updates

3. **Token Refresh Logic**
   - Test the token expiration detection logic
   - Mock the refresh token exchange process
   - Verify proper handling of refresh failures

4. **API Client Behavior**
   - Test Octokit client initialization with tokens
   - Verify error handling for token-related failures
   - Test fallback behavior when tokens are invalid

### Integration Testing Challenges

Integration testing of OAuth flows with GitHub Apps presents several significant challenges:

1. **External API Dependencies**
   - Tests would require actual GitHub API calls
   - API rate limits would affect test reliability
   - Credentials can't be safely included in test environments

2. **OAuth Flow Complexity**
   - Full OAuth flow requires browser interaction
   - Involves redirects and user consent that are difficult to automate
   - Token exchange requires real-time code generation

3. **Sensitive Credentials**
   - Tests would need real GitHub App credentials
   - Security concerns with storing these in CI/CD environments
   - Potential for unintended side effects in GitHub organizations

4. **State Management**
   - OAuth flows depend on secure state parameters
   - Tests would need to manage complex state across redirects

### Manual Testing Plan

Due to these challenges, certain aspects will require manual testing:

1. **Initial Authorization Flow**
   - Manual testing of the complete GitHub App authorization
   - Verification of proper token storage after authorization
   - Testing user experience during the authorization process

2. **Token Refresh Scenarios**
   - Manual verification that tokens refresh properly
   - Testing behavior when refresh tokens expire
   - Verification of graceful handling of failed refreshes

3. **Permission Scenarios**
   - Testing behavior when users revoke permissions
   - Verifying proper handling of scope changes
   - Testing re-authorization flows

### Test Environment Considerations

For development and testing, we should:

1. Create a separate development GitHub App with the same permissions
2. Document the manual testing steps for key authentication scenarios
3. Consider a simple mock server for local development that simulates GitHub API responses

## Success Criteria

- All existing GitHub integration features work with GitHub App authentication
- Tokens refresh automatically without user intervention
- Database properly stores and manages tokens
- Permission errors are handled gracefully with clear user feedback
- Unit tests cover key token management functionality
- Manual testing confirms proper authentication flows

## Resources

- [GitHub Docs: Authenticating with a GitHub App on behalf of a user](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user)
- [GitHub Docs: Identifying and authorizing users for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/identifying-and-authorizing-users-for-github-apps)
- [GitHub Docs: Refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)
- [NextAuth.js Custom Provider Documentation](https://next-auth.js.org/configuration/providers/oauth#using-a-custom-provider)
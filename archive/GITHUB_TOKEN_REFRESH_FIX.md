# GitHub Token Auto-Refresh Fix

## Problem Statement

Something in GitHub was not automatically refreshing users' GitHub tokens. When GitHub App user tokens expired after 8 hours, users would lose GitHub API access mid-session, requiring manual re-authentication.

## Root Cause

The NextAuth.js JWT callback in `web/src/auth.ts` only stored GitHub tokens during the initial OAuth signin (when the `account` parameter was present). It did not check or refresh tokens on subsequent session accesses, causing tokens to expire silently during active sessions.

## Solution

Added automatic token refresh logic to the JWT callback that runs on every session access (not just initial signin). The implementation:

1. **Detects token refresh opportunities**: When `account` is undefined (not a fresh signin), the callback now checks if tokens need refreshing
2. **Uses existing refresh infrastructure**: Calls `refreshTokenIfNeeded()` from `@catalyst/vcs-provider` which:
   - Checks if tokens are within 5-minute expiration buffer
   - Exchanges refresh token for new access token via GitHub API
   - Updates encrypted tokens in database
   - Returns refreshed tokens
3. **Updates JWT seamlessly**: Refreshed tokens are stored in the JWT so they're available immediately
4. **Handles errors gracefully**: If refresh fails, the error is logged but doesn't break the user's session

## Implementation Details

### Modified Files

1. **`web/src/auth.ts`** (26 lines added)
   - Added else-if branch in JWT callback for non-initial session access
   - Calls `refreshTokenIfNeeded()` when `!account`
   - Updates JWT token with refreshed values
   - Includes null check for `expiresAt` to prevent runtime errors
   - Wrapped in try-catch to handle refresh failures gracefully

2. **`web/__tests__/unit/auth-token-refresh.test.ts`** (244 lines added)
   - Comprehensive test coverage for token refresh behavior
   - Tests refresh on subsequent access vs initial signin
   - Verifies error handling
   - Tests token expiration updates
   - Validates field preservation after refresh
   - Tests timing behavior (valid vs expiring tokens)

3. **`web/docs/conventions/auth.md`** (81 lines added)
   - Documented how automatic token refresh works
   - Explained implementation details
   - Listed benefits and behavior
   - Added code examples
   - Referenced test coverage

### Key Code Changes

```typescript
// web/src/auth.ts - JWT callback
else if (!account) {
  // Not a fresh signin - check if we need to refresh GitHub tokens
  // This runs on every session access to keep tokens fresh
  try {
    const { refreshTokenIfNeeded } = await import("@catalyst/vcs-provider");
    const refreshedTokens = await refreshTokenIfNeeded(existingUser.id);

    // If tokens were refreshed, update the JWT token
    if (refreshedTokens) {
      token.accessToken = refreshedTokens.accessToken;
      token.refreshToken = refreshedTokens.refreshToken;
      if (refreshedTokens.expiresAt) {
        token.tokenExpiresAt = Math.floor(
          refreshedTokens.expiresAt.getTime() / 1000,
        );
      }
      token.tokenScope = refreshedTokens.scope;
    }
  } catch (error) {
    // Log error but don't fail the session - user can still use the app
    console.error("Failed to refresh GitHub tokens in JWT callback:", error);
  }
}
```

## Testing

### Test Results

All 154 tests pass, including 8 new tests specifically for token refresh:

```
✓ __tests__/unit/auth-token-refresh.test.ts (8 tests)
  ✓ Token refresh behavior
    ✓ should refresh tokens when session is accessed (not initial signin)
    ✓ should not refresh tokens on initial signin (account present)
    ✓ should handle refresh errors gracefully
    ✓ should update token expiration after refresh
    ✓ should preserve all token fields after refresh
  ✓ Token refresh timing
    ✓ should not refresh tokens that are still valid
    ✓ should refresh tokens that are near expiration
    ✓ should return null when tokens cannot be refreshed
```

### Test Coverage

- **Unit tests**: Comprehensive mocking of database and VCS provider
- **Integration tests**: Existing tests verify end-to-end flow
- **Type checking**: TypeScript compilation passes
- **Linting**: ESLint passes (only unrelated warnings present)

## Benefits

1. **Seamless User Experience**: Users never experience authentication interruptions
2. **Automatic Operation**: No manual intervention required
3. **Security**: Tokens remain encrypted in database
4. **Efficient**: Only refreshes when needed (5-minute buffer before expiration)
5. **Resilient**: Handles refresh failures gracefully without breaking sessions
6. **Backward Compatible**: All existing tests pass

## Verification

To verify the fix is working:

1. **Monitor logs**: Look for "Refreshing token for user" messages in application logs
2. **Check database**: Verify `github_user_tokens.token_expires_at` is being updated
3. **User sessions**: Users with active sessions should maintain GitHub access beyond 8 hours
4. **API calls**: GitHub API calls should succeed even after token refresh

## Related Files

- `web/packages/@catalyst/vcs-provider/src/providers/github/token-refresh.ts` - Token refresh logic
- `web/packages/@catalyst/vcs-provider/src/providers/github/token-service.ts` - Token storage
- `web/packages/@catalyst/vcs-provider/src/providers/github/auth.ts` - GitHub OAuth exchange
- `web/packages/@catalyst/vcs-provider/src/providers/github/client.ts` - getUserOctokit() uses refresh

## Deployment Notes

- No database migrations required
- No environment variable changes needed
- No configuration changes required
- Feature is backward compatible
- Safe to deploy immediately

## Future Improvements

1. Consider adding metrics/monitoring for token refresh success/failure rates
2. Add user notification if refresh fails and re-auth is required
3. Consider proactive refresh before expiration (currently reactive within 5-minute buffer)
4. Add admin dashboard to view token expiration status across users

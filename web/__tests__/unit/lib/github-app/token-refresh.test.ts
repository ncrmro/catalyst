/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refreshTokenIfNeeded, invalidateTokens, areTokensValid } from '@/lib/github-app/token-refresh';

// Mock the token service
vi.mock('@/lib/github-app/token-service', () => ({
  getGitHubTokens: vi.fn(),
  storeGitHubTokens: vi.fn(),
  deleteGitHubTokens: vi.fn(),
}));

// Mock the auth module
vi.mock('@/lib/github-app/auth', () => ({
  exchangeRefreshToken: vi.fn(),
}));

describe('Token Refresh System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('refreshTokenIfNeeded', () => {
    it('should preserve valid refresh tokens on temporary refresh failures', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');
      const { exchangeRefreshToken } = await import('@/lib/github-app/auth');

      // Mock tokens that are about to expire (within buffer time)
      const expiredTokens = {
        accessToken: 'old_access_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        scope: 'read:user repo',
        installationId: 'test_installation_id',
      };

      (getGitHubTokens as any).mockResolvedValue(expiredTokens);
      
      // Mock a temporary network failure
      (exchangeRefreshToken as any).mockRejectedValue(new Error('Network timeout'));

      const result = await refreshTokenIfNeeded('test-user-id');

      // Should return null to indicate refresh failed
      expect(result).toBeNull();
      
      // Should NOT call storeGitHubTokens for invalidation on temporary failures
      expect(getGitHubTokens).toHaveBeenCalledWith('test-user-id');
      expect(exchangeRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(storeGitHubTokens).not.toHaveBeenCalled(); // Should not invalidate on temporary failure
    });

    it('should invalidate tokens only on permanent failures', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');
      const { exchangeRefreshToken } = await import('@/lib/github-app/auth');

      const expiredTokens = {
        accessToken: 'old_access_token',
        refreshToken: 'expired_refresh_token',
        expiresAt: new Date(Date.now() - 1000),
        scope: 'read:user repo',
        installationId: 'test_installation_id',
      };

      (getGitHubTokens as any).mockResolvedValueOnce(expiredTokens); // First call for refreshTokenIfNeeded
      (getGitHubTokens as any).mockResolvedValueOnce(expiredTokens); // Second call for invalidateTokens
      
      // Mock a permanent failure (expired refresh token)
      (exchangeRefreshToken as any).mockRejectedValue(
        new Error('GitHub refresh error: refresh token expired')
      );

      const result = await refreshTokenIfNeeded('test-user-id');

      expect(result).toBeNull();
      expect(exchangeRefreshToken).toHaveBeenCalledWith('expired_refresh_token');
      
      // Should invalidate tokens on permanent failure
      expect(storeGitHubTokens).toHaveBeenCalledWith('test-user-id', {
        accessToken: '',
        refreshToken: '',
        expiresAt: expect.any(Date),
        scope: '',
        installationId: 'test_installation_id',
      });
    });

    it('should successfully refresh valid tokens', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');
      const { exchangeRefreshToken } = await import('@/lib/github-app/auth');

      const expiredTokens = {
        accessToken: 'old_access_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: new Date(Date.now() - 1000),
        scope: 'read:user repo',
        installationId: 'test_installation_id',
      };

      const newTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
        scope: 'read:user repo',
      };

      (getGitHubTokens as any).mockResolvedValue(expiredTokens);
      (exchangeRefreshToken as any).mockResolvedValue(newTokens);

      const result = await refreshTokenIfNeeded('test-user-id');

      expect(result).toEqual({
        ...newTokens,
        installationId: 'test_installation_id', // Should preserve installation ID
      });

      expect(storeGitHubTokens).toHaveBeenCalledWith('test-user-id', {
        ...newTokens,
        installationId: 'test_installation_id',
      });
    });
  });

  describe('invalidateTokens', () => {
    it('should preserve installation ID when invalidating tokens', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');

      const existingTokens = {
        accessToken: 'some_token',
        refreshToken: 'some_refresh_token',
        expiresAt: new Date(),
        scope: 'read:user repo',
        installationId: 'test_installation_id',
      };

      (getGitHubTokens as any).mockResolvedValue(existingTokens);

      await invalidateTokens('test-user-id');

      expect(storeGitHubTokens).toHaveBeenCalledWith('test-user-id', {
        accessToken: '',
        refreshToken: '',
        expiresAt: expect.any(Date),
        scope: '',
        installationId: 'test_installation_id', // Should be preserved
      });
    });

    it('should delete tokens when no installation ID exists', async () => {
      const { getGitHubTokens, deleteGitHubTokens } = await import('@/lib/github-app/token-service');

      const existingTokens = {
        accessToken: 'some_token',
        refreshToken: 'some_refresh_token',
        expiresAt: new Date(),
        scope: 'read:user repo',
        // No installation ID
      };

      (getGitHubTokens as any).mockResolvedValue(existingTokens);

      await invalidateTokens('test-user-id');

      expect(deleteGitHubTokens).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('Error Classification', () => {
    it('should preserve tokens on network errors', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');
      const { exchangeRefreshToken } = await import('@/lib/github-app/auth');

      const tokens = {
        accessToken: 'token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 1000),
        scope: 'read:user repo',
        installationId: 'install_id',
      };

      (getGitHubTokens as any).mockResolvedValue(tokens);
      (exchangeRefreshToken as any).mockRejectedValue(new Error('fetch failed'));

      const result = await refreshTokenIfNeeded('test-user-id');

      expect(result).toBeNull();
      expect(storeGitHubTokens).not.toHaveBeenCalled(); // Should not invalidate
    });

    it('should preserve tokens on rate limit errors', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');
      const { exchangeRefreshToken } = await import('@/lib/github-app/auth');

      const tokens = {
        accessToken: 'token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 1000),
        scope: 'read:user repo',
        installationId: 'install_id',
      };

      (getGitHubTokens as any).mockResolvedValue(tokens);
      (exchangeRefreshToken as any).mockRejectedValue(new Error('Failed to refresh token: Too Many Requests'));

      const result = await refreshTokenIfNeeded('test-user-id');

      expect(result).toBeNull();
      expect(storeGitHubTokens).not.toHaveBeenCalled(); // Should not invalidate
    });

    it('should invalidate tokens on expired refresh token', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');
      const { exchangeRefreshToken } = await import('@/lib/github-app/auth');

      const tokens = {
        accessToken: 'token',
        refreshToken: 'expired_refresh_token',
        expiresAt: new Date(Date.now() - 1000),
        scope: 'read:user repo',
        installationId: 'install_id',
      };

      (getGitHubTokens as any).mockResolvedValueOnce(tokens); // For refreshTokenIfNeeded
      (getGitHubTokens as any).mockResolvedValueOnce(tokens); // For invalidateTokens

      (exchangeRefreshToken as any).mockRejectedValue(
        new Error('GitHub refresh error: The refresh token expired')
      );

      const result = await refreshTokenIfNeeded('test-user-id');

      expect(result).toBeNull();
      expect(storeGitHubTokens).toHaveBeenCalledWith('test-user-id', {
        accessToken: '',
        refreshToken: '',
        expiresAt: expect.any(Date),
        scope: '',
        installationId: 'install_id',
      });
    });

    it('should invalidate tokens on invalid refresh token', async () => {
      const { getGitHubTokens, storeGitHubTokens } = await import('@/lib/github-app/token-service');
      const { exchangeRefreshToken } = await import('@/lib/github-app/auth');

      const tokens = {
        accessToken: 'token',
        refreshToken: 'invalid_refresh_token',
        expiresAt: new Date(Date.now() - 1000),
        scope: 'read:user repo',
        installationId: 'install_id',
      };

      (getGitHubTokens as any).mockResolvedValueOnce(tokens); // For refreshTokenIfNeeded
      (getGitHubTokens as any).mockResolvedValueOnce(tokens); // For invalidateTokens

      (exchangeRefreshToken as any).mockRejectedValue(
        new Error('GitHub refresh error: invalid_grant')
      );

      const result = await refreshTokenIfNeeded('test-user-id');

      expect(result).toBeNull();
      expect(storeGitHubTokens).toHaveBeenCalledWith('test-user-id', {
        accessToken: '',
        refreshToken: '',
        expiresAt: expect.any(Date),
        scope: '',
        installationId: 'install_id',
      });
    });
  });

  describe('areTokensValid', () => {
    it('should return false for expired tokens', async () => {
      const { getGitHubTokens } = await import('@/lib/github-app/token-service');

      const expiredTokens = {
        accessToken: 'token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        scope: 'read:user repo',
      };

      (getGitHubTokens as any).mockResolvedValue(expiredTokens);

      const result = await areTokensValid('test-user-id');
      expect(result).toBe(false);
    });

    it('should return true for valid tokens', async () => {
      const { getGitHubTokens } = await import('@/lib/github-app/token-service');

      const validTokens = {
        accessToken: 'token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 1000), // Valid for 1 second more
        scope: 'read:user repo',
      };

      (getGitHubTokens as any).mockResolvedValue(validTokens);

      const result = await areTokensValid('test-user-id');
      expect(result).toBe(true);
    });

    it('should return false for empty tokens (invalidated)', async () => {
      const { getGitHubTokens } = await import('@/lib/github-app/token-service');

      // This simulates tokens that were invalidated but installation ID preserved
      (getGitHubTokens as any).mockResolvedValue(null);

      const result = await areTokensValid('test-user-id');
      expect(result).toBe(false);
    });

    it('should handle the case where tokens were invalidated but record exists', async () => {
      const { getGitHubTokens } = await import('@/lib/github-app/token-service');

      // Even though the installation ID might be preserved in the database,
      // getGitHubTokens returns null for empty tokens, which is correct behavior
      // because empty tokens shouldn't be considered valid for API calls
      (getGitHubTokens as any).mockResolvedValue(null);

      const result = await areTokensValid('test-user-id');
      expect(result).toBe(false);
    });
  });
});
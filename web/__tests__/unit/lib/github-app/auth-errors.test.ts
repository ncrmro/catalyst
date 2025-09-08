/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exchangeRefreshToken } from '@/lib/github-app/auth';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('GitHub Auth Refresh Token Errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env.GITHUB_APP_CLIENT_ID = 'test_client_id';
    process.env.GITHUB_APP_CLIENT_SECRET = 'test_client_secret';
  });

  it('should handle expired refresh token error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'The refresh token expired',
      }),
    });

    await expect(exchangeRefreshToken('expired_refresh_token')).rejects.toThrow(
      'GitHub refresh error: The refresh token expired'
    );
  });

  it('should handle invalid refresh token error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'The refresh token is invalid',
      }),
    });

    await expect(exchangeRefreshToken('invalid_refresh_token')).rejects.toThrow(
      'GitHub refresh error: The refresh token is invalid'
    );
  });

  it('should handle network timeout error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(exchangeRefreshToken('valid_refresh_token')).rejects.toThrow(
      'Network timeout'
    );
  });

  it('should handle rate limit error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(exchangeRefreshToken('valid_refresh_token')).rejects.toThrow(
      'Failed to refresh token: Too Many Requests'
    );
  });

  it('should handle server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(exchangeRefreshToken('valid_refresh_token')).rejects.toThrow(
      'Failed to refresh token: Internal Server Error'
    );
  });

  it('should successfully refresh valid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        scope: 'read:user repo',
      }),
    });

    const result = await exchangeRefreshToken('valid_refresh_token');

    expect(result).toEqual({
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresAt: expect.any(Date),
      scope: 'read:user repo',
    });
  });
});
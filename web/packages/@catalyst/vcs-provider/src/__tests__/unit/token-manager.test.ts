/**
 * VCS Token Manager Tests
 *
 * Comprehensive test suite for the VCSTokenManager singleton class.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VCSTokenManager } from "../../token-manager";
import type { VCSTokenManagerConfig } from "../../token-manager";
import type { TokenData, ProviderId } from "../../types";

describe("VCSTokenManager", () => {
  // Reset singleton before each test
  beforeEach(() => {
    VCSTokenManager.reset();
  });

  describe("Singleton Pattern", () => {
    it("should throw error if getInstance is called before initialize", () => {
      expect(() => VCSTokenManager.getInstance()).toThrow(
        "VCSTokenManager not initialized",
      );
    });

    it("should throw error if initialize is called twice", () => {
      const config: VCSTokenManagerConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      };

      VCSTokenManager.initialize(config);

      expect(() => VCSTokenManager.initialize(config)).toThrow(
        "VCSTokenManager already initialized",
      );
    });

    it("should return same instance on multiple getInstance calls", () => {
      const config: VCSTokenManagerConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      };

      VCSTokenManager.initialize(config);

      const instance1 = VCSTokenManager.getInstance();
      const instance2 = VCSTokenManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should allow re-initialization after reset", () => {
      const config: VCSTokenManagerConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      };

      VCSTokenManager.initialize(config);
      VCSTokenManager.reset();

      // Should not throw
      expect(() => VCSTokenManager.initialize(config)).not.toThrow();
    });
  });

  describe("Token Retrieval", () => {
    it("should return valid tokens without refresh if not expired", async () => {
      const validTokens: TokenData = {
        accessToken: "valid_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(validTokens);
      const refreshToken = vi.fn();
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toEqual(validTokens);
      expect(getTokenData).toHaveBeenCalledWith("user123", "github");
      expect(refreshToken).not.toHaveBeenCalled();
      expect(storeTokenData).not.toHaveBeenCalled();
    });

    it("should return null if tokens do not exist", async () => {
      const getTokenData = vi.fn().mockResolvedValue(null);
      const refreshToken = vi.fn();
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toBeNull();
      expect(getTokenData).toHaveBeenCalledWith("user123", "github");
      expect(refreshToken).not.toHaveBeenCalled();
    });

    it("should return null if getTokenData throws an error", async () => {
      const getTokenData = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));
      const refreshToken = vi.fn();
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toBeNull();
    });
  });

  describe("Token Refresh", () => {
    it("should refresh tokens when expired", async () => {
      const expiredTokens: TokenData = {
        accessToken: "expired_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() - 1000), // Expired
        scope: "repo",
      };

      const newTokens: TokenData = {
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiredTokens);
      const refreshToken = vi.fn().mockResolvedValue(newTokens);
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toEqual(newTokens);
      expect(refreshToken).toHaveBeenCalledWith("refresh_token", "github");
      expect(storeTokenData).toHaveBeenCalledWith(
        "user123",
        newTokens,
        "github",
      );
    });

    it("should refresh tokens when within expiration buffer", async () => {
      // Token expires in 4 minutes (default buffer is 5 minutes)
      const expiringTokens: TokenData = {
        accessToken: "expiring_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() + 4 * 60 * 1000),
        scope: "repo",
      };

      const newTokens: TokenData = {
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiringTokens);
      const refreshToken = vi.fn().mockResolvedValue(newTokens);
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toEqual(newTokens);
      expect(refreshToken).toHaveBeenCalled();
      expect(storeTokenData).toHaveBeenCalled();
    });

    it("should use custom expiration buffer", async () => {
      // Token expires in 31 seconds
      const expiringTokens: TokenData = {
        accessToken: "expiring_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() + 31 * 1000),
        scope: "repo",
      };

      const newTokens: TokenData = {
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiringTokens);
      const refreshToken = vi.fn().mockResolvedValue(newTokens);
      const storeTokenData = vi.fn();

      // Custom buffer: 30 seconds
      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
        expirationBufferMs: 30 * 1000,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      // Should refresh because token expires in 31s and buffer is 30s
      expect(result).toEqual(newTokens);
      expect(refreshToken).toHaveBeenCalled();
    });

    it("should return null if refresh fails", async () => {
      const expiredTokens: TokenData = {
        accessToken: "expired_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiredTokens);
      const refreshToken = vi
        .fn()
        .mockRejectedValue(new Error("Refresh failed"));
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toBeNull();
      expect(refreshToken).toHaveBeenCalled();
      expect(storeTokenData).not.toHaveBeenCalled();
    });

    it("should return null if no refresh token available", async () => {
      const tokensWithoutRefresh: TokenData = {
        accessToken: "expired_access_token",
        refreshToken: undefined, // No refresh token
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(tokensWithoutRefresh);
      const refreshToken = vi.fn();
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toBeNull();
      expect(refreshToken).not.toHaveBeenCalled();
    });

    it("should not refresh if no expiration date is set", async () => {
      const tokensWithoutExpiration: TokenData = {
        accessToken: "access_token",
        refreshToken: "refresh_token",
        expiresAt: undefined, // No expiration
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(tokensWithoutExpiration);
      const refreshToken = vi.fn();
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      const result = await manager.getValidToken("user123", "github");

      expect(result).toEqual(tokensWithoutExpiration);
      expect(refreshToken).not.toHaveBeenCalled();
    });
  });

  describe("Concurrent Refresh Protection", () => {
    it("should not trigger multiple refresh calls for same user", async () => {
      const expiredTokens: TokenData = {
        accessToken: "expired_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const newTokens: TokenData = {
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiredTokens);
      // Simulate slow refresh
      const refreshToken = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(newTokens), 100);
          }),
      );
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();

      // Make 3 concurrent calls
      const [result1, result2, result3] = await Promise.all([
        manager.getValidToken("user123", "github"),
        manager.getValidToken("user123", "github"),
        manager.getValidToken("user123", "github"),
      ]);

      // All should return the same new tokens
      expect(result1).toEqual(newTokens);
      expect(result2).toEqual(newTokens);
      expect(result3).toEqual(newTokens);

      // But refresh should only be called once
      expect(refreshToken).toHaveBeenCalledTimes(1);
      expect(storeTokenData).toHaveBeenCalledTimes(1);
    });

    it("should allow separate refresh for different users", async () => {
      const user1Tokens: TokenData = {
        accessToken: "user1_expired",
        refreshToken: "user1_refresh",
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const user2Tokens: TokenData = {
        accessToken: "user2_expired",
        refreshToken: "user2_refresh",
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const newTokens1: TokenData = {
        accessToken: "user1_new",
        refreshToken: "user1_new_refresh",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const newTokens2: TokenData = {
        accessToken: "user2_new",
        refreshToken: "user2_new_refresh",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi
        .fn()
        .mockImplementation((userId: string) =>
          userId === "user1" ? user1Tokens : user2Tokens,
        );
      const refreshToken = vi
        .fn()
        .mockImplementation((token: string) =>
          token === "user1_refresh" ? newTokens1 : newTokens2,
        );
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();

      // Make concurrent calls for different users
      const [result1, result2] = await Promise.all([
        manager.getValidToken("user1", "github"),
        manager.getValidToken("user2", "github"),
      ]);

      expect(result1).toEqual(newTokens1);
      expect(result2).toEqual(newTokens2);

      // Refresh should be called twice (once per user)
      expect(refreshToken).toHaveBeenCalledTimes(2);
    });
  });

  describe("Token Invalidation", () => {
    it("should store empty tokens on invalidation", async () => {
      const getTokenData = vi.fn();
      const refreshToken = vi.fn();
      const storeTokenData = vi.fn();

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();
      await manager.invalidateTokens("user123", "github");

      expect(storeTokenData).toHaveBeenCalledWith(
        "user123",
        {
          accessToken: "",
          refreshToken: "",
          expiresAt: expect.any(Date),
          scope: "",
        },
        "github",
      );
    });

    it("should handle invalidation errors gracefully", async () => {
      const getTokenData = vi.fn();
      const refreshToken = vi.fn();
      const storeTokenData = vi
        .fn()
        .mockRejectedValue(new Error("Storage error"));

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const manager = VCSTokenManager.getInstance();

      // Should not throw
      await expect(
        manager.invalidateTokens("user123", "github"),
      ).resolves.not.toThrow();
    });
  });

  describe("Token Validity Check", () => {
    it("should return true for valid tokens", async () => {
      const validTokens: TokenData = {
        accessToken: "valid_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(validTokens);

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const manager = VCSTokenManager.getInstance();
      const isValid = await manager.areTokensValid("user123", "github");

      expect(isValid).toBe(true);
    });

    it("should return false for expired tokens", async () => {
      const expiredTokens: TokenData = {
        accessToken: "expired_access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiredTokens);

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const manager = VCSTokenManager.getInstance();
      const isValid = await manager.areTokensValid("user123", "github");

      expect(isValid).toBe(false);
    });

    it("should return false for missing tokens", async () => {
      const getTokenData = vi.fn().mockResolvedValue(null);

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const manager = VCSTokenManager.getInstance();
      const isValid = await manager.areTokensValid("user123", "github");

      expect(isValid).toBe(false);
    });

    it("should return false for tokens without refresh token", async () => {
      const tokensWithoutRefresh: TokenData = {
        accessToken: "access_token",
        refreshToken: undefined,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(tokensWithoutRefresh);

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const manager = VCSTokenManager.getInstance();
      const isValid = await manager.areTokensValid("user123", "github");

      expect(isValid).toBe(false);
    });

    it("should return true for tokens without expiration", async () => {
      const tokensWithoutExpiration: TokenData = {
        accessToken: "access_token",
        refreshToken: "refresh_token",
        expiresAt: undefined,
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(tokensWithoutExpiration);

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const manager = VCSTokenManager.getInstance();
      const isValid = await manager.areTokensValid("user123", "github");

      expect(isValid).toBe(true);
    });

    it("should return false on error", async () => {
      const getTokenData = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const manager = VCSTokenManager.getInstance();
      const isValid = await manager.areTokensValid("user123", "github");

      expect(isValid).toBe(false);
    });
  });

  describe("Multi-Provider Support", () => {
    it("should handle different providers separately", async () => {
      const githubTokens: TokenData = {
        accessToken: "github_token",
        refreshToken: "github_refresh",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const gitlabTokens: TokenData = {
        accessToken: "gitlab_token",
        refreshToken: "gitlab_refresh",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "api",
      };

      const getTokenData = vi
        .fn()
        .mockImplementation(
          (userId: string, providerId: ProviderId): Promise<TokenData | null> =>
            providerId === "github"
              ? Promise.resolve(githubTokens)
              : Promise.resolve(gitlabTokens),
        );

      VCSTokenManager.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const manager = VCSTokenManager.getInstance();

      const githubResult = await manager.getValidToken("user123", "github");
      const gitlabResult = await manager.getValidToken("user123", "gitlab");

      expect(githubResult).toEqual(githubTokens);
      expect(gitlabResult).toEqual(gitlabTokens);
      expect(getTokenData).toHaveBeenCalledWith("user123", "github");
      expect(getTokenData).toHaveBeenCalledWith("user123", "gitlab");
    });
  });
});

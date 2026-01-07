import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken } from "../../token-crypto";
import { migrateGitHubTokensToVCSTokens } from "../../token-schema";

describe("Token Tools", () => {
  describe("Token Encryption", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      // Set a fixed key for testing (32 bytes hex)
      process.env.TOKEN_ENCRYPTION_KEY = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should encrypt and decrypt a token correctly", () => {
      const token = "ghp_secrettoken123456789";
      
      const encrypted = encryptToken(token);
      
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.encryptedData).not.toBe(token);

      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(token);
    });

    it("should produce different ciphertexts for same token (random IV)", () => {
      const token = "same_token";
      
      const enc1 = encryptToken(token);
      const enc2 = encryptToken(token);

      expect(enc1.encryptedData).not.toBe(enc2.encryptedData);
      expect(enc1.iv).not.toBe(enc2.iv);
      
      // But both should decrypt to same value
      expect(decryptToken(enc1.encryptedData, enc1.iv, enc1.authTag)).toBe(token);
      expect(decryptToken(enc2.encryptedData, enc2.iv, enc2.authTag)).toBe(token);
    });

    it("should throw error if key is missing", () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      
      expect(() => encryptToken("token")).toThrow(/TOKEN_ENCRYPTION_KEY/);
    });

    it("should fail validation with wrong auth tag", () => {
      const token = "secret";
      const { encryptedData, iv } = encryptToken(token);
      
      // Use a random auth tag
      const wrongTag = "00".repeat(16);
      
      expect(() => decryptToken(encryptedData, iv, wrongTag)).toThrow();
    });
  });

  describe("Token Schema", () => {
    it("should migrate GitHub tokens to VCS format", () => {
      const now = new Date();
      const githubRecord = {
        userId: "user-123",
        installationId: "inst-456",
        accessTokenEncrypted: "enc-access",
        accessTokenIv: "iv-access",
        accessTokenAuthTag: "tag-access",
        refreshTokenEncrypted: "enc-refresh",
        refreshTokenIv: "iv-refresh",
        refreshTokenAuthTag: "tag-refresh",
        tokenExpiresAt: now,
        tokenScope: "repo",
        createdAt: now,
        updatedAt: now,
      };

      const vcsRecord = migrateGitHubTokensToVCSTokens(githubRecord);

      expect(vcsRecord).toEqual({
        ...githubRecord,
        providerId: "github",
      });
    });
  });
});

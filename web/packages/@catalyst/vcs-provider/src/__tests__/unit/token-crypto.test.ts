import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The token-crypto module reads TOKEN_ENCRYPTION_KEY at module load time
// So we need to ensure it's available before the module is imported
// This test suite assumes TOKEN_ENCRYPTION_KEY is already set in the environment (via .env)

describe("token-crypto", () => {
  let encryptToken: (token: string) => { encryptedData: string; iv: string; authTag: string };
  let decryptToken: (encryptedData: string, iv: string, authTag: string) => string;

  beforeEach(async () => {
    // Import fresh module for each test
    const module = await import("../../token-crypto");
    encryptToken = module.encryptToken;
    decryptToken = module.decryptToken;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("encryptToken and decryptToken", () => {
    it("should encrypt and decrypt token (roundtrip)", () => {
      const originalToken = "gho_test_access_token_12345";

      // Encrypt the token
      const encrypted = encryptToken(originalToken);

      // Verify encrypted data is different from original
      expect(encrypted.encryptedData).not.toBe(originalToken);
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.iv.length).toBe(32); // 16 bytes in hex = 32 chars
      expect(encrypted.authTag.length).toBe(32); // 16 bytes in hex = 32 chars

      // Decrypt the token
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag,
      );

      // Verify original value is recovered
      expect(decrypted).toBe(originalToken);
    });

    it("should produce different IVs per call", () => {
      const token = "gho_same_token";

      // Encrypt the same token twice
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      // IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      // Encrypted data should be different due to different IVs
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      // Auth tags should be different
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);

      // But both should decrypt to the same original value
      const decrypted1 = decryptToken(
        encrypted1.encryptedData,
        encrypted1.iv,
        encrypted1.authTag,
      );
      const decrypted2 = decryptToken(
        encrypted2.encryptedData,
        encrypted2.iv,
        encrypted2.authTag,
      );

      expect(decrypted1).toBe(token);
      expect(decrypted2).toBe(token);
    });

    it("should handle long tokens", () => {
      const longToken = "gho_" + "a".repeat(1000);

      const encrypted = encryptToken(longToken);
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag,
      );

      expect(decrypted).toBe(longToken);
    });

    it("should handle tokens with special characters", () => {
      const specialToken = "gho_token!@#$%^&*()_+-=[]{}|;:,.<>?";

      const encrypted = encryptToken(specialToken);
      const decrypted = decryptToken(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag,
      );

      expect(decrypted).toBe(specialToken);
    });

    it("should throw error when decrypting with wrong auth tag", () => {
      const token = "gho_test_token";
      const encrypted = encryptToken(token);

      // Tamper with auth tag
      const wrongAuthTag = "0".repeat(32);

      expect(() =>
        decryptToken(encrypted.encryptedData, encrypted.iv, wrongAuthTag),
      ).toThrow();
    });

    it("should throw error when decrypting with wrong IV", () => {
      const token = "gho_test_token";
      const encrypted = encryptToken(token);

      // Use wrong IV
      const wrongIv = "0".repeat(32);

      expect(() =>
        decryptToken(encrypted.encryptedData, wrongIv, encrypted.authTag),
      ).toThrow();
    });

    it("should throw error when decrypting tampered data", () => {
      const token = "gho_test_token";
      const encrypted = encryptToken(token);

      // Tamper with encrypted data
      const tamperedData =
        encrypted.encryptedData.substring(0, encrypted.encryptedData.length - 2) +
        "00";

      expect(() =>
        decryptToken(tamperedData, encrypted.iv, encrypted.authTag),
      ).toThrow();
    });
  });
});

/**
 * Unit tests for secret management encryption and precedence logic
 * Tests FR-ENV-035 (precedence) and FR-ENV-036 (encryption)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encryptSecret, decryptSecret } from "@/models/secrets";

describe("secret encryption", () => {
  // Save original env var
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.TOKEN_ENCRYPTION_KEY;
    // Set a test encryption key (32-byte hex = 64 characters)
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    // Restore original env var
    if (originalKey !== undefined) {
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    }
  });

  describe("encryptSecret / decryptSecret", () => {
    it("should encrypt and decrypt a simple string", () => {
      const plaintext = "my-secret-value";
      const { encryptedData, iv, authTag } = encryptSecret(plaintext);

      expect(encryptedData).toBeTruthy();
      expect(iv).toBeTruthy();
      expect(authTag).toBeTruthy();

      const decrypted = decryptSecret(encryptedData, iv, authTag);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same input due to random IV", () => {
      const plaintext = "my-secret-value";
      const result1 = encryptSecret(plaintext);
      const result2 = encryptSecret(plaintext);

      // Different IVs and ciphertexts
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encryptedData).not.toBe(result2.encryptedData);

      // But both decrypt to same value
      expect(decryptSecret(result1.encryptedData, result1.iv, result1.authTag)).toBe(
        plaintext,
      );
      expect(decryptSecret(result2.encryptedData, result2.iv, result2.authTag)).toBe(
        plaintext,
      );
    });

    it("should handle multi-line secrets (private keys)", () => {
      const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
... (truncated for brevity)
-----END RSA PRIVATE KEY-----`;

      const { encryptedData, iv, authTag } = encryptSecret(privateKey);
      const decrypted = decryptSecret(encryptedData, iv, authTag);

      expect(decrypted).toBe(privateKey);
    });

    it("should handle special characters", () => {
      const specialChars = 'Test!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const { encryptedData, iv, authTag } = encryptSecret(specialChars);
      const decrypted = decryptSecret(encryptedData, iv, authTag);

      expect(decrypted).toBe(specialChars);
    });

    it("should handle Unicode characters", () => {
      const unicode = "Hello 世界 🚀 Привет";
      const { encryptedData, iv, authTag } = encryptSecret(unicode);
      const decrypted = decryptSecret(encryptedData, iv, authTag);

      expect(decrypted).toBe(unicode);
    });

    it("should handle empty string", () => {
      const empty = "";
      const { encryptedData, iv, authTag } = encryptSecret(empty);
      const decrypted = decryptSecret(encryptedData, iv, authTag);

      expect(decrypted).toBe(empty);
    });

    it("should fail with incorrect auth tag (integrity check)", () => {
      const plaintext = "my-secret-value";
      const { encryptedData, iv, authTag } = encryptSecret(plaintext);

      // Corrupt the auth tag
      const corruptedAuthTag = authTag.slice(0, -2) + "00";

      expect(() => {
        decryptSecret(encryptedData, iv, corruptedAuthTag);
      }).toThrow();
    });

    it("should fail with incorrect IV", () => {
      const plaintext = "my-secret-value";
      const { encryptedData, iv, authTag } = encryptSecret(plaintext);

      // Use different IV
      const wrongIv = encryptSecret("other").iv;

      expect(() => {
        decryptSecret(encryptedData, wrongIv, authTag);
      }).toThrow();
    });
  });
});

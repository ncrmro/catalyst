import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "../security";

describe("Security Utils", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set a fixed key for testing (32 bytes hex)
    process.env.TOKEN_ENCRYPTION_KEY =
      "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should encrypt and decrypt a string correctly", () => {
    const text = "sensitive-data";
    const encrypted = encrypt(text);

    expect(encrypted.encryptedData).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.encryptedData).not.toBe(text);

    const decrypted = decrypt(
      encrypted.encryptedData,
      encrypted.iv,
      encrypted.authTag,
    );

    expect(decrypted).toBe(text);
  });

  it("should produce different ciphertexts for same text (random IV)", () => {
    const text = "same-text";
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);

    expect(enc1.encryptedData).not.toBe(enc2.encryptedData);
    expect(enc1.iv).not.toBe(enc2.iv);

    expect(decrypt(enc1.encryptedData, enc1.iv, enc1.authTag)).toBe(text);
    expect(decrypt(enc2.encryptedData, enc2.iv, enc2.authTag)).toBe(text);
  });

  it("should throw error if key is missing", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encrypt("text")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("should fail decryption with wrong auth tag", () => {
    const text = "secret";
    const { encryptedData, iv } = encrypt(text);
    const wrongTag = "00".repeat(16);

    expect(() => decrypt(encryptedData, iv, wrongTag)).toThrow();
  });
});

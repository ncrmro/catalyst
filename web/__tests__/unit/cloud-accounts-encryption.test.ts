/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  encryptCloudCredential,
  decryptCloudCredential,
} from "@/models/cloud-accounts";

// Spec 012 §3.2: When long-lived keys are unavoidable, they MUST be encrypted at rest
describe("cloud credential encryption", () => {
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    if (originalKey !== undefined) {
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    }
  });

  // Spec 012 §3.2: Credentials MUST be encrypted at rest — verify AES-256-GCM round-trip
  it("should round-trip a JSON credential string", () => {
    const credential = JSON.stringify({
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    });

    const { encryptedData, iv, authTag } = encryptCloudCredential(credential);

    expect(encryptedData).toBeDefined();
    expect(iv).toBeDefined();
    expect(authTag).toBeDefined();
    expect(encryptedData).not.toBe(credential);

    const decrypted = decryptCloudCredential(encryptedData, iv, authTag);
    expect(decrypted).toBe(credential);
  });

  // Spec 012 §3.2: Encrypted credentials must detect tampering (GCM auth tag verification)
  it("should throw on tampered auth tag", () => {
    const credential = '{"key": "value"}';
    const { encryptedData, iv, authTag } = encryptCloudCredential(credential);

    // Tamper with the auth tag
    const tamperedAuthTag =
      authTag.slice(0, -2) + (authTag.endsWith("00") ? "ff" : "00");

    expect(() =>
      decryptCloudCredential(encryptedData, iv, tamperedAuthTag),
    ).toThrow();
  });
});

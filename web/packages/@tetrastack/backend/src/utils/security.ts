/**
 * Security Utilities
 *
 * Provides encryption and decryption utilities for sensitive data
 * (like OAuth tokens) using AES-256-GCM.
 *
 * Requirements:
 * - TOKEN_ENCRYPTION_KEY environment variable (32-byte hex string)
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild = process.env.NEXT_PHASE === "phase-production-build";

// Only check environment variables at runtime, not during build
if (!isNextJsBuild && !process.env.TOKEN_ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "TOKEN_ENCRYPTION_KEY environment variable is required in production. Application will exit.",
    );
    // process.exit(1); // Don't hard exit library code, let app handle it or fail on usage
  } else {
    console.warn(
      "TOKEN_ENCRYPTION_KEY environment variable is not set. Token encryption will not work.",
    );
  }
}

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt a string using AES-256-GCM
 * 
 * @param text The text to encrypt
 * @returns Encrypted data object with IV and auth tag
 * @throws Error if TOKEN_ENCRYPTION_KEY is not set
 */
export function encrypt(text: string): EncryptedData {
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is required for encryption",
    );
  }

  const iv = randomBytes(16);
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey, "hex"),
    iv,
  );

  let encryptedData = cipher.update(text, "utf8", "hex");
  encryptedData += cipher.final("hex");

  // GCM mode provides authentication tag for integrity verification
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedData,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypt a string using AES-256-GCM
 * 
 * @param encryptedData The encrypted hex string
 * @param iv The initialization vector hex string
 * @param authTag The authentication tag hex string
 * @returns Decrypted plain text
 * @throws Error if TOKEN_ENCRYPTION_KEY is not set or decryption fails
 */
export function decrypt(
  encryptedData: string,
  iv: string,
  authTag: string,
): string {
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is required for decryption",
    );
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey, "hex"),
    Buffer.from(iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

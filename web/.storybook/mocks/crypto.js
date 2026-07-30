/**
 * Mock crypto module for Storybook browser environment
 * The Node.js crypto module cannot run in the browser
 */

// Mock randomBytes function
export function randomBytes(size) {
  const bytes = new Uint8Array(size);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback for non-browser environments
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return {
    toString: (encoding) => {
      if (encoding === "hex") {
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
      if (encoding === "base64") {
        return btoa(String.fromCharCode(...bytes));
      }
      return String.fromCharCode(...bytes);
    },
  };
}

// Mock other commonly used crypto functions
export function createHash(algorithm) {
  return {
    update: (data) => ({
      digest: (encoding) => "mock-hash",
    }),
  };
}

export function createHmac(algorithm, key) {
  return {
    update: (data) => ({
      digest: (encoding) => "mock-hmac",
    }),
  };
}

// Mock cipher functions for encryption/decryption
export function createCipheriv(algorithm, key, iv) {
  return {
    update: (data, inputEncoding, outputEncoding) => {
      return "mock-encrypted-data";
    },
    final: (outputEncoding) => {
      return "";
    },
  };
}

export function createDecipheriv(algorithm, key, iv) {
  return {
    update: (data, inputEncoding, outputEncoding) => {
      return "mock-decrypted-data";
    },
    final: (outputEncoding) => {
      return "";
    },
  };
}

// Mock timing safe comparison
export function timingSafeEqual(a, b) {
  // In a real implementation this would be constant-time
  // For mocking purposes, just compare
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export default { 
  randomBytes, 
  createHash, 
  createHmac, 
  createCipheriv, 
  createDecipheriv,
  timingSafeEqual 
};

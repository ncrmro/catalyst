/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

describe('Token Encryption', () => {
  let encryptToken: any;
  let decryptToken: any;
  
  beforeAll(async () => {
    // Set test encryption key before importing the module
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    
    // Import module after setting env
    const crypto = await import('@/lib/github-app/token-crypto');
    encryptToken = crypto.encryptToken;
    decryptToken = crypto.decryptToken;
  });
  
  afterAll(() => {
    vi.unstubAllEnvs();
  });
  
  it('should encrypt and decrypt tokens correctly', () => {
    const originalToken = 'gho_1234567890abcdefghijklmnopqrstuvwxyz';
    
    // Encrypt the token
    const encrypted = encryptToken(originalToken);
    
    // Check that encrypted data structure is correct
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');
    expect(typeof encrypted.encryptedData).toBe('string');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.authTag).toBe('string');
    
    // Decrypt the token
    const decrypted = decryptToken(encrypted.encryptedData, encrypted.iv, encrypted.authTag);
    
    // Should match original
    expect(decrypted).toBe(originalToken);
  });
  
  it('should produce different encrypted data for the same token', () => {
    const token = 'gho_sametoken';
    
    const encrypted1 = encryptToken(token);
    const encrypted2 = encryptToken(token);
    
    // IV should be different each time
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
    expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
    
    // But both should decrypt to the same token
    const decrypted1 = decryptToken(encrypted1.encryptedData, encrypted1.iv, encrypted1.authTag);
    const decrypted2 = decryptToken(encrypted2.encryptedData, encrypted2.iv, encrypted2.authTag);
    
    expect(decrypted1).toBe(token);
    expect(decrypted2).toBe(token);
  });
  
  it('should throw an error for tampered encrypted data', () => {
    const token = 'gho_testtoken';
    const encrypted = encryptToken(token);
    
    // Tamper with the encrypted data by changing the first character
    const tamperedData = encrypted.encryptedData.substring(1) + '0';
    
    expect(() => {
      decryptToken(tamperedData, encrypted.iv, encrypted.authTag);
    }).toThrow();
  });
  
  it('should throw an error for wrong auth tag', () => {
    const token = 'gho_testtoken';
    const encrypted = encryptToken(token);
    
    // Use wrong auth tag
    const wrongAuthTag = encrypted.authTag.replace('a', 'b');
    
    expect(() => {
      decryptToken(encrypted.encryptedData, encrypted.iv, wrongAuthTag);
    }).toThrow();
  });
});
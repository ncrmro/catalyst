import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Key should be stored in environment variables
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY as string;
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error('TOKEN_ENCRYPTION_KEY environment variable is required in production. Application will exit.');
    process.exit(1);
  } else {
    console.warn('TOKEN_ENCRYPTION_KEY environment variable is not set. Token encryption will not work.');
  }
}

export interface EncryptedToken {
  encryptedData: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt a token using AES-256-GCM
 * @param token The token to encrypt
 * @returns Encrypted token with IV and auth tag
 */
export function encryptToken(token: string): EncryptedToken {
  if (!ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required for token encryption');
  }

  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encryptedData = cipher.update(token, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  
  // GCM mode provides authentication tag for integrity verification
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedData,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypt a token using AES-256-GCM
 * @param encryptedData The encrypted token data
 * @param iv The initialization vector
 * @param authTag The authentication tag
 * @returns Decrypted token
 */
export function decryptToken(encryptedData: string, iv: string, authTag: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required for token decryption');
  }

  const decipher = createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
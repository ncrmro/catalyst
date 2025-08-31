// vitest.setup.ts
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Set test environment 
process.env.NODE_ENV = 'test';

// Display a message that environment variables are loaded
console.log('Vitest setup: Environment variables loaded from .env');

// Log that KUBECONFIG_PRIMARY is available (without revealing contents)
if (process.env.KUBECONFIG_PRIMARY) {
  console.log('Vitest setup: KUBECONFIG_PRIMARY environment variable is available');
} else {
  console.warn('Vitest setup: KUBECONFIG_PRIMARY environment variable is NOT available');
}
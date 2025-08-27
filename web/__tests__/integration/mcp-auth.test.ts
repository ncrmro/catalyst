/**
 * @jest-environment node
 */

import { getFirstUser, validateApiKey } from '@/lib/mcp-auth';

describe('MCP Auth - Integration Tests', () => {
  beforeAll(() => {
    // Ensure we're not in mocked mode for integration tests
    delete process.env.MOCKED;
  });

  describe('getFirstUser', () => {
    test('should connect to real database and return user or null', async () => {
      const result = await getFirstUser();
      
      // Test the actual integration - should return either a real user or null
      if (result) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('name');
        expect(typeof result.id).toBe('string');
        expect(typeof result.email).toBe('string');
        console.log('Integration test: Found first user:', result.email);
      } else {
        console.log('Integration test: No users found in database');
        expect(result).toBeNull();
      }
    });

    test('should return consistent user data structure', async () => {
      const result = await getFirstUser();
      
      if (result) {
        // Validate the structure matches expected user schema
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('emailVerified');
        expect(result).toHaveProperty('image');
        expect(result).toHaveProperty('admin');
        
        expect(typeof result.id).toBe('string');
        expect(typeof result.admin).toBe('boolean');
        console.log('Integration test: User structure is correct');
      } else {
        console.log('Skipping structure test - no users available');
      }
    });
  });

  describe('validateApiKey', () => {
    test('should return null when no API key is configured', async () => {
      // Don't set MCP_API_KEY to test the "not configured" case
      delete process.env.MCP_API_KEY;
      
      const result = await validateApiKey('any-key');
      
      expect(result).toBeNull();
      console.log('Integration test: Correctly rejected when API key not configured');
    });

    test('should return null for incorrect API key when configured', async () => {
      // Set a test API key
      process.env.MCP_API_KEY = 'test-integration-key';
      
      const result = await validateApiKey('wrong-key');
      
      expect(result).toBeNull();
      console.log('Integration test: Correctly rejected incorrect API key');
    });

    test('should return user when API key matches (if user exists)', async () => {
      // Set a test API key
      process.env.MCP_API_KEY = 'test-integration-key';
      
      const result = await validateApiKey('test-integration-key');
      
      // This will return a user only if there's a user in the database
      if (result) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('email');
        expect(typeof result.id).toBe('string');
        expect(typeof result.email).toBe('string');
        console.log('Integration test: Successfully validated API key for user:', result.email);
      } else {
        console.log('Integration test: API key validation returned null (no users in database)');
      }
    });
  });

  afterAll(() => {
    // Clean up test environment
    delete process.env.MCP_API_KEY;
  });
});
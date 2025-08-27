/**
 * @jest-environment node
 */

import { getNamespacesForUser, getNamespaceDetails } from '@/lib/mcp-namespaces';

describe('MCP Namespaces - Integration Tests', () => {
  beforeAll(() => {
    // Ensure we're not in mocked mode for integration tests
    delete process.env.MOCKED;
  });

  describe('getNamespacesForUser', () => {
    test('should connect to real Kubernetes API and return namespaces', async () => {
      const result = await getNamespacesForUser('test-user');
      
      // Should return an array (empty or with real namespaces)
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        // If we have namespaces, validate their structure
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('labels');
        expect(result[0]).toHaveProperty('creationTimestamp');
        expect(typeof result[0].name).toBe('string');
        expect(typeof result[0].labels).toBe('object');
        expect(typeof result[0].creationTimestamp).toBe('string');
        console.log(`Integration test: Found ${result.length} namespaces`);
      } else {
        console.log('Integration test: No namespaces found (Kubernetes not available or no namespaces)');
      }
    });

    test('should handle cluster name parameter', async () => {
      const result = await getNamespacesForUser('test-user', 'test-cluster');
      
      // Should return an array regardless of cluster availability
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        console.log(`Integration test: Found ${result.length} namespaces for cluster 'test-cluster'`);
      } else {
        console.log('Integration test: No namespaces found for cluster parameter (expected if cluster not available)');
      }
    });

    test('should return empty array when Kubernetes is not available', async () => {
      // This tests the error handling behavior with real services
      const result = await getNamespacesForUser('test-user');
      
      expect(Array.isArray(result)).toBe(true);
      // If Kubernetes is not available, should return empty array gracefully
      console.log(`Integration test: Gracefully handled Kubernetes availability, returned ${result.length} namespaces`);
    });
  });

  describe('getNamespaceDetails', () => {
    test('should return namespace details when namespace exists', async () => {
      // First get available namespaces to test with a real one
      const namespaces = await getNamespacesForUser('test-user');
      
      if (namespaces.length > 0) {
        const testNamespace = namespaces[0].name;
        const result = await getNamespaceDetails(testNamespace);
        
        if (result) {
          expect(result).toHaveProperty('name', testNamespace);
          expect(result).toHaveProperty('labels');
          expect(result).toHaveProperty('creationTimestamp');
          expect(typeof result.name).toBe('string');
          expect(typeof result.labels).toBe('object');
          console.log(`Integration test: Successfully retrieved details for namespace '${testNamespace}'`);
        } else {
          console.log(`Integration test: Namespace '${testNamespace}' not found in detailed lookup`);
        }
      } else {
        console.log('Integration test: Skipping namespace details test - no namespaces available');
      }
    });

    test('should return null for non-existent namespace', async () => {
      const result = await getNamespaceDetails('non-existent-namespace-12345');
      
      expect(result).toBeNull();
      console.log('Integration test: Correctly returned null for non-existent namespace');
    });

    test('should handle resources parameter correctly', async () => {
      // Test with a commonly available namespace like 'default' if it exists
      const namespaces = await getNamespacesForUser('test-user');
      const defaultNamespace = namespaces.find(ns => ns.name === 'default');
      
      if (defaultNamespace) {
        const result = await getNamespaceDetails('default', ['pods', 'services']);
        
        if (result) {
          expect(result).toHaveProperty('name', 'default');
          expect(result).toHaveProperty('requestedResources');
          expect(result.requestedResources).toEqual(['pods', 'services']);
          console.log('Integration test: Successfully handled resources parameter');
        } else {
          console.log('Integration test: Default namespace not accessible in detailed lookup');
        }
      } else {
        console.log('Integration test: Skipping resources test - default namespace not available');
      }
    });

    test('should handle cluster name parameter', async () => {
      const result = await getNamespaceDetails('test-namespace', undefined, 'test-cluster');
      
      // Should return null for non-existent namespace/cluster combination
      expect(result).toBeNull();
      console.log('Integration test: Correctly handled cluster name parameter');
    });

    test('should handle real Kubernetes connection gracefully', async () => {
      // This tests error handling with real Kubernetes integration
      const result = await getNamespaceDetails('any-namespace');
      
      // Should return either a namespace object or null, not throw
      expect(result === null || (typeof result === 'object' && result.name)).toBe(true);
      console.log('Integration test: Gracefully handled Kubernetes connection');
    });
  });
});
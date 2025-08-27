import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { getNamespacesForUser, getNamespaceDetails } from '@/lib/mcp-namespaces';

// Mock the dependencies
jest.mock('@/lib/k8s-namespaces');

const mockListNamespaces = jest.mocked(require('@/lib/k8s-namespaces').listNamespaces);

describe('MCP Namespaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNamespacesForUser', () => {
    it('should return all namespaces for a user', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'kube-system', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'user-project-prod', labels: { 'catalyst/team': 'user' }, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      mockListNamespaces.mockResolvedValue(mockNamespaces);

      const result = await getNamespacesForUser('user-1');

      expect(result).toEqual(mockNamespaces);
      expect(mockListNamespaces).toHaveBeenCalledWith(undefined);
    });

    it('should return namespaces for specific cluster', async () => {
      const mockNamespaces = [
        { name: 'prod-namespace', labels: { environment: 'production' }, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      mockListNamespaces.mockResolvedValue(mockNamespaces);

      const result = await getNamespacesForUser('user-1', 'production');

      expect(result).toEqual(mockNamespaces);
      expect(mockListNamespaces).toHaveBeenCalledWith('production');
    });

    it('should return empty array on error', async () => {
      mockListNamespaces.mockRejectedValue(new Error('Kubernetes error'));

      const result = await getNamespacesForUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getNamespaceDetails', () => {
    it('should return namespace details when namespace exists', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'target-ns', labels: { environment: 'test' }, creationTimestamp: '2023-01-02T00:00:00Z' },
      ];

      mockListNamespaces.mockResolvedValue(mockNamespaces);

      const result = await getNamespaceDetails('target-ns');

      expect(result).toEqual({
        name: 'target-ns',
        labels: { environment: 'test' },
        creationTimestamp: '2023-01-02T00:00:00Z',
      });
      expect(mockListNamespaces).toHaveBeenCalledWith(undefined);
    });

    it('should return null when namespace does not exist', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      mockListNamespaces.mockResolvedValue(mockNamespaces);

      const result = await getNamespaceDetails('non-existent');

      expect(result).toBeNull();
    });

    it('should include requested resources in response', async () => {
      const mockNamespaces = [
        { name: 'target-ns', labels: { environment: 'test' }, creationTimestamp: '2023-01-02T00:00:00Z' },
      ];

      mockListNamespaces.mockResolvedValue(mockNamespaces);

      const result = await getNamespaceDetails('target-ns', ['pods', 'services']);

      expect(result).toEqual({
        name: 'target-ns',
        labels: { environment: 'test' },
        creationTimestamp: '2023-01-02T00:00:00Z',
        requestedResources: ['pods', 'services'],
        message: 'Resource details not implemented yet',
      });
    });

    it('should work with cluster name parameter', async () => {
      const mockNamespaces = [
        { name: 'prod-ns', labels: { environment: 'production' }, creationTimestamp: '2023-01-02T00:00:00Z' },
      ];

      mockListNamespaces.mockResolvedValue(mockNamespaces);

      const result = await getNamespaceDetails('prod-ns', undefined, 'production');

      expect(result).toEqual({
        name: 'prod-ns',
        labels: { environment: 'production' },
        creationTimestamp: '2023-01-02T00:00:00Z',
      });
      expect(mockListNamespaces).toHaveBeenCalledWith('production');
    });

    it('should return null on error', async () => {
      mockListNamespaces.mockRejectedValue(new Error('Kubernetes error'));

      const result = await getNamespaceDetails('any-ns');

      expect(result).toBeNull();
    });
  });
});
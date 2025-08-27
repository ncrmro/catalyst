import { describe, expect, it, beforeEach, jest } from '@jest/globals';

describe('MCP Namespaces - Unit Tests', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    teams: [
      { id: 'team-1', name: 'user', role: 'owner' }
    ],
    projects: [
      { id: 'project-1', name: 'test-project', teamId: 'team-1' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('getNamespacesForUser', () => {
    it('should return filtered namespaces for a user based on team membership', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'kube-system', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'user-project-prod', labels: { 'catalyst/team': 'user' }, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'other-team-ns', labels: { 'catalyst/team': 'other' }, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      const expectedFilteredNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'kube-system', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'user-project-prod', labels: { 'catalyst/team': 'user' }, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      const mockListNamespaces = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespacesForUser } = await import('@/lib/mcp-namespaces');
      const result = await getNamespacesForUser(mockUser);

      expect(result).toEqual(expectedFilteredNamespaces);
      expect(mockListNamespaces).toHaveBeenCalledWith(undefined);
    });

    it('should return namespaces for specific cluster', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'prod-namespace', labels: { environment: 'production' }, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      const expectedFilteredNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      const mockListNamespaces = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespacesForUser } = await import('@/lib/mcp-namespaces');
      const result = await getNamespacesForUser(mockUser, 'production');

      expect(result).toEqual(expectedFilteredNamespaces);
      expect(mockListNamespaces).toHaveBeenCalledWith('production');
    });

    it('should return empty array on error', async () => {
      const mockListNamespaces = jest.fn().mockRejectedValue(new Error('Kubernetes error'));

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespacesForUser } = await import('@/lib/mcp-namespaces');
      const result = await getNamespacesForUser(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('getNamespaceDetails', () => {
    it('should return namespace details when namespace exists and user has access', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'target-ns', labels: { 'catalyst/team': 'user' }, creationTimestamp: '2023-01-02T00:00:00Z' },
      ];

      const mockListNamespaces = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespaceDetails } = await import('@/lib/mcp-namespaces');
      const result = await getNamespaceDetails('target-ns', mockUser);

      expect(result).toEqual({
        name: 'target-ns',
        labels: { 'catalyst/team': 'user' },
        creationTimestamp: '2023-01-02T00:00:00Z',
      });
    });

    it('should return null when namespace does not exist', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      const mockListNamespaces = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespaceDetails } = await import('@/lib/mcp-namespaces');
      const result = await getNamespaceDetails('non-existent', mockUser);

      expect(result).toBeNull();
    });

    it('should return null when user does not have access to namespace', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'restricted-ns', labels: { 'catalyst/team': 'other-team' }, creationTimestamp: '2023-01-02T00:00:00Z' },
      ];

      const mockListNamespaces = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespaceDetails } = await import('@/lib/mcp-namespaces');
      const result = await getNamespaceDetails('restricted-ns', mockUser);

      expect(result).toBeNull();
    });

    it('should include requested resources in response', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'target-ns', labels: { 'catalyst/team': 'user' }, creationTimestamp: '2023-01-02T00:00:00Z' },
      ];

      const mockListNamespaces = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespaceDetails } = await import('@/lib/mcp-namespaces');
      const result = await getNamespaceDetails('target-ns', mockUser, ['pods', 'services']);

      expect(result).toEqual({
        name: 'target-ns',
        labels: { 'catalyst/team': 'user' },
        creationTimestamp: '2023-01-02T00:00:00Z',
        requestedResources: ['pods', 'services'],
        message: 'Resource details not implemented yet',
      });
    });

    it('should work with cluster name parameter', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'prod-ns', labels: { 'catalyst/team': 'user' }, creationTimestamp: '2023-01-02T00:00:00Z' },
      ];

      const mockListNamespaces = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespaceDetails } = await import('@/lib/mcp-namespaces');
      const result = await getNamespaceDetails('prod-ns', mockUser, undefined, 'production');

      expect(result).toEqual({
        name: 'prod-ns',
        labels: { 'catalyst/team': 'user' },
        creationTimestamp: '2023-01-02T00:00:00Z',
      });
    });

    it('should return null on error', async () => {
      const mockListNamespaces = jest.fn().mockRejectedValue(new Error('Kubernetes error'));

      jest.doMock('@/lib/k8s-namespaces', () => ({
        listNamespaces: mockListNamespaces,
      }));

      const { getNamespaceDetails } = await import('@/lib/mcp-namespaces');
      const result = await getNamespaceDetails('any-ns', mockUser);

      expect(result).toBeNull();
    });
  });
});
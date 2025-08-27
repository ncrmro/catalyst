'use server';

import { listNamespaces } from '@/lib/k8s-namespaces';
import { NamespaceInfo } from '@/actions/namespaces';
import { McpUser } from '@/lib/mcp-auth';

/**
 * Get namespaces that a specific user can access based on their team memberships
 */
export async function getNamespacesForUser(user: McpUser, clusterName?: string): Promise<NamespaceInfo[]> {
  try {
    // Get all namespaces
    const allNamespaces = await listNamespaces(clusterName);
    
    // Get user's team names for filtering
    const userTeamNames = user.teams.map(team => team.name.toLowerCase());
    
    // Filter namespaces based on catalyst/team label
    const accessibleNamespaces = allNamespaces.filter(namespace => {
      // If the namespace has no labels, only allow if user is admin/has access to default namespaces
      if (!namespace.labels) {
        // For system namespaces like 'default', 'kube-system', allow access
        return ['default', 'kube-system', 'kube-public', 'kube-node-lease'].includes(namespace.name);
      }

      // Check if namespace has catalyst/team label matching user's teams
      const namespaceTeam = namespace.labels['catalyst/team'];
      if (namespaceTeam) {
        return userTeamNames.includes(namespaceTeam.toLowerCase());
      }

      // For namespaces without catalyst/team label, allow access to system namespaces
      return ['default', 'kube-system', 'kube-public', 'kube-node-lease'].includes(namespace.name);
    });
    
    return accessibleNamespaces;
  } catch (error) {
    console.error('Error fetching namespaces for user:', error);
    return [];
  }
}

/**
 * Get details for a specific namespace with optional resource information
 * Only returns namespace details if the user has access to it
 */
export async function getNamespaceDetails(namespaceName: string, user: McpUser, resources?: string[], clusterName?: string) {
  try {
    // First check if user has access to this namespace
    const accessibleNamespaces = await getNamespacesForUser(user, clusterName);
    const hasAccess = accessibleNamespaces.some(ns => ns.name === namespaceName);
    
    if (!hasAccess) {
      return null;
    }

    // Get all namespaces to find the specific one
    const allNamespaces = await listNamespaces(clusterName);
    const namespace = allNamespaces.find(ns => ns.name === namespaceName);
    
    if (!namespace) {
      return null;
    }

    // Base namespace info
    const result: {
      name: string;
      labels?: { [key: string]: string };
      creationTimestamp?: string;
      requestedResources?: string[];
      message?: string;
    } = {
      name: namespace.name,
      labels: namespace.labels,
      creationTimestamp: namespace.creationTimestamp,
    };

    // If specific resources are requested, we could fetch them here
    // For now, we'll just return the namespace info
    if (resources && resources.length > 0) {
      result.requestedResources = resources;
      result.message = 'Resource details not implemented yet';
    }

    return result;
  } catch (error) {
    console.error('Error fetching namespace details:', error);
    return null;
  }
}
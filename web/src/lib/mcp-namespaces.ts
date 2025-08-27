'use server';

import { listNamespaces } from '@/lib/k8s-namespaces';
import { NamespaceInfo } from '@/actions/namespaces';

/**
 * Get namespaces that a specific user can access based on their team memberships
 */
export async function getNamespacesForUser(userId: string, clusterName?: string): Promise<NamespaceInfo[]> {
  try {
    // Get all namespaces
    const allNamespaces = await listNamespaces(clusterName);
    
    // Get user's team IDs - we'll simulate this since we don't have full session context
    // In a real implementation, this would use the user's actual team memberships
    
    // For now, return all namespaces since we don't have the user context
    // In a production system, you'd filter based on the user's team labels
    return allNamespaces;
  } catch (error) {
    console.error('Error fetching namespaces for user:', error);
    return [];
  }
}

/**
 * Get details for a specific namespace with optional resource information
 */
export async function getNamespaceDetails(namespaceName: string, resources?: string[], clusterName?: string) {
  try {
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
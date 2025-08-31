/**
 * Integration test for listing namespaces using the PRIMARY Kubernetes cluster
 * 
 * This test verifies that we can connect to the PRIMARY cluster and list namespaces.
 * Note: This test requires a valid Kubernetes configuration available in the
 * KUBECONFIG_PRIMARY environment variable or from the default kubeconfig.
 * 
 * To run this test, the .env file must contain a valid base64-encoded kubeconfig
 * in the KUBECONFIG_PRIMARY environment variable.
 */

import { getClusterConfig, getCoreV1Api } from '../../src/lib/k8s-client';
import { listNamespaces } from '../../src/lib/k8s-namespaces';

import {beforeAll,describe, it, expect } from 'vitest'

describe('Kubernetes Namespace Integration', () => {
  beforeAll(() => {
    // Verify KUBECONFIG_PRIMARY is set - test will fail if it's not defined
    expect(process.env.KUBECONFIG_PRIMARY).toBeDefined();
  });

  describe('PRIMARY cluster namespace operations', () => {
    it('should connect to PRIMARY cluster and list namespaces', async () => {
      // Get the PRIMARY cluster configuration
      const kc = await getClusterConfig('PRIMARY');
      
      // Ensure we have a valid configuration
      expect(kc).not.toBeNull();
      
      // Get cluster info to confirm we're connected to the expected cluster
        const clusterInfo = kc.getClusterInfo();
        
        // Get the CoreV1Api to work with core Kubernetes resources
        const CoreV1Api = await getCoreV1Api();
        const k8sApi = kc.makeApiClient(CoreV1Api);
        
        // List namespaces directly using the API client
        const response = await k8sApi.listNamespace();

        // Verify we get a valid response with items
        expect(response).toBeDefined();
        expect(response.items).toBeInstanceOf(Array);
        
        // There should always be at least the default namespaces (kube-system, default, etc.)
        expect(response.items.length).toBeGreaterThan(0);
        
        // Verify some default namespaces exist
        const namespaceNames = response.items.map((ns: any) => ns.metadata?.name);
        expect(namespaceNames).toContain('default');
        expect(namespaceNames).toContain('kube-system');
    })        
  });
});

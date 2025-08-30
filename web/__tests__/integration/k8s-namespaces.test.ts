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

describe('Kubernetes Namespace Integration', () => {
  beforeAll(() => {
    // Set a longer timeout for integration tests that interact with external services
    jest.setTimeout(30000);
    
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
      if (kc) {
        const clusterInfo = kc.getClusterInfo();
        console.log(`Connected to cluster: ${clusterInfo.name} at ${clusterInfo.endpoint}`);
        
        // Get the CoreV1Api to work with core Kubernetes resources
        const CoreV1Api = await getCoreV1Api();
        const k8sApi = kc.makeApiClient(CoreV1Api);
        
        // List namespaces directly using the API client
        const response = await k8sApi.listNamespace();
        
        // Verify we get a valid response with items
        expect(response).toBeDefined();
        expect(response.body).toBeDefined();
        expect(response.body.items).toBeInstanceOf(Array);
        
        // There should always be at least the default namespaces (kube-system, default, etc.)
        expect(response.body.items.length).toBeGreaterThan(0);
        
        // Verify some default namespaces exist
        const namespaceNames = response.body.items.map((ns: any) => ns.metadata?.name);
        expect(namespaceNames).toContain('default');
        expect(namespaceNames).toContain('kube-system');
        
        console.log(`Found ${response.body.items.length} namespaces`);
      }
    });

    it('should list namespaces using the helper function', async () => {
      // Use the listNamespaces helper function which should internally use the PRIMARY cluster
      const namespaces = await listNamespaces('PRIMARY');
      
      // Verify we get a valid response
      expect(namespaces).toBeInstanceOf(Array);
      expect(namespaces.length).toBeGreaterThan(0);
      
      // Each namespace should have a name
      namespaces.forEach(ns => {
        expect(ns).toHaveProperty('name');
        expect(typeof ns.name).toBe('string');
      });
      
      // Verify some default namespaces exist
      const namespaceNames = namespaces.map(ns => ns.name);
      expect(namespaceNames).toContain('default');
      expect(namespaceNames).toContain('kube-system');
      
      // Log the namespaces with catalyst labels if any
      const catalystNamespaces = namespaces.filter(ns => 
        ns.labels && Object.keys(ns.labels).some(key => key.startsWith('catalyst/'))
      );
      
      if (catalystNamespaces.length > 0) {
        console.log(`Found ${catalystNamespaces.length} namespaces with catalyst labels`);
        catalystNamespaces.forEach(ns => {
          console.log(`- ${ns.name}: ${JSON.stringify(ns.labels)}`);
        });
      } else {
        console.log('No namespaces with catalyst labels found');
      }
    });
  });
});
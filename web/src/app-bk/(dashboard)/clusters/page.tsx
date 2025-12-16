import { notFound } from 'next/navigation';
import { getClusters, getGitHubOIDCStatus, ClusterInfo } from '@/actions/clusters';
import { auth } from '@/auth';
import { ClusterCard } from '@/components/ClusterCard';

// Mock cluster data for when real data is not available
const mockClusters = [
  {
    name: 'staging',
    costPerMonth: '$245.50',
    currentNodes: 3,
    maxNodes: 8,
    allocatedCPU: '12 vCPUs',
    allocatedMemory: '48 GB',
    allocatedStorage: '500 GB'
  },
  {
    name: 'production', 
    costPerMonth: '$892.75',
    currentNodes: 8,
    maxNodes: 16,
    allocatedCPU: '32 vCPUs',
    allocatedMemory: '128 GB', 
    allocatedStorage: '2 TB'
  }
];

interface ExtendedClusterInfo extends ClusterInfo {
  costPerMonth?: string;
  currentNodes?: number;
  maxNodes?: number;
  allocatedCPU?: string;
  allocatedMemory?: string;
  allocatedStorage?: string;
  githubOIDCEnabled?: boolean;
}


export default async function ClustersPage() {
  // Check if user is authenticated and has admin privileges
  const session = await auth();
  if (!session.user.admin) {
    notFound();
    return; // Add return to stop execution
  }

  // Try to get real cluster data
  let clusters: ExtendedClusterInfo[] = [];
  try {
    const realClusters = await getClusters();
    
    // Fetch GitHub OIDC status for each cluster
    const clustersWithOIDC = await Promise.all(
      realClusters.map(async (cluster) => {
        let githubOIDCEnabled = false;
        try {
          // Only check OIDC status for real clusters
          if (cluster.endpoint && cluster.source) {
            githubOIDCEnabled = await getGitHubOIDCStatus(cluster.name);
          }
        } catch (error) {
          console.warn(`Failed to get GitHub OIDC status for cluster ${cluster.name}:`, error);
        }
        
        return {
          ...cluster,
          githubOIDCEnabled
        };
      })
    );
    
    clusters = clustersWithOIDC;
  } catch (error) {
    console.warn('Failed to load real cluster data, using mock data:', error);
    clusters = mockClusters.map(cluster => ({ 
      ...cluster, 
      endpoint: '', 
      source: 'mock',
      githubOIDCEnabled: false 
    }));
  }

  // If no clusters found, use mock data
  if (clusters.length === 0) {
    clusters = mockClusters.map(cluster => ({ 
      ...cluster, 
      endpoint: '', 
      source: 'mock',
      githubOIDCEnabled: false 
    }));
  }

  const hasRealClusters = clusters.some(cluster => cluster.source !== 'mock');

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-background catalyst-title">Clusters</h1>
          <p className="mt-2 text-on-surface-variant">
            Monitor and manage your Kubernetes clusters
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map((cluster, index) => (
            <ClusterCard key={`${cluster.name}-${cluster.source}-${index}`} cluster={cluster} />
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-on-surface-variant">
            {hasRealClusters 
              ? 'Showing real cluster data from kubeconfig sources'
              : 'This is a demo page showing mock cluster data. Configure KUBECONFIG_PRIMARY, KUBECONFIG_FOO, or KUBECONFIG_BAR environment variables to see real cluster data.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
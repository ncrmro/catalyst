import { isFeatureEnabled } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';
import { getClusters, ClusterInfo } from '@/actions/clusters';

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
}

function ClusterCard({ cluster }: { cluster: ExtendedClusterInfo }) {
  const isRealCluster = !!(cluster.endpoint && cluster.source);
  
  return (
    <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-card-foreground capitalize">
          {cluster.name}
        </h3>
        {isRealCluster && (
          <span className="text-xs bg-muted text-primary-foreground-container px-2 py-1 rounded">
            {cluster.source}
          </span>
        )}
      </div>
      
      {isRealCluster && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Endpoint</p>
          <p className="text-sm font-mono text-card-foreground break-all">{cluster.endpoint}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Cost per Month</p>
          <p className="text-lg font-medium text-secondary">{cluster.costPerMonth || 'N/A'}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Nodes</p>
          <p className="text-lg font-medium text-card-foreground">
            {cluster.currentNodes && cluster.maxNodes ? `${cluster.currentNodes} / ${cluster.maxNodes}` : 'N/A'}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">CPU</p>
          <p className="text-lg font-medium text-card-foreground">{cluster.allocatedCPU || 'N/A'}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Memory</p>
          <p className="text-lg font-medium text-card-foreground">{cluster.allocatedMemory || 'N/A'}</p>
        </div>
        
        <div className="col-span-2">
          <p className="text-sm text-muted-foreground">Storage</p>
          <p className="text-lg font-medium text-card-foreground">{cluster.allocatedStorage || 'N/A'}</p>
        </div>
      </div>
      
      {cluster.currentNodes && cluster.maxNodes && (
        <div className="mt-4 bg-muted rounded p-3">
          <div className="flex justify-between text-sm text-primary-foreground-container">
            <span>Node Utilization:</span>
            <span>{Math.round((cluster.currentNodes / cluster.maxNodes) * 100)}%</span>
          </div>
          <div className="w-full bg-outline rounded-full h-2 mt-1">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${(cluster.currentNodes / cluster.maxNodes) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default async function ClustersPage() {
  // Check if the feature flag is enabled
  if (!isFeatureEnabled('USER_CLUSTERS')) {
    notFound();
  }

  // Try to get real cluster data
  let clusters: ExtendedClusterInfo[] = [];
  try {
    const realClusters = await getClusters();
    clusters = realClusters;
  } catch (error) {
    console.warn('Failed to load real cluster data, using mock data:', error);
    clusters = mockClusters.map(cluster => ({ ...cluster, endpoint: '', source: 'mock' }));
  }

  // If no clusters found, use mock data
  if (clusters.length === 0) {
    clusters = mockClusters.map(cluster => ({ ...cluster, endpoint: '', source: 'mock' }));
  }

  const hasRealClusters = clusters.some(cluster => cluster.source !== 'mock');

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground catalyst-title">Clusters</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor and manage your Kubernetes clusters
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map((cluster, index) => (
            <ClusterCard key={`${cluster.name}-${cluster.source}-${index}`} cluster={cluster} />
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
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
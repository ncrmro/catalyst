import { isFeatureEnabled } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';

// Mock cluster data
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

function ClusterCard({ cluster }: { cluster: typeof mockClusters[0] }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 capitalize">
        {cluster.name}
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Cost per Month</p>
          <p className="text-lg font-medium text-green-600">{cluster.costPerMonth}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600">Nodes</p>
          <p className="text-lg font-medium">
            {cluster.currentNodes} / {cluster.maxNodes}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600">CPU</p>
          <p className="text-lg font-medium">{cluster.allocatedCPU}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600">Memory</p>
          <p className="text-lg font-medium">{cluster.allocatedMemory}</p>
        </div>
        
        <div className="col-span-2">
          <p className="text-sm text-gray-600">Storage</p>
          <p className="text-lg font-medium">{cluster.allocatedStorage}</p>
        </div>
      </div>
      
      <div className="mt-4 bg-gray-50 rounded p-3">
        <div className="flex justify-between text-sm">
          <span>Node Utilization:</span>
          <span>{Math.round((cluster.currentNodes / cluster.maxNodes) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${(cluster.currentNodes / cluster.maxNodes) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function ClustersPage() {
  // Check if the feature flag is enabled
  if (!isFeatureEnabled('USER_CLUSTERS')) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Clusters</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage your Kubernetes clusters
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockClusters.map((cluster) => (
            <ClusterCard key={cluster.name} cluster={cluster} />
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This is a demo page showing mock cluster data.
          </p>
        </div>
      </div>
    </div>
  );
}
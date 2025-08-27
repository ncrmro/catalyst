// Create a simplified test to check admin functionality

const mockAuth = jest.fn();
const mockGetClusters = jest.fn();
const mockNotFound = jest.fn();

// Set up mocks before any imports
jest.mock('../../src/auth', () => ({
  auth: mockAuth
}));

jest.mock('../../src/actions/clusters', () => ({
  getClusters: mockGetClusters
}));

jest.mock('next/navigation', () => ({
  notFound: mockNotFound
}));

// Mock kubernetes client
jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromString: jest.fn(),
    loadFromDefault: jest.fn(),
    getCurrentContext: jest.fn(() => 'test-context'),
    getCurrentCluster: jest.fn(() => ({ server: 'https://test-server:6443' })),
    makeApiClient: jest.fn()
  }))
}));

describe('Clusters Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    mockGetClusters.mockResolvedValue([
      {
        name: 'test-cluster',
        endpoint: 'https://test:6443',
        source: 'KUBECONFIG_TEST'
      }
    ]);
  });

  it('should allow admin users access', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'admin-user-id',
        email: 'admin@example.com',
        admin: true
      }
    });

    // Import fresh module
    delete require.cache[require.resolve('../../src/app/(dashboard)/clusters/page')];
    const ClustersPage = require('../../src/app/(dashboard)/clusters/page').default;
    
    await ClustersPage();
    
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(mockAuth).toHaveBeenCalledTimes(1);
  });

  it('should deny non-admin users access', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-id',
        email: 'user@example.com',
        admin: false
      }
    });

    // Import fresh module
    delete require.cache[require.resolve('../../src/app/(dashboard)/clusters/page')];
    const ClustersPage = require('../../src/app/(dashboard)/clusters/page').default;
    
    await ClustersPage();
    
    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockAuth).toHaveBeenCalledTimes(1);
  });
});
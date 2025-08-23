// Create a simplified test to check admin functionality

const mockAuth = jest.fn();
const mockGetClusters = jest.fn();
const mockNotFound = jest.fn();

// Set up mocks before any imports
jest.mock('../src/auth', () => ({
  auth: mockAuth
}));

jest.mock('../src/actions/clusters', () => ({
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

const originalEnv = process.env;

describe('Clusters Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // This is important for feature flag changes
    process.env = { ...originalEnv };
    process.env.FF_USER_CLUSTERS = '1'; // Enable feature flag by default
    
    mockGetClusters.mockResolvedValue([
      {
        name: 'test-cluster',
        endpoint: 'https://test:6443',
        source: 'KUBECONFIG_TEST'
      }
    ]);
  });

  afterAll(() => {
    process.env = originalEnv;
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
    delete require.cache[require.resolve('../src/app/clusters/page')];
    const ClustersPage = require('../src/app/clusters/page').default;
    
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
    delete require.cache[require.resolve('../src/app/clusters/page')];
    const ClustersPage = require('../src/app/clusters/page').default;
    
    await ClustersPage();
    
    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockAuth).toHaveBeenCalledTimes(1);
  });

  it('should still check feature flag first', async () => {
    // Disable feature flag
    process.env.FF_USER_CLUSTERS = '0';
    process.env.NODE_ENV = 'test'; // Ensure not development mode for this test
    
    mockAuth.mockResolvedValue({
      user: {
        id: 'admin-user-id',
        email: 'admin@example.com',
        admin: true
      }
    });

    // Import fresh module with new env vars
    delete require.cache[require.resolve('../src/app/clusters/page')];
    delete require.cache[require.resolve('../src/lib/feature-flags')];
    const ClustersPage = require('../src/app/clusters/page').default;
    
    await ClustersPage();
    
    // Should call notFound due to disabled feature flag, even for admin
    expect(mockNotFound).toHaveBeenCalledTimes(1);
    // Auth should not be called if feature flag fails first
    expect(mockAuth).not.toHaveBeenCalled();
  });
});
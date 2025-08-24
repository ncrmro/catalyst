import { createKubernetesNamespace } from '../../src/actions/kubernetes';

// Mock the k8s-namespaces module
jest.mock('../../src/lib/k8s-namespaces', () => ({
  createProjectNamespace: jest.fn()
}));

import { createProjectNamespace } from '../../src/lib/k8s-namespaces';

const mockCreateProjectNamespace = createProjectNamespace as jest.MockedFunction<typeof createProjectNamespace>;

describe('createKubernetesNamespace action', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create namespace successfully', async () => {
    // Mock successful namespace creation
    mockCreateProjectNamespace.mockResolvedValue({
      name: 'testteam-testproject-production',
      labels: {
        'catalyst/team': 'testteam',
        'catalyst/project': 'testproject',
        'catalyst/environment': 'production'
      },
      created: true
    });

    const result = await createKubernetesNamespace('testteam', 'testproject', 'production');

    expect(result).toMatchObject({
      success: true,
      message: 'Namespace created successfully',
      namespace: {
        name: 'testteam-testproject-production',
        labels: {
          'catalyst/team': 'testteam',
          'catalyst/project': 'testproject',
          'catalyst/environment': 'production'
        },
        created: true
      }
    });

    expect(mockCreateProjectNamespace).toHaveBeenCalledWith({
      team: 'testteam',
      project: 'testproject',
      environment: 'production'
    });
  });

  it('should handle existing namespace', async () => {
    // Mock namespace already exists
    mockCreateProjectNamespace.mockResolvedValue({
      name: 'testteam-testproject-staging',
      labels: {
        'catalyst/team': 'testteam',
        'catalyst/project': 'testproject',
        'catalyst/environment': 'staging'
      },
      created: false
    });

    const result = await createKubernetesNamespace('testteam', 'testproject', 'staging');

    expect(result).toMatchObject({
      success: true,
      message: 'Namespace already exists',
      namespace: {
        created: false
      }
    });
  });

  it('should validate required fields', async () => {
    const result = await createKubernetesNamespace('', 'testproject', 'production');

    expect(result).toMatchObject({
      success: false,
      error: 'Missing required fields: team, project, environment'
    });

    expect(mockCreateProjectNamespace).not.toHaveBeenCalled();
  });

  it('should validate environment values', async () => {
    const result = await createKubernetesNamespace('testteam', 'testproject', 'invalid-env');

    expect(result).toMatchObject({
      success: false,
      error: 'Environment must be one of: production, staging, pr-1'
    });

    expect(mockCreateProjectNamespace).not.toHaveBeenCalled();
  });

  it('should handle Kubernetes connection errors', async () => {
    // Mock connection error
    mockCreateProjectNamespace.mockRejectedValue(new Error('connection refused'));

    const result = await createKubernetesNamespace('testteam', 'testproject', 'production');

    expect(result).toMatchObject({
      success: false,
      error: 'Cannot connect to Kubernetes cluster'
    });
  });

  it('should handle unauthorized errors', async () => {
    // Mock unauthorized error
    mockCreateProjectNamespace.mockRejectedValue(new Error('Unauthorized'));

    const result = await createKubernetesNamespace('testteam', 'testproject', 'production');

    expect(result).toMatchObject({
      success: false,
      error: 'Unauthorized to access Kubernetes cluster'
    });
  });

  it('should accept all supported environments', async () => {
    const environments = ['production', 'staging', 'pr-1'];

    for (const environment of environments) {
      mockCreateProjectNamespace.mockResolvedValue({
        name: `testteam-testproject-${environment}`,
        labels: {
          'catalyst/team': 'testteam',
          'catalyst/project': 'testproject',
          'catalyst/environment': environment
        },
        created: true
      });

      const result = await createKubernetesNamespace('testteam', 'testproject', environment);

      expect(result.success).toBe(true);
      expect(result.namespace?.labels['catalyst/environment']).toBe(environment);
    }
  });
});
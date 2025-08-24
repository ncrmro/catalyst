import { createKubernetesNamespace, deleteKubernetesNamespace } from '../../src/actions/kubernetes';

// Mock the k8s-namespaces module
jest.mock('../../src/lib/k8s-namespaces', () => ({
  createProjectNamespace: jest.fn(),
  deleteNamespace: jest.fn(),
  generateNamespaceName: jest.fn()
}));

import { createProjectNamespace, deleteNamespace, generateNamespaceName } from '../../src/lib/k8s-namespaces';

const mockCreateProjectNamespace = createProjectNamespace as jest.MockedFunction<typeof createProjectNamespace>;
const mockDeleteNamespace = deleteNamespace as jest.MockedFunction<typeof deleteNamespace>;
const mockGenerateNamespaceName = generateNamespaceName as jest.MockedFunction<typeof generateNamespaceName>;

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
      error: 'Environment must be one of: production, staging or follow pattern gh-pr-NUMBER'
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
    const environments = ['production', 'staging', 'gh-pr-42', 'gh-pr-123'];

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

describe('deleteKubernetesNamespace action', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete namespace successfully', async () => {
    // Mock successful namespace deletion
    mockGenerateNamespaceName.mockReturnValue('testteam-testproject-production');
    mockDeleteNamespace.mockResolvedValue(undefined);

    const result = await deleteKubernetesNamespace('testteam', 'testproject', 'production');

    expect(result).toMatchObject({
      success: true,
      message: 'Namespace deleted successfully',
      namespaceName: 'testteam-testproject-production'
    });

    expect(mockGenerateNamespaceName).toHaveBeenCalledWith('testteam', 'testproject', 'production');
    expect(mockDeleteNamespace).toHaveBeenCalledWith('testteam-testproject-production');
  });

  it('should handle namespace not found gracefully', async () => {
    // Mock namespace not found error
    mockGenerateNamespaceName.mockReturnValue('testteam-testproject-gh-pr-42');
    mockDeleteNamespace.mockRejectedValue(new Error('not found'));

    const result = await deleteKubernetesNamespace('testteam', 'testproject', 'gh-pr-42');

    expect(result).toMatchObject({
      success: true,
      message: 'Namespace not found (already deleted)',
      namespaceName: 'testteam-testproject-gh-pr-42'
    });

    expect(mockDeleteNamespace).toHaveBeenCalledWith('testteam-testproject-gh-pr-42');
  });

  it('should validate required fields', async () => {
    const result = await deleteKubernetesNamespace('', 'testproject', 'production');

    expect(result).toMatchObject({
      success: false,
      error: 'Missing required fields: team, project, environment'
    });

    expect(mockDeleteNamespace).not.toHaveBeenCalled();
  });

  it('should validate environment values', async () => {
    const result = await deleteKubernetesNamespace('testteam', 'testproject', 'invalid-env');

    expect(result).toMatchObject({
      success: false,
      error: 'Environment must be one of: production, staging or follow pattern gh-pr-NUMBER'
    });

    expect(mockDeleteNamespace).not.toHaveBeenCalled();
  });

  it('should handle Kubernetes connection errors', async () => {
    // Mock connection error
    mockGenerateNamespaceName.mockReturnValue('testteam-testproject-production');
    mockDeleteNamespace.mockRejectedValue(new Error('connection refused'));

    const result = await deleteKubernetesNamespace('testteam', 'testproject', 'production');

    expect(result).toMatchObject({
      success: false,
      error: 'Cannot connect to Kubernetes cluster'
    });
  });

  it('should handle unauthorized errors', async () => {
    // Mock unauthorized error
    mockGenerateNamespaceName.mockReturnValue('testteam-testproject-production');
    mockDeleteNamespace.mockRejectedValue(new Error('Unauthorized'));

    const result = await deleteKubernetesNamespace('testteam', 'testproject', 'production');

    expect(result).toMatchObject({
      success: false,
      error: 'Unauthorized to access Kubernetes cluster'
    });
  });

  it('should accept all supported environments', async () => {
    const environments = ['production', 'staging', 'gh-pr-42', 'gh-pr-123'];

    for (const environment of environments) {
      const expectedNamespace = `testteam-testproject-${environment}`;
      mockGenerateNamespaceName.mockReturnValue(expectedNamespace);
      mockDeleteNamespace.mockResolvedValue(undefined);

      const result = await deleteKubernetesNamespace('testteam', 'testproject', environment);

      expect(result.success).toBe(true);
      expect(result.namespaceName).toBe(expectedNamespace);
    }
  });
});
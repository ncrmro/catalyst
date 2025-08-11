import { fetchGitHubRepos } from '../../src/actions/repos.github';

// Mock the auth function to avoid Next Auth import issues
jest.mock('../../src/auth', () => ({
  auth: jest.fn()
}));

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn()
}));

import { auth } from '../../src/auth';
import { Octokit } from '@octokit/rest';
const mockAuth = auth as jest.MockedFunction<typeof auth>;
const MockOctokit = Octokit as jest.MockedClass<typeof Octokit>;

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  mockAuth.mockReset();
  MockOctokit.mockClear();
});

afterAll(() => {
  process.env = originalEnv;
});

describe('fetchGitHubRepos', () => {
  test('should return mocked data when MOCKED is 1', async () => {
    process.env.MOCKED = '1';
    
    const result = await fetchGitHubRepos();
    
    expect(result).toHaveProperty('user_repos');
    expect(result).toHaveProperty('organizations');
    expect(result).toHaveProperty('org_repos');
    
    expect(result.user_repos).toHaveLength(2);
    expect(result.organizations).toHaveLength(2);
    
    // Check specific mock data
    expect(result.user_repos[0].name).toBe('my-awesome-project');
    expect(result.user_repos[0].owner.login).toBe('testuser');
    expect(result.user_repos[1].name).toBe('personal-website');
    
    expect(result.organizations[0].login).toBe('awesome-org');
    expect(result.organizations[1].login).toBe('open-source-collective');
    
    expect(result.org_repos['awesome-org']).toHaveLength(2);
    expect(result.org_repos['open-source-collective']).toHaveLength(1);
  });

  test('should return mocked data when GITHUB_REPOS_MODE is mocked', async () => {
    process.env.NODE_ENV = 'development';
    process.env.GITHUB_REPOS_MODE = 'mocked';
    
    const result = await fetchGitHubRepos();
    
    expect(result).toHaveProperty('user_repos');
    expect(result.user_repos).toHaveLength(2);
  });

  test('should return mocked data when no session/access token is available for real API', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MOCKED;
    delete process.env.GITHUB_REPOS_MODE;
    
    // Mock auth to return no session
    mockAuth.mockResolvedValue(null);
    
    const result = await fetchGitHubRepos();
    
    // Should gracefully fall back to mocked data instead of throwing
    expect(result).toHaveProperty('user_repos');
    expect(result).toHaveProperty('organizations');
    expect(result).toHaveProperty('org_repos');
    expect(result.user_repos).toHaveLength(2);
  });

  test('should return mocked data when session has no access token for real API', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MOCKED;
    delete process.env.GITHUB_REPOS_MODE;
    
    // Mock auth to return session without access token
    mockAuth.mockResolvedValue({
      user: { name: 'Test User' },
      expires: '2024-12-31T23:59:59.999Z',
    });
    
    const result = await fetchGitHubRepos();
    
    // Should gracefully fall back to mocked data instead of throwing
    expect(result).toHaveProperty('user_repos');
    expect(result).toHaveProperty('organizations');
    expect(result).toHaveProperty('org_repos');
    expect(result.user_repos).toHaveLength(2);
  });

  test('mocked data should have correct structure', async () => {
    process.env.MOCKED = '1';
    
    const result = await fetchGitHubRepos();
    
    // Validate user repository structure
    expect(result.user_repos[0]).toHaveProperty('id');
    expect(result.user_repos[0]).toHaveProperty('name');
    expect(result.user_repos[0]).toHaveProperty('full_name');
    expect(result.user_repos[0]).toHaveProperty('description');
    expect(result.user_repos[0]).toHaveProperty('private');
    expect(result.user_repos[0]).toHaveProperty('owner');
    expect(result.user_repos[0]).toHaveProperty('html_url');
    expect(result.user_repos[0]).toHaveProperty('language');
    expect(result.user_repos[0]).toHaveProperty('stargazers_count');
    expect(result.user_repos[0]).toHaveProperty('forks_count');
    
    // Validate organization structure
    expect(result.organizations[0]).toHaveProperty('login');
    expect(result.organizations[0]).toHaveProperty('id');
    expect(result.organizations[0]).toHaveProperty('avatar_url');
    expect(result.organizations[0]).toHaveProperty('description');
    
    // Validate owner structure
    expect(result.user_repos[0].owner).toHaveProperty('login');
    expect(result.user_repos[0].owner).toHaveProperty('type');
    expect(result.user_repos[0].owner).toHaveProperty('avatar_url');
  });

  test('should fetch real GitHub data when session has access token', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MOCKED;
    delete process.env.GITHUB_REPOS_MODE;
    
    // Mock auth to return session with access token
    mockAuth.mockResolvedValue({
      user: { name: 'Test User' },
      expires: '2024-12-31T23:59:59.999Z',
      accessToken: 'test_access_token',
    });

    // Mock Octokit responses
    const mockOctokitInstance = {
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: [
              {
                id: 123,
                name: 'real-repo',
                full_name: 'testuser/real-repo',
                description: 'A real repository',
                private: false,
                owner: {
                  login: 'testuser',
                  type: 'User',
                  avatar_url: 'https://github.com/testuser.png'
                },
                html_url: 'https://github.com/testuser/real-repo',
                language: 'JavaScript',
                stargazers_count: 10,
                forks_count: 2,
                open_issues_count: 1
              }
            ]
          }),
          listForOrg: jest.fn().mockResolvedValue({
            data: []
          })
        },
        orgs: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: []
          })
        }
      }
    };
    
    MockOctokit.mockImplementation(() => mockOctokitInstance as any);
    
    const result = await fetchGitHubRepos();
    
    expect(MockOctokit).toHaveBeenCalledWith({
      auth: 'test_access_token',
    });
    expect(result).toHaveProperty('user_repos');
    expect(result).toHaveProperty('organizations');
    expect(result).toHaveProperty('org_repos');
    expect(result.user_repos).toHaveLength(1);
    expect(result.user_repos[0].name).toBe('real-repo');
    expect(result.organizations).toHaveLength(0);
  });

  test('should throw non-authentication errors', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MOCKED;
    delete process.env.GITHUB_REPOS_MODE;
    
    // Mock auth to return session with access token
    mockAuth.mockResolvedValue({
      user: { name: 'Test User' },
      expires: '2024-12-31T23:59:59.999Z',
      accessToken: 'test_access_token',
    });

    // Mock Octokit to throw a non-authentication error
    const mockOctokitInstance = {
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        },
        orgs: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: []
          })
        }
      }
    };
    
    MockOctokit.mockImplementation(() => mockOctokitInstance as any);
    
    await expect(fetchGitHubRepos()).rejects.toThrow('Failed to fetch repositories: API rate limit exceeded');
  });
});
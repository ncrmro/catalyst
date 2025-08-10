import { fetchGitHubRepos } from '../../src/actions/repos.github';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
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

  test('should throw error when neither MOCKED nor GITHUB_REPOS_MODE is set to enable mocking', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MOCKED;
    delete process.env.GITHUB_REPOS_MODE;
    
    await expect(fetchGitHubRepos()).rejects.toThrow(
      'GitHub repos fetching is not implemented for non-mocked environments yet'
    );
  });

  test('should throw error when environment is production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MOCKED;
    delete process.env.GITHUB_REPOS_MODE;
    
    await expect(fetchGitHubRepos()).rejects.toThrow(
      'GitHub repos fetching is not implemented for non-mocked environments yet'
    );
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
});
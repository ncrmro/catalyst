// Test periodic report in mock mode to verify E2E compatibility
import { generateLatestPeriodicReport } from '../src/actions/periodic-reports';

// Mock the auth function
jest.mock('../src/auth', () => ({
  _auth: jest.fn().mockResolvedValue({
    accessToken: null
  })
}));

// Mock the projects and clusters actions
jest.mock('../src/actions/projects', () => ({
  fetchProjects: jest.fn().mockResolvedValue({
    projects: [],
    total_count: 0
  })
}));

jest.mock('../src/actions/clusters', () => ({
  getClusters: jest.fn().mockResolvedValue([])
}));

describe('Periodic Report Mock Mode for E2E Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return mock data when GITHUB_REPOS_MODE is mocked', async () => {
    // Set up test environment like E2E tests
    process.env.GITHUB_REPOS_MODE = 'mocked';
    process.env.ANTHROPIC_API_KEY = 'test-key-for-e2e';
    process.env.OPENAI_API_KEY = 'test-key-for-e2e';

    const result = await generateLatestPeriodicReport();

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data.title).toContain('Mock');
    expect(result.data.summary).toContain('mock');
  });

  it('should return mock data when test API keys are detected', async () => {
    // Set up test environment with test keys
    process.env.ANTHROPIC_API_KEY = 'test-key-for-e2e';
    process.env.OPENAI_API_KEY = 'test-key-for-e2e';

    const result = await generateLatestPeriodicReport();

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.data.title).toContain('Mock');
  });

  it('should return mock data when NODE_ENV is test', async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';

    const result = await generateLatestPeriodicReport();

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.data.title).toContain('Mock');
  });
});
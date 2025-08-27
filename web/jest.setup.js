// jest.setup.js
import { jest } from '@jest/globals';

// Mock next-auth completely to avoid ES module issues
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the auth function specifically
jest.mock('@/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  __esModule: true,
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      pulls: {
        list: jest.fn(),
        listReviews: jest.fn(),
      },
      issues: {
        listForRepo: jest.fn(),
      },
    },
  })),
}));

// Mock database
jest.mock('@/db', () => ({
  __esModule: true,
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
  projects: {},
  repos: {},
  projectsRepos: {},
  projectEnvironments: {
    id: { name: 'id', type: 'text' },
    projectId: { name: 'project_id', type: 'text' },
    repoId: { name: 'repo_id', type: 'text' },
    environment: { name: 'environment', type: 'text' },
    latestDeployment: { name: 'latest_deployment', type: 'text' },
    createdAt: { name: 'created_at', type: 'timestamp' },
    updatedAt: { name: 'updated_at', type: 'timestamp' },
  },
}));

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MOCKED = '1';
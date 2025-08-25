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
}));

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MOCKED = '1';
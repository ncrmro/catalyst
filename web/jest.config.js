const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/unit/**/*.test.js', 
    '**/__tests__/unit/**/*.test.ts', 
    '**/__tests__/unit/**/*.test.tsx',
    '**/__tests__/integration/**/*.test.js', 
    '**/__tests__/integration/**/*.test.ts', 
    '**/__tests__/integration/**/*.test.tsx',
    '**/__tests__/components/**/*.test.js', 
    '**/__tests__/components/**/*.test.ts', 
    '**/__tests__/components/**/*.test.tsx',
    '**/__tests__/e2e/**/*.test.js', 
    '**/__tests__/e2e/**/*.test.ts', 
    '**/__tests__/e2e/**/*.test.tsx'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.config.{js,ts}',
    '!src/db/migrations/**',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 20,
      statements: 20
    },
    // Allow lower thresholds for specific patterns
    'src/components/**': {
      branches: 10,
      functions: 15,
      lines: 15,
      statements: 15
    },
    'src/app/**': {
      branches: 10,
      functions: 15,
      lines: 15,
      statements: 15
    }
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/drizzle/',
    '/.next/',
    '/public/',
    '/scripts/',
    '/docs/',
    '/__tests__/',
    '\\.config\\.(js|ts)$',
    '\\.setup\\.(js|ts)$'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth/core|@kubernetes/client-node)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
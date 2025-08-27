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
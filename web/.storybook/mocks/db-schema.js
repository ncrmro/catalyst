/**
 * Mock @/db/schema for Storybook
 * Exports mock table definitions that work with type inference
 */

// Mock table structure that allows InferSelectModel to work
const createMockTable = (columns) => ({
  _: { columns }
});

// Export mock tables - these will be used for type inference only
export const users = createMockTable({});
export const accounts = createMockTable({});
export const sessions = createMockTable({});
export const teams = createMockTable({});
export const repos = createMockTable({});
export const projects = createMockTable({});
export const projectsRepos = createMockTable({});
export const projectEnvironments = createMockTable({});
export const pullRequests = createMockTable({});
export const pullRequestPods = createMockTable({});

// Mock relations
export const usersRelations = {};
export const accountsRelations = {};
export const sessionsRelations = {};
export const teamsRelations = {};
export const reposRelations = {};
export const projectsRelations = {};
export const projectsReposRelations = {};
export const projectEnvironmentsRelations = {};
export const pullRequestsRelations = {};
export const pullRequestPodsRelations = {};

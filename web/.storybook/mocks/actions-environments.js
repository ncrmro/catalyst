/**
 * Mock @/actions/environments for Storybook browser environment
 */

export async function createProjectEnvironment() {
  return {
    success: true,
    message: "Mock environment created",
    environmentId: "mock-env-id",
    environmentType: "development",
    projectId: "mock-project-id",
  };
}

export async function configureProjectEnvironments() {
  return {
    success: true,
    message: "Mock environment configured",
    environmentId: "mock-env-id",
    environmentType: "development",
    projectId: "mock-project-id",
  };
}

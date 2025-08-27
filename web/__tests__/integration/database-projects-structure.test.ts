import { db, repos, projects, projectsRepos } from '@/db';
import { fetchProjects } from '@/actions/projects';

describe('Database Projects Integration - Project Structure Validation', () => {
  let testResult: any;

  beforeAll(async () => {
    // Fetch data once for all tests in this suite
    testResult = await fetchProjects();
    
    // Skip all tests if no projects are available
    if (testResult.projects.length === 0) {
      console.log('Skipping project structure tests - no projects in database');
    }
  });

  test('should validate project structure when projects exist', async () => {
    // Skip if no projects
    if (testResult.projects.length === 0) {
      console.log('Skipping: No projects available for structure validation');
      return;
    }

    const project = testResult.projects[0];
    
    // Validate project structure
    expect(project).toHaveProperty('id');
    expect(project).toHaveProperty('name');
    expect(project).toHaveProperty('full_name');
    expect(project).toHaveProperty('owner');
    expect(project).toHaveProperty('repositories');
    expect(project).toHaveProperty('environments');
    
    // Validate owner structure
    expect(project.owner).toHaveProperty('login');
    expect(project.owner).toHaveProperty('type');
    expect(['User', 'Organization']).toContain(project.owner.type);
    
    // Validate repositories and environments are arrays
    expect(Array.isArray(project.repositories)).toBe(true);
    expect(Array.isArray(project.environments)).toBe(true);
  });

  test('should validate repository structure when repositories exist', async () => {
    // Skip if no projects
    if (testResult.projects.length === 0) {
      console.log('Skipping: No projects available');
      return;
    }

    // Find a project with repositories
    const projectWithRepos = testResult.projects.find((p: any) => p.repositories.length > 0);
    
    if (!projectWithRepos) {
      console.log('Skipping: No projects with repositories found');
      return;
    }

    const repo = projectWithRepos.repositories[0];
    expect(repo).toHaveProperty('id');
    expect(repo).toHaveProperty('name');
    expect(repo).toHaveProperty('full_name');
    expect(repo).toHaveProperty('url');
    expect(repo).toHaveProperty('primary');
    expect(typeof repo.primary).toBe('boolean');
  });

  test('should validate environment structure when environments exist', async () => {
    // Skip if no projects
    if (testResult.projects.length === 0) {
      console.log('Skipping: No projects available');
      return;
    }

    // Find a project with environments
    const projectWithEnvs = testResult.projects.find((p: any) => p.environments.length > 0);
    
    if (!projectWithEnvs) {
      console.log('Skipping: No projects with environments found');
      return;
    }

    const env = projectWithEnvs.environments[0];
    expect(env).toHaveProperty('id');
    expect(env).toHaveProperty('name');
    expect(env).toHaveProperty('type');
    expect(env).toHaveProperty('status');
    expect(['branch_push', 'cron']).toContain(env.type);
    expect(['active', 'inactive', 'deploying']).toContain(env.status);
  });
});
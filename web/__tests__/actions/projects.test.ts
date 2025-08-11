import { fetchProjects } from '../../src/actions/projects';

describe('fetchProjects', () => {
  test('should return mocked projects data', async () => {
    const result = await fetchProjects();
    
    expect(result).toHaveProperty('projects');
    expect(result).toHaveProperty('total_count');
    
    expect(result.projects).toHaveLength(3);
    expect(result.total_count).toBe(3);
    
    // Check specific mock data as per requirements
    expect(result.projects[0].full_name).toBe('jdoe/foo');
    expect(result.projects[1].full_name).toBe('jdoe/bar');
    
    // Verify owner information
    expect(result.projects[0].owner.login).toBe('jdoe');
    expect(result.projects[1].owner.login).toBe('jdoe');
  });

  test('should have correct project structure', async () => {
    const result = await fetchProjects();
    const project = result.projects[0];
    
    // Validate project structure
    expect(project).toHaveProperty('id');
    expect(project).toHaveProperty('name');
    expect(project).toHaveProperty('full_name');
    expect(project).toHaveProperty('description');
    expect(project).toHaveProperty('owner');
    expect(project).toHaveProperty('repositories');
    expect(project).toHaveProperty('environments');
    expect(project).toHaveProperty('preview_environments_count');
    expect(project).toHaveProperty('created_at');
    expect(project).toHaveProperty('updated_at');
    
    // Validate owner structure
    expect(project.owner).toHaveProperty('login');
    expect(project.owner).toHaveProperty('type');
    expect(project.owner).toHaveProperty('avatar_url');
  });

  test('should have repositories with correct structure', async () => {
    const result = await fetchProjects();
    const project = result.projects[0]; // jdoe/foo
    
    expect(project.repositories).toHaveLength(3);
    
    const repo = project.repositories[0];
    expect(repo).toHaveProperty('id');
    expect(repo).toHaveProperty('name');
    expect(repo).toHaveProperty('full_name');
    expect(repo).toHaveProperty('url');
    expect(repo).toHaveProperty('primary');
    
    // Should have at least one primary repository
    const hasPrimaryRepo = project.repositories.some(r => r.primary);
    expect(hasPrimaryRepo).toBe(true);
  });

  test('should have environments with correct structure and types', async () => {
    const result = await fetchProjects();
    
    // Check jdoe/foo project environments
    const fooProject = result.projects[0];
    expect(fooProject.environments).toHaveLength(3);
    
    const environment = fooProject.environments[0];
    expect(environment).toHaveProperty('id');
    expect(environment).toHaveProperty('name');
    expect(environment).toHaveProperty('type');
    expect(environment).toHaveProperty('status');
    
    // Check environment types as specified in requirements
    const branchPushEnvs = fooProject.environments.filter(env => env.type === 'branch_push');
    const cronEnvs = fooProject.environments.filter(env => env.type === 'cron');
    
    expect(branchPushEnvs.length).toBeGreaterThan(0);
    expect(cronEnvs.length).toBeGreaterThan(0);
    
    // Check branch push environment has branch info
    const branchEnv = branchPushEnvs[0];
    expect(branchEnv).toHaveProperty('branch');
    expect(branchEnv.branch).toBeTruthy();
    
    // Check cron environment has schedule info
    const cronEnv = cronEnvs[0];
    expect(cronEnv).toHaveProperty('cron_schedule');
    expect(cronEnv.cron_schedule).toBeTruthy();
  });

  test('should show different environment types across projects', async () => {
    const result = await fetchProjects();
    
    // jdoe/foo should have both branch push and cron environments
    const fooProject = result.projects[0];
    const fooBranchPush = fooProject.environments.filter(env => env.type === 'branch_push');
    const fooCron = fooProject.environments.filter(env => env.type === 'cron');
    expect(fooBranchPush.length).toBeGreaterThan(0);
    expect(fooCron.length).toBeGreaterThan(0);
    
    // jdoe/bar should have different configuration
    const barProject = result.projects[1];
    expect(barProject.environments.length).toBeGreaterThan(0);
    
    // Check that environments have valid statuses
    const validStatuses = ['active', 'inactive', 'deploying'];
    barProject.environments.forEach(env => {
      expect(validStatuses).toContain(env.status);
    });
  });

  test('should have preview environment counts', async () => {
    const result = await fetchProjects();
    
    result.projects.forEach(project => {
      expect(project.preview_environments_count).toBeGreaterThanOrEqual(0);
      expect(typeof project.preview_environments_count).toBe('number');
    });
    
    // Check specific counts as per mock data
    expect(result.projects[0].preview_environments_count).toBe(7); // jdoe/foo
    expect(result.projects[1].preview_environments_count).toBe(3); // jdoe/bar
  });

  test('should have valid timestamps', async () => {
    const result = await fetchProjects();
    
    result.projects.forEach(project => {
      expect(project.created_at).toBeTruthy();
      expect(project.updated_at).toBeTruthy();
      
      // Should be valid ISO date strings
      expect(() => new Date(project.created_at)).not.toThrow();
      expect(() => new Date(project.updated_at)).not.toThrow();
      
      // Created date should be before or equal to updated date
      const created = new Date(project.created_at);
      const updated = new Date(project.updated_at);
      expect(created.getTime()).toBeLessThanOrEqual(updated.getTime());
    });
  });

  test('should have environments with recent deployment timestamps', async () => {
    const result = await fetchProjects();
    
    result.projects.forEach(project => {
      project.environments.forEach(env => {
        if (env.last_deployed) {
          expect(() => new Date(env.last_deployed)).not.toThrow();
          
          // Should be a valid recent date (not in the future)
          const deployDate = new Date(env.last_deployed);
          const now = new Date();
          expect(deployDate.getTime()).toBeLessThanOrEqual(now.getTime());
        }
      });
    });
  });
});
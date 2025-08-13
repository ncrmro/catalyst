import {
  findWorkloadConfig,
  shouldTriggerDeployment,
  generatePRReleaseName,
  generatePRNamespace,
  createPRWorkloadConfig,
  DEFAULT_WORKLOAD_CONFIGS
} from '../../src/lib/workload-config';

describe('Workload Configuration', () => {
  describe('findWorkloadConfig', () => {
    it('should find exact repository and branch match', () => {
      // Add a specific config for testing
      const testConfigs = [
        ...DEFAULT_WORKLOAD_CONFIGS,
        {
          repository: 'test/repo',
          branch: 'feature',
          chartPath: 'charts/test',
          releaseName: 'test-release',
          environment: 'development' as const
        }
      ];

      // Mock the default configs temporarily
      const originalConfigs = [...DEFAULT_WORKLOAD_CONFIGS];
      DEFAULT_WORKLOAD_CONFIGS.splice(0, DEFAULT_WORKLOAD_CONFIGS.length, ...testConfigs);

      const config = findWorkloadConfig('test/repo', 'feature');
      
      expect(config).toBeTruthy();
      expect(config?.repository).toBe('test/repo');
      expect(config?.branch).toBe('feature');
      expect(config?.releaseName).toBe('test-release');

      // Restore original configs
      DEFAULT_WORKLOAD_CONFIGS.splice(0, DEFAULT_WORKLOAD_CONFIGS.length, ...originalConfigs);
    });

    it('should find wildcard repository match', () => {
      const config = findWorkloadConfig('any/repo', 'main');
      
      expect(config).toBeTruthy();
      expect(config?.repository).toBe('*');
      expect(config?.branch).toBe('main');
      expect(config?.releaseName).toBe('main-release');
    });

    it('should return null for no match', () => {
      const config = findWorkloadConfig('unknown/repo', 'unknown-branch');
      
      expect(config).toBeNull();
    });
  });

  describe('shouldTriggerDeployment', () => {
    it('should trigger deployment for main branch', () => {
      expect(shouldTriggerDeployment('main')).toBe(true);
    });

    it('should trigger deployment for master branch', () => {
      expect(shouldTriggerDeployment('master')).toBe(true);
    });

    it('should trigger deployment for develop branch', () => {
      expect(shouldTriggerDeployment('develop')).toBe(true);
    });

    it('should trigger deployment for staging branch', () => {
      expect(shouldTriggerDeployment('staging')).toBe(true);
    });

    it('should trigger deployment for release branches', () => {
      expect(shouldTriggerDeployment('release/v1.0.0')).toBe(true);
      expect(shouldTriggerDeployment('release/2023-11')).toBe(true);
    });

    it('should not trigger deployment for feature branches', () => {
      expect(shouldTriggerDeployment('feature/new-ui')).toBe(false);
      expect(shouldTriggerDeployment('bugfix/issue-123')).toBe(false);
    });
  });

  describe('generatePRReleaseName', () => {
    it('should generate correct PR release name', () => {
      const releaseName = generatePRReleaseName('user/my-app', 42);
      expect(releaseName).toBe('pr-my-app-42');
    });

    it('should handle repository names with special characters', () => {
      const releaseName = generatePRReleaseName('org/my-app-v2', 123);
      expect(releaseName).toBe('pr-my-app-v2-123');
    });

    it('should handle repositories without slash', () => {
      const releaseName = generatePRReleaseName('standalone-repo', 1);
      expect(releaseName).toBe('pr-standalone-repo-1');
    });
  });

  describe('generatePRNamespace', () => {
    it('should generate correct PR namespace', () => {
      const namespace = generatePRNamespace(42);
      expect(namespace).toBe('pr-42');
    });
  });

  describe('createPRWorkloadConfig', () => {
    it('should create PR workload config with defaults', () => {
      const config = createPRWorkloadConfig('user/test-app', 42);
      
      expect(config.repository).toBe('user/test-app');
      expect(config.branch).toBe('pr-42');
      expect(config.releaseName).toBe('pr-test-app-42');
      expect(config.namespace).toBe('pr-42');
      expect(config.environment).toBe('development');
      expect(config.enableTests).toBe(true);
      expect(config.testCommand).toBe('npm run test:pr');
      
      expect(config.values?.image?.tag).toBe('pr-42');
      expect(config.values?.ingress?.hosts?.[0]?.host).toBe('pr-42.preview.example.com');
    });

    it('should inherit from base config', () => {
      const baseConfig = findWorkloadConfig('any/repo', 'main');
      const config = createPRWorkloadConfig('user/test-app', 42, baseConfig);
      
      expect(config.chartPath).toBe(baseConfig?.chartPath);
      expect(config.values?.ingress?.enabled).toBe(true);
    });

    it('should set resource limits for PR environments', () => {
      const config = createPRWorkloadConfig('user/test-app', 42);
      
      expect(config.values?.resources?.limits?.cpu).toBe('200m');
      expect(config.values?.resources?.limits?.memory).toBe('256Mi');
      expect(config.values?.resources?.requests?.cpu).toBe('100m');
      expect(config.values?.resources?.requests?.memory).toBe('128Mi');
    });
  });
});
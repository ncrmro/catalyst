import { createKubernetesService, KubernetesService } from '../../src/lib/kubernetes-service';
import { WorkloadConfig } from '../../src/lib/workload-config';

describe('Kubernetes Service', () => {
  let kubernetesService: KubernetesService;

  beforeEach(() => {
    kubernetesService = createKubernetesService(true); // Enable mock mode
  });

  const mockWorkloadConfig: WorkloadConfig = {
    repository: 'test/repo',
    branch: 'main',
    chartPath: 'charts/nextjs',
    namespace: 'test',
    releaseName: 'test-release',
    environment: 'development',
    enableTests: true,
    testCommand: 'npm test',
    values: {
      image: { tag: 'latest' },
      ingress: {
        enabled: true,
        hosts: [{ host: 'test.example.com', paths: [{ path: '/', pathType: 'ImplementationSpecific' }] }]
      }
    }
  };

  describe('deployWorkload', () => {
    it('should successfully deploy a workload', async () => {
      const result = await kubernetesService.deployWorkload(mockWorkloadConfig);
      
      expect(result.success).toBe(true);
      expect(result.releaseName).toBe('test-release');
      expect(result.namespace).toBe('test');
      expect(result.url).toBe('https://test.example.com');
      expect(result.error).toBeUndefined();
    });

    it('should generate fallback URL when no ingress host is configured', async () => {
      const configWithoutHost = {
        ...mockWorkloadConfig,
        values: {}
      };
      
      const result = await kubernetesService.deployWorkload(configWithoutHost);
      
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://test-release.test.cluster.local');
    });
  });

  describe('deleteWorkload', () => {
    it('should successfully delete a workload', async () => {
      const result = await kubernetesService.deleteWorkload('test-release', 'test');
      
      expect(result).toBe(true);
    });
  });

  describe('getWorkloadStatus', () => {
    it('should return unknown status for non-existent workload', async () => {
      const status = await kubernetesService.getWorkloadStatus('non-existent', 'test');
      
      expect(status.status).toBe('unknown');
      expect(status.replicas.ready).toBe(0);
      expect(status.replicas.total).toBe(0);
    });

    it('should return running status for deployed workload', async () => {
      // First deploy a workload
      await kubernetesService.deployWorkload(mockWorkloadConfig);
      
      // Then check its status
      const status = await kubernetesService.getWorkloadStatus('test-release', 'test');
      
      expect(status.status).toBe('running');
      expect(status.replicas.ready).toBe(1);
      expect(status.replicas.total).toBe(1);
      expect(status.url).toBe('https://test.example.com');
      expect(status.lastDeployed).toBeInstanceOf(Date);
    });
  });

  describe('runTests', () => {
    it('should run tests successfully when tests are enabled', async () => {
      const result = await kubernetesService.runTests(mockWorkloadConfig);
      
      expect(result.success).toBe(true);
      expect(result.testsPassed).toBe(5);
      expect(result.testsFailed).toBe(0);
      expect(result.output).toBe('All tests passed successfully');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should skip tests when not enabled', async () => {
      const configWithoutTests = {
        ...mockWorkloadConfig,
        enableTests: false
      };
      
      const result = await kubernetesService.runTests(configWithoutTests);
      
      expect(result.success).toBe(true);
      expect(result.testsPassed).toBe(0);
      expect(result.testsFailed).toBe(0);
      expect(result.output).toBe('No tests configured');
      expect(result.duration).toBe(0);
    });

    it('should skip tests when no test command is provided', async () => {
      const configWithoutTestCommand = {
        ...mockWorkloadConfig,
        testCommand: undefined
      };
      
      const result = await kubernetesService.runTests(configWithoutTestCommand);
      
      expect(result.success).toBe(true);
      expect(result.testsPassed).toBe(0);
      expect(result.testsFailed).toBe(0);
      expect(result.output).toBe('No tests configured');
      expect(result.duration).toBe(0);
    });
  });

  describe('non-mock mode', () => {
    beforeEach(() => {
      kubernetesService = createKubernetesService(false); // Disable mock mode
    });

    it('should simulate deployment in non-mock mode', async () => {
      const result = await kubernetesService.deployWorkload(mockWorkloadConfig);
      
      expect(result.success).toBe(true);
      expect(result.releaseName).toBe('test-release');
      expect(result.namespace).toBe('test');
      expect(result.url).toBe('https://test.example.com');
    });

    it('should run tests in non-mock mode', async () => {
      const result = await kubernetesService.runTests(mockWorkloadConfig);
      
      expect(result.success).toBe(true);
      expect(result.testsPassed).toBe(3);
      expect(result.testsFailed).toBe(0);
      expect(result.output).toContain('test-release');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
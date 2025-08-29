// Mock implementation for @kubernetes/client-node package

export class KubeConfig {
  loadFromDefault() {
    // Check for error conditions that tests might set up
    if (process.env.KUBECONFIG === '/invalid/path/to/kubeconfig') {
      throw new Error('Invalid kubeconfig path');
    }
    // Mock successful load
    return Promise.resolve();
  }

  getCurrentContext() {
    return 'test-context';
  }

  getCurrentCluster() {
    return {
      name: 'test-cluster',
      server: 'https://test-cluster.example.com',
      skipTLSVerify: true
    };
  }

  getContexts() {
    return [
      {
        name: 'test-context',
        cluster: 'test-cluster',
        user: 'test-user'
      }
    ];
  }

  makeApiClient(ApiClass) {
    return new ApiClass();
  }
}

export class AppsV1Api {
  constructor() {
    // Mock constructor
  }

  createNamespacedDeployment({ namespace, body }) {
    // Check for error conditions
    if (process.env.KUBECONFIG === '/invalid/path/to/kubeconfig') {
      throw new Error('Kubernetes API not available');
    }
    
    // Ensure unique names by using high-resolution time + random number
    const hrtime = process.hrtime();
    const uniqueSuffix = `${hrtime[0]}${hrtime[1]}${Math.floor(Math.random() * 1000)}`;
    const uniqueName = `${body.metadata.name}-${uniqueSuffix}`;
    
    return Promise.resolve({
      metadata: {
        name: uniqueName,
        namespace: namespace
      },
      spec: {
        replicas: body.spec.replicas
      }
    });
  }

  deleteNamespacedDeployment({ name, namespace }) {
    // Check for error conditions
    if (process.env.KUBECONFIG === '/invalid/path/to/kubeconfig') {
      throw new Error('Kubernetes API not available');
    }
    
    return Promise.resolve({
      body: {
        status: 'Success'
      }
    });
  }
}

export class CoreV1Api {
  constructor() {
    // Mock constructor
  }

  createNamespace({ body }) {
    // Check for error conditions
    if (process.env.KUBECONFIG === '/invalid/path/to/kubeconfig') {
      throw new Error('Kubernetes API not available');
    }
    
    return Promise.resolve({
      body: {
        metadata: {
          name: body.metadata.name
        }
      }
    });
  }

  deleteNamespace({ name }) {
    // Check for error conditions
    if (process.env.KUBECONFIG === '/invalid/path/to/kubeconfig') {
      throw new Error('Kubernetes API not available');
    }
    
    return Promise.resolve({
      body: {
        status: 'Success'
      }
    });
  }
}
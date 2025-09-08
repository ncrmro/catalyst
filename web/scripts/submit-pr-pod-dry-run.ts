#!/usr/bin/env tsx

/**
 * Dry-run version of submit-pr-pod.ts for testing RBAC and PVC creation
 * This skips the secret creation and job submission steps
 */

// Load environment variables
import 'dotenv/config';
import { 
  getClusterConfig, 
  getCoreV1Api
} from '../src/lib/k8s-client';
import { 
  getRbacAuthorizationV1Api
} from '../src/lib/k8s-pull-request-pod';

interface PRPodOptions {
  prName?: string;
  namespace?: string;
  githubUser?: string;
  repoUrl?: string;
  branch?: string;
  clusterName?: string;
}

/**
 * Create the necessary RBAC resources for the PR pod
 */
async function createRBACResources(namespace: string = 'default', clusterName?: string): Promise<void> {
  console.log('🔐 Creating RBAC resources...');
  
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const CoreV1Api = await getCoreV1Api();
  const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();
  
  const coreApi = kc.makeApiClient(CoreV1Api);
  const rbacApi = kc.makeApiClient(RbacAuthorizationV1Api);

  // Create ServiceAccount
  const serviceAccount = {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: 'pull-request-job-pod',
      namespace: namespace
    }
  };

  try {
    await coreApi.createNamespacedServiceAccount({ namespace, body: serviceAccount });
    console.log('  ✓ ServiceAccount created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('  ✓ ServiceAccount already exists');
    } else {
      throw error;
    }
  }

  // Create Role
  const role = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      namespace: namespace,
      name: 'pull-request-job-role'
    },
    rules: [
      {
        apiGroups: ['apps'],
        resources: ['deployments'],
        verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete']
      },
      {
        apiGroups: ['apps'],
        resources: ['deployments/scale'],
        verbs: ['patch', 'update']
      },
      {
        apiGroups: ['apps'],
        resources: ['replicasets'],
        verbs: ['get', 'list', 'watch']
      },
      {
        apiGroups: [''],
        resources: ['pods', 'services'],
        verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete']
      },
      {
        apiGroups: [''],
        resources: ['pods/exec'],
        verbs: ['create']
      },
      {
        apiGroups: [''],
        resources: ['configmaps', 'secrets'],
        verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete']
      }
    ]
  };

  try {
    await rbacApi.createNamespacedRole({ namespace, body: role });
    console.log('  ✓ Role created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('  ✓ Role already exists');
    } else {
      throw error;
    }
  }

  // Create RoleBinding
  const roleBinding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: 'pull-request-job-binding',
      namespace: namespace
    },
    subjects: [{
      kind: 'ServiceAccount',
      name: 'pull-request-job-pod',
      namespace: namespace
    }],
    roleRef: {
      kind: 'Role',
      name: 'pull-request-job-role',
      apiGroup: 'rbac.authorization.k8s.io'
    }
  };

  try {
    await rbacApi.createNamespacedRoleBinding({ namespace, body: roleBinding });
    console.log('  ✓ RoleBinding created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('  ✓ RoleBinding already exists');
    } else {
      throw error;
    }
  }
}

/**
 * Create persistent volume claims for caching
 */
async function createPVCs(namespace: string = 'default', clusterName?: string): Promise<void> {
  console.log('💾 Creating PVCs...');
  
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const CoreV1Api = await getCoreV1Api();
  const coreApi = kc.makeApiClient(CoreV1Api);

  // Git cache PVC
  const gitCachePVC = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name: 'git-cache-pvc',
      namespace: namespace
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: '1Gi'
        }
      }
    }
  };

  try {
    await coreApi.createNamespacedPersistentVolumeClaim({ namespace, body: gitCachePVC });
    console.log('  ✓ Git cache PVC created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('  ✓ Git cache PVC already exists');
    } else {
      throw error;
    }
  }

  // Helm cache PVC
  const helmCachePVC = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name: 'helm-cache-pvc',
      namespace: namespace
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: '500Mi'
        }
      }
    }
  };

  try {
    await coreApi.createNamespacedPersistentVolumeClaim({ namespace, body: helmCachePVC });
    console.log('  ✓ Helm cache PVC created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('  ✓ Helm cache PVC already exists');
    } else {
      throw error;
    }
  }
}

/**
 * Main function for dry-run testing
 */
async function main(): Promise<void> {
  try {
    console.log('🧪 Dry-run: Testing RBAC and PVC creation for PR pod');
    console.log('📁 Based on spike: 1757044045_pr_pod_helm_deployment');
    console.log('');

    const options: PRPodOptions = {
      prName: process.env.PR_NAME || 'pr-000',
      namespace: process.env.NAMESPACE || 'default',
      githubUser: process.env.GITHUB_USER || 'ncrmro',
      repoUrl: process.env.REPO_URL || 'https://github.com/ncrmro/catalyst.git',
      branch: process.env.PR_BRANCH || 'main',
      clusterName: process.env.CLUSTER_NAME
    };

    console.log('Configuration:');
    console.log(`  PR Name: ${options.prName}`);
    console.log(`  Namespace: ${options.namespace}`);
    console.log(`  GitHub User: ${options.githubUser}`);
    console.log(`  Repository: ${options.repoUrl}`);
    console.log(`  Branch: ${options.branch}`);
    console.log('');

    // Step 1: Create RBAC resources
    await createRBACResources(options.namespace, options.clusterName);

    // Step 2: Create PVCs for caching
    await createPVCs(options.namespace, options.clusterName);

    console.log('');
    console.log('✅ Dry-run completed successfully!');
    console.log('');
    console.log('RBAC and PVC resources have been created. To complete the setup:');
    console.log('1. Set GITHUB_PAT and GITHUB_GHCR_PAT in your .env file');
    console.log('2. Run the full submit-pr-pod script');
    console.log('');
    console.log('To check created resources:');
    console.log(`  kubectl get serviceaccount,role,rolebinding,pvc -n ${options.namespace}`);

  } catch (error) {
    console.error('❌ Error in dry-run:', error);
    process.exit(1);
  }
}

// Run the script
main();
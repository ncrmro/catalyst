// Kubernetes Pull Request pod management functions
// This module creates job manifests with service accounts that have permissions
// to create pods for buildx kubernetes driver functionality

import { getCoreV1Api, getClusterConfig } from './k8s-client';

export interface PullRequestPodOptions {
  name: string;
  namespace?: string;
  image?: string;
  clusterName?: string;
}

export interface PullRequestPodResult {
  jobName: string;
  serviceAccountName: string;
  namespace: string;
  created: boolean;
}

/**
 * Get BatchV1Api for job management
 */
export async function getBatchV1Api() {
  const k8sModule = await import('@kubernetes/client-node');
  return k8sModule.BatchV1Api;
}

/**
 * Get RbacAuthorizationV1Api for RBAC management
 */
export async function getRbacAuthorizationV1Api() {
  const k8sModule = await import('@kubernetes/client-node');
  return k8sModule.RbacAuthorizationV1Api;
}

/**
 * Create a service account with permissions to create pods for buildx kubernetes driver
 */
export async function createBuildxServiceAccount(
  name: string,
  namespace: string = 'default',
  clusterName?: string
): Promise<void> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const CoreV1Api = await getCoreV1Api();
  const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();
  
  const coreApi = kc.makeApiClient(CoreV1Api);
  const rbacApi = kc.makeApiClient(RbacAuthorizationV1Api);

  const serviceAccountName = `${name}-buildx-sa`;
  const roleName = `${name}-buildx-role`;
  const roleBindingName = `${name}-buildx-rolebinding`;

  try {
    // Create service account
    const serviceAccount = {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: serviceAccountName,
        namespace: namespace,
        labels: {
          'app': 'catalyst-buildx',
          'created-by': 'catalyst-web-app',
          'pr-job': name
        }
      }
    };

    try {
      await coreApi.createNamespacedServiceAccount({ namespace, body: serviceAccount });
    } catch (error: unknown) {
      // If service account already exists, that's fine - we can reuse it
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorBody = (error as { body?: string })?.body || '';
      if (!errorBody.includes('already exists') && !errorMessage.includes('already exists')) {
        throw error;
      }
    }

    // Create role with pod creation permissions for buildx
    const role = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'Role',
      metadata: {
        name: roleName,
        namespace: namespace,
        labels: {
          'app': 'catalyst-buildx',
          'created-by': 'catalyst-web-app',
          'pr-job': name
        }
      },
      rules: [
        {
          apiGroups: [''],
          resources: ['pods'],
          verbs: ['create', 'get', 'list', 'watch', 'delete']
        },
        {
          apiGroups: [''],
          resources: ['pods/log'],
          verbs: ['get']
        },
        {
          apiGroups: [''],
          resources: ['configmaps', 'secrets'],
          verbs: ['get', 'list']
        }
      ]
    };

    try {
      await rbacApi.createNamespacedRole({ namespace, body: role });
    } catch (error: unknown) {
      // If role already exists, that's fine - we can reuse it
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorBody = (error as { body?: string })?.body || '';
      if (!errorBody.includes('already exists') && !errorMessage.includes('already exists')) {
        throw error;
      }
    }

    // Create role binding
    const roleBinding = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'RoleBinding',
      metadata: {
        name: roleBindingName,
        namespace: namespace,
        labels: {
          'app': 'catalyst-buildx',
          'created-by': 'catalyst-web-app',
          'pr-job': name
        }
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: serviceAccountName,
          namespace: namespace
        }
      ],
      roleRef: {
        kind: 'Role',
        name: roleName,
        apiGroup: 'rbac.authorization.k8s.io'
      }
    };

    try {
      await rbacApi.createNamespacedRoleBinding({ namespace, body: roleBinding });
    } catch (error: unknown) {
      // If role binding already exists, that's fine - we can reuse it
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorBody = (error as { body?: string })?.body || '';
      if (!errorBody.includes('already exists') && !errorMessage.includes('already exists')) {
        throw error;
      }
    }

  } catch (error) {
    console.error('Error creating buildx service account:', error);
    throw error;
  }
}

/**
 * Create a pull request pod job manifest that uses buildx kubernetes driver
 */
export async function createPullRequestPodJob(options: PullRequestPodOptions): Promise<PullRequestPodResult> {
  const {
    name,
    namespace = 'default',
    image = 'docker:24-dind',
    clusterName
  } = options;

  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const BatchV1Api = await getBatchV1Api();
  const batchApi = kc.makeApiClient(BatchV1Api);

  const jobName = `pr-job-${name}-${Date.now()}`;
  const serviceAccountName = `${name}-buildx-sa`;

  // First create the service account and RBAC
  await createBuildxServiceAccount(name, namespace, clusterName);

  try {
    // Create job manifest
    const job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
        namespace: namespace,
        labels: {
          'app': 'catalyst-pr-job',
          'created-by': 'catalyst-web-app',
          'pr-name': name
        }
      },
      spec: {
        template: {
          metadata: {
            labels: {
              'app': 'catalyst-pr-job',
              'created-by': 'catalyst-web-app',
              'pr-name': name
            }
          },
          spec: {
            serviceAccountName: serviceAccountName,
            restartPolicy: 'Never',
            containers: [
              {
                name: 'buildx-container',
                image: image,
                command: ['/bin/sh'],
                args: [
                  '-c',
                  `
                  # Create buildx kubernetes driver
                  docker buildx create --driver=kubernetes --name k8s-builder --user
                  
                  # Test by creating a simple build pod
                  echo "FROM alpine:latest" > Dockerfile
                  echo "RUN echo 'Hello from buildx kubernetes driver'" >> Dockerfile
                  docker buildx build --platform linux/amd64 -t test-build .
                  
                  echo "Successfully created and tested buildx kubernetes driver"
                  `
                ],
                resources: {
                  limits: {
                    cpu: '500m',
                    memory: '512Mi'
                  },
                  requests: {
                    cpu: '100m',
                    memory: '128Mi'
                  }
                }
              }
            ]
          }
        },
        backoffLimit: 3,
        ttlSecondsAfterFinished: 3600 // Clean up after 1 hour
      }
    };

    await batchApi.createNamespacedJob({ namespace, body: job });

    return {
      jobName,
      serviceAccountName,
      namespace,
      created: true
    };

  } catch (error) {
    console.error('Error creating pull request pod job:', error);
    throw error;
  }
}

/**
 * Check the status of a pull request pod job
 */
export async function getPullRequestPodJobStatus(
  jobName: string,
  namespace: string = 'default',
  clusterName?: string
): Promise<{
  jobName: string;
  status: string;
  succeeded?: number;
  failed?: number;
  active?: number;
  conditions?: Record<string, unknown>[];
}> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const BatchV1Api = await getBatchV1Api();
  const batchApi = kc.makeApiClient(BatchV1Api);

  try {
    const response = await batchApi.readNamespacedJob({ name: jobName, namespace });
    const job = response;

    return {
      jobName,
      status: job.status?.conditions?.[0]?.type || 'Unknown',
      succeeded: job.status?.succeeded || 0,
      failed: job.status?.failed || 0,
      active: job.status?.active || 0,
      conditions: job.status?.conditions || []
    };

  } catch (error) {
    console.error('Error getting job status:', error);
    throw error;
  }
}

/**
 * Clean up pull request pod job and associated resources
 */
export async function cleanupPullRequestPodJob(
  name: string,
  namespace: string = 'default',
  clusterName?: string
): Promise<void> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const CoreV1Api = await getCoreV1Api();
  const BatchV1Api = await getBatchV1Api();
  const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();

  const coreApi = kc.makeApiClient(CoreV1Api);
  const batchApi = kc.makeApiClient(BatchV1Api);
  const rbacApi = kc.makeApiClient(RbacAuthorizationV1Api);

  const serviceAccountName = `${name}-buildx-sa`;
  const roleName = `${name}-buildx-role`;
  const roleBindingName = `${name}-buildx-rolebinding`;

  try {
    // Delete jobs with the pr-name label
    const jobs = await batchApi.listNamespacedJob({
      namespace,
      labelSelector: `pr-name=${name}`
    });

    for (const job of jobs.items) {
      if (job.metadata?.name) {
        await batchApi.deleteNamespacedJob({ name: job.metadata.name, namespace });
      }
    }

    // Delete role binding
    try {
      await rbacApi.deleteNamespacedRoleBinding({ name: roleBindingName, namespace });
    } catch {
      // Ignore if not found
    }

    // Delete role
    try {
      await rbacApi.deleteNamespacedRole({ name: roleName, namespace });
    } catch {
      // Ignore if not found
    }

    // Delete service account
    try {
      await coreApi.deleteNamespacedServiceAccount({ name: serviceAccountName, namespace });
    } catch {
      // Ignore if not found
    }

  } catch (error) {
    console.error('Error cleaning up pull request pod job:', error);
    throw error;
  }
}

#!/usr/bin/env tsx

/**
 * TypeScript script to submit a special catalyst pr-000 using k8s-client
 * This script creates a PR pod job that only bakes and pushes images
 * Based on the work in spike 1757044045_pr_pod_helm_deployment
 */

// Load environment variables
import 'dotenv/config';
import { 
  getClusterConfig, 
  getCoreV1Api
} from '../src/lib/k8s-client';
import { 
  getRbacAuthorizationV1Api, 
  getBatchV1Api 
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
    if (error.statusCode === 409) {
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
    if (error.statusCode === 409) {
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
    if (error.statusCode === 409) {
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
    if (error.statusCode === 409) {
      console.log('  ✓ Git cache PVC already exists');
    } else {
      throw error;
    }
  }

  // Helm cache PVC (not needed for image building only, but included for completeness)
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
    if (error.statusCode === 409) {
      console.log('  ✓ Helm cache PVC already exists');
    } else {
      throw error;
    }
  }
}

/**
 * Create GitHub authentication secrets
 */
async function createGitHubSecrets(namespace: string = 'default', clusterName?: string): Promise<void> {
  console.log('🔑 Creating GitHub secrets...');

  const githubPat = process.env.GITHUB_PAT;
  const githubGhcrPat = process.env.GITHUB_GHCR_PAT;

  if (!githubPat) {
    throw new Error('GITHUB_PAT environment variable is required');
  }

  if (!githubGhcrPat) {
    throw new Error('GITHUB_GHCR_PAT environment variable is required');
  }

  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const CoreV1Api = await getCoreV1Api();
  const coreApi = kc.makeApiClient(CoreV1Api);

  // Delete existing secrets if they exist
  try {
    await coreApi.deleteNamespacedSecret({ namespace, name: 'github-pat-secret' });
  } catch (error: any) {
    // Ignore if secret doesn't exist
  }

  try {
    await coreApi.deleteNamespacedSecret({ namespace, name: 'ghcr-registry-secret' });
  } catch (error: any) {
    // Ignore if secret doesn't exist
  }

  // Create GitHub PAT secret
  const githubPatSecret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'github-pat-secret',
      namespace: namespace
    },
    type: 'Opaque',
    stringData: {
      token: githubPat,
      ghcr_token: githubGhcrPat
    }
  };

  await coreApi.createNamespacedSecret({ namespace, body: githubPatSecret });
  console.log('  ✓ GitHub PAT secret created');

  // Create Docker registry secret for GHCR
  const dockerConfig = {
    auths: {
      'ghcr.io': {
        username: process.env.GITHUB_USER || 'ncrmro',
        password: githubGhcrPat,
        email: `${process.env.GITHUB_USER || 'ncrmro'}@users.noreply.github.com`,
        auth: Buffer.from(`${process.env.GITHUB_USER || 'ncrmro'}:${githubGhcrPat}`).toString('base64')
      }
    }
  };

  const ghcrRegistrySecret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'ghcr-registry-secret',
      namespace: namespace
    },
    type: 'kubernetes.io/dockerconfigjson',
    stringData: {
      '.dockerconfigjson': JSON.stringify(dockerConfig)
    }
  };

  await coreApi.createNamespacedSecret({ namespace, body: ghcrRegistrySecret });
  console.log('  ✓ GHCR registry secret created');
}

/**
 * Create the PR pod job for building and pushing images
 */
async function createPRPodJob(options: PRPodOptions): Promise<string> {
  const {
    prName = 'pr-000',
    namespace = 'default',
    githubUser = 'ncrmro',
    repoUrl = 'https://github.com/ncrmro/catalyst.git',
    branch = 'main',
    clusterName
  } = options;

  console.log(`🚀 Creating PR pod job: ${prName}...`);

  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const BatchV1Api = await getBatchV1Api();
  const batchApi = kc.makeApiClient(BatchV1Api);

  const jobName = `pr-pod-${prName}-${Date.now()}`;

  // Build script that focuses only on image building and pushing
  const buildScript = `
    set -e
    
    echo ""
    echo "=== Authenticating with GHCR ==="
    echo ""
    
    # Login to GitHub Container Registry using classic PAT
    echo "Logging into GHCR..."
    echo "Using GITHUB_USER: $GITHUB_USER"
    echo "$GITHUB_GHCR_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
    echo "✓ Successfully logged into GHCR"
    
    echo ""
    echo "=== Setting up Git Configuration ==="
    echo ""
    
    echo "Setting up git configuration..."
    git config --global credential.helper '!f() { echo "username=x-access-token"; echo "password=$GITHUB_TOKEN"; }; f'
    
    # Check if repository already exists in cache
    if [ -d /workspace/.git ]; then
      echo "Found existing repository in cache, fetching updates..."
      cd /workspace
      git fetch origin
      git checkout $PR_BRANCH
      git pull origin $PR_BRANCH
      echo "Repository updated from cache!"
    else
      echo "No cache found, cloning repository..."
      git clone $REPO_URL /workspace
      cd /workspace
      echo "Checking out PR branch..."
      git checkout $PR_BRANCH
      echo "Repository cloned and cached!"
    fi
    
    echo "Repository ready!"
    echo "Git status:"
    git status
    
    echo ""
    echo "=== Verifying tools and files ==="
    echo ""
    
    # Check pre-installed tools
    helm version --short || echo "Helm version check failed"
    kubectl version --client || echo "kubectl version check failed"
    git --version || echo "Git version check failed"
    docker --version || echo "Docker version check failed"
    
    # Check required files
    echo "Checking required files..."
    if [ -f "$DOCKERFILE_PATH" ]; then
      echo "✓ Found Dockerfile at $DOCKERFILE_PATH"
    else
      echo "✗ Dockerfile not found at $DOCKERFILE_PATH"
      exit 1
    fi
    
    echo ""
    echo "=== Setting up buildx kubernetes builder ==="
    echo ""
    
    # Check if builder already exists
    if docker buildx inspect k8s-builder >/dev/null 2>&1; then
      echo "Found existing k8s-builder, using it..."
      docker buildx use k8s-builder
      echo "Verifying existing builder status..."
      docker buildx inspect --bootstrap
    else
      echo "No existing builder found, creating new k8s-builder..."
      docker buildx create --driver kubernetes --name k8s-builder --bootstrap
      
      # Use the kubernetes builder
      echo "Using new kubernetes builder..."
      docker buildx use k8s-builder
      
      # Verify builder is ready
      echo "Verifying new builder status..."
      docker buildx inspect --bootstrap
    fi
    
    echo ""
    echo "=== Building and Pushing to GHCR ==="
    echo ""
    
    # Define image tags using PR number
    FULL_IMAGE_NAME="$REGISTRY_URL/$GITHUB_USER/$IMAGE_NAME"
    PR_TAG="pr-$PR_NUMBER"
    CACHE_TAG="pr-$PR_NUMBER-cache"
    
    echo "Building with tags:"
    echo "  Image: $FULL_IMAGE_NAME"
    echo "  PR Tag: $PR_TAG"
    echo "  Cache Tag: $CACHE_TAG"
    
    if [ -f "$DOCKER_BAKE_PATH" ] && [ -f "$DOCKERFILE_PATH" ]; then
      echo "Building and pushing all targets using docker buildx bake..."
      cd web
      
      # Adjust paths for the web directory context
      BAKE_FILE=$(basename "$DOCKER_BAKE_PATH")
      
      # List available targets in bake file
      echo "Available bake targets:"
      docker buildx bake --file "$BAKE_FILE" --print | grep -E '"target":|"context":' || echo "Could not parse bake targets"
      
      # Build and push using the bake file with GHCR output and cache
      docker buildx bake --file "$BAKE_FILE" \\
        --set "*.output=type=registry" \\
        --set "*.tags=$FULL_IMAGE_NAME:$PR_TAG" \\
        --set "*.cache-from=type=registry,ref=$FULL_IMAGE_NAME:$CACHE_TAG" \\
        --set "*.cache-to=type=registry,ref=$FULL_IMAGE_NAME:$CACHE_TAG,mode=max"
      echo "✓ Images built and pushed to GHCR with cache"
      
    elif [ -f "$DOCKERFILE_PATH" ]; then
      echo "No bake file found, building and pushing single image..."
      cd web
      docker buildx build --platform linux/amd64 \\
        --tag "$FULL_IMAGE_NAME:$PR_TAG" \\
        --cache-from "type=registry,ref=$FULL_IMAGE_NAME:$CACHE_TAG" \\
        --cache-to "type=registry,ref=$FULL_IMAGE_NAME:$CACHE_TAG,mode=max" \\
        --push .
      echo "✓ Image built and pushed to GHCR with cache"
    else
      echo "✗ Cannot build - Dockerfile not found"
      exit 1
    fi
    
    echo ""
    echo "=== Build Complete ==="
    echo ""
    echo "Images pushed to GHCR:"
    echo "  $FULL_IMAGE_NAME:$PR_TAG"
    echo "  $FULL_IMAGE_NAME:$CACHE_TAG (cache)"
    echo ""
    echo "PR pod image building complete!"
  `;

  const job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace: namespace,
      labels: {
        'app': 'catalyst-pr-job',
        'created-by': 'catalyst-web-app',
        'pr-name': prName
      }
    },
    spec: {
      backoffLimit: 0,
      template: {
        metadata: {
          labels: {
            'app': 'catalyst-pr-job',
            'created-by': 'catalyst-web-app',
            'pr-name': prName
          }
        },
        spec: {
          serviceAccountName: 'pull-request-job-pod',
          restartPolicy: 'Never',
          imagePullSecrets: [
            { name: 'ghcr-registry-secret' }
          ],
          containers: [
            {
              name: 'pr-builder',
              image: 'ghcr.io/ncrmro/catalyst/pr-job-pod:latest',
              env: [
                {
                  name: 'GITHUB_TOKEN',
                  valueFrom: {
                    secretKeyRef: {
                      name: 'github-pat-secret',
                      key: 'token'
                    }
                  }
                },
                {
                  name: 'GITHUB_GHCR_PAT',
                  valueFrom: {
                    secretKeyRef: {
                      name: 'github-pat-secret',
                      key: 'ghcr_token'
                    }
                  }
                },
                { name: 'REPO_URL', value: repoUrl },
                { name: 'PR_BRANCH', value: branch },
                { name: 'PR_NUMBER', value: prName.replace('pr-', '') },
                { name: 'REGISTRY_URL', value: 'ghcr.io' },
                { name: 'GITHUB_USER', value: githubUser },
                { name: 'IMAGE_NAME', value: 'catalyst/web' },
                { name: 'DOCKERFILE_PATH', value: 'web/Dockerfile' },
                { name: 'PACKAGE_JSON_PATH', value: 'web/package.json' },
                { name: 'DOCKER_BAKE_PATH', value: 'web/docker-bake.yml' }
              ],
              command: ['/bin/sh'],
              args: ['-c', buildScript],
              volumeMounts: [
                {
                  name: 'git-cache',
                  mountPath: '/workspace'
                },
                {
                  name: 'helm-cache',
                  mountPath: '/helm-cache'
                },
                {
                  name: 'docker-sock',
                  mountPath: '/var/run/docker.sock'
                }
              ]
            }
          ],
          volumes: [
            {
              name: 'git-cache',
              persistentVolumeClaim: {
                claimName: 'git-cache-pvc'
              }
            },
            {
              name: 'helm-cache',
              persistentVolumeClaim: {
                claimName: 'helm-cache-pvc'
              }
            },
            {
              name: 'docker-sock',
              hostPath: {
                path: '/var/run/docker.sock'
              }
            }
          ]
        }
      }
    }
  };

  await batchApi.createNamespacedJob({ namespace, body: job });
  console.log(`  ✓ Job created: ${jobName}`);
  
  return jobName;
}

/**
 * Main function to orchestrate the PR pod creation
 */
async function main(): Promise<void> {
  try {
    console.log('🎯 Submitting special catalyst pr-000 for image building and pushing');
    console.log('📁 Based on spike: 1757044045_pr_pod_helm_deployment');
    console.log('');

    // Check for required environment variables
    const githubPat = process.env.GITHUB_PAT;
    const githubGhcrPat = process.env.GITHUB_GHCR_PAT;

    if (!githubPat) {
      console.log('⚠️  GITHUB_PAT environment variable not set. This will cause authentication errors.');
      console.log('   Set GITHUB_PAT in your .env file or environment.');
    }

    if (!githubGhcrPat) {
      console.log('⚠️  GITHUB_GHCR_PAT environment variable not set. This will cause GHCR push errors.');
      console.log('   Set GITHUB_GHCR_PAT in your .env file or environment.');
    }

    if (!githubPat || !githubGhcrPat) {
      console.log('');
      console.log('💡 For testing purposes, you can uncomment and set these values in web/.env:');
      console.log('   GITHUB_PAT=your_github_personal_access_token');
      console.log('   GITHUB_GHCR_PAT=your_github_classic_pat_with_packages_scope');
      console.log('');
      console.log('❌ Exiting due to missing authentication credentials.');
      process.exit(1);
    }

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

    // Step 3: Create GitHub authentication secrets
    await createGitHubSecrets(options.namespace, options.clusterName);

    // Step 4: Create the PR pod job
    const jobName = await createPRPodJob(options);

    console.log('');
    console.log('✅ PR pod job submitted successfully!');
    console.log('');
    console.log('To monitor the job:');
    console.log(`  kubectl get job ${jobName} -n ${options.namespace}`);
    console.log(`  kubectl logs -f job/${jobName} -n ${options.namespace}`);
    console.log('');
    console.log('Expected output:');
    console.log(`  Images will be pushed to: ghcr.io/${options.githubUser}/catalyst/web:${options.prName}`);
    console.log(`  Cache will be pushed to: ghcr.io/${options.githubUser}/catalyst/web:${options.prName}-cache`);

  } catch (error) {
    console.error('❌ Error submitting PR pod job:', error);
    process.exit(1);
  }
}

// Run the script
main();

export { main, createRBACResources, createPVCs, createGitHubSecrets, createPRPodJob };
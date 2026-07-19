/**
 * Crossplane Bridge Model
 *
 * Translates database records into Crossplane Kubernetes resources.
 * Handles ProviderConfig creation for cloud accounts and KubernetesCluster
 * Claims for managed clusters.
 *
 * This is a model-layer function called by server actions, not a separate controller.
 */

import { db } from "@/db";
import {
  cloudAccounts,
  managedClusters,
  teams,
  nodePools,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@tetrastack/backend/utils";
import {
  getCustomObjectsApi,
  getClusterConfig,
  getCoreV1Api,
  ensureTeamNamespace,
  sanitizeNamespaceName,
} from "@/lib/k8s-client";

// Crossplane Group/Version constants
const AWS_PROVIDER_GROUP = "aws.upbound.io";
const AWS_PROVIDER_VERSION = "v1beta1";
const CATALYST_GROUP = "catalyst.tetraship.app";
const CATALYST_VERSION = "v1alpha1";

export interface DecryptedAWSAccount {
  roleARN: string;
  externalID: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/** Shape of Kubernetes API status conditions (Crossplane / Kubernetes) */
interface K8sCondition {
  type: string;
  status: string;
  reason?: string;
}

/** Shape returned by k8s CustomObjectsApi for our cluster claims */
interface K8sClusterResponse {
  status?: {
    conditions?: K8sCondition[];
  };
}

/**
 * Narrow an unknown caught error to extract the HTTP status code from
 * @kubernetes/client-node error responses (which carry a `response.statusCode`
 * property on the thrown object).
 */
function k8sStatusCode(e: unknown): number | undefined {
  return (e as { response?: { statusCode?: number } }).response?.statusCode;
}

/**
 * Extract an error message string from an unknown caught value.
 */
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error";
}

/**
 * Creates a Crossplane ProviderConfig for a linked cloud account.
 * For AWS, it creates a ProviderConfig that either:
 * 1. Uses AssumeRole via a shared management secret (iam_role)
 * 2. Uses an access key in a dedicated secret (access_key)
 */
export async function createProviderConfig(accountId: string) {
  const [account] = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new Error(`Cloud account ${accountId} not found`);
  }

  try {
    // Decrypt credentials
    const decrypted = decrypt(
      account.credentialEncrypted,
      account.credentialIv,
      account.credentialAuthTag
    );

    const CustomObjectsApiClass = await getCustomObjectsApi();
    const CoreV1ApiClass = await getCoreV1Api();
    const kubeConfig = await getClusterConfig();
    const k8sCustomApi = kubeConfig.makeApiClient(CustomObjectsApiClass);
    const k8sCoreApi = kubeConfig.makeApiClient(CoreV1ApiClass);

    if (account.provider === "aws") {
      let credentials: DecryptedAWSAccount;
      try {
        credentials = JSON.parse(decrypted);
      } catch (_e) {
        throw new Error("Failed to parse cloud account credentials. Expected JSON.");
      }

      if (account.credentialType === "iam_role") {
        // AssumeRole pattern: reference shared management secret
        const providerConfig = {
          apiVersion: `${AWS_PROVIDER_GROUP}/${AWS_PROVIDER_VERSION}`,
          kind: "ProviderConfig",
          metadata: {
            name: account.id,
          },
          spec: {
            credentials: {
              source: "Secret",
              secretRef: {
                namespace: "crossplane-system",
                name: "aws-mgmt-creds",
                key: "creds",
              },
            },
            assumeRoleChain: [
              {
                roleARN: credentials.roleARN,
                externalID: credentials.externalID,
              },
            ],
          },
        };

        await k8sCustomApi.createClusterCustomObject({
          group: AWS_PROVIDER_GROUP,
          version: AWS_PROVIDER_VERSION,
          plural: "providerconfigs",
          body: providerConfig,
        });
      } else if (account.credentialType === "access_key") {
        // Access key pattern: create a secret for this account
        const secretName = `aws-creds-${account.id}`;
        await k8sCoreApi.createNamespacedSecret({
          namespace: "crossplane-system",
          body: {
            apiVersion: "v1",
            kind: "Secret",
            metadata: {
              name: secretName,
            },
            stringData: {
              creds: `[default]
aws_access_key_id = ${credentials.accessKeyId}
aws_secret_access_key = ${credentials.secretAccessKey}
`,
            },
          },
        });

        const providerConfig = {
          apiVersion: `${AWS_PROVIDER_GROUP}/${AWS_PROVIDER_VERSION}`,
          kind: "ProviderConfig",
          metadata: {
            name: account.id,
          },
          spec: {
            credentials: {
              source: "Secret",
              secretRef: {
                namespace: "crossplane-system",
                name: secretName,
                key: "creds",
              },
            },
          },
        };

        await k8sCustomApi.createClusterCustomObject({
          group: AWS_PROVIDER_GROUP,
          version: AWS_PROVIDER_VERSION,
          plural: "providerconfigs",
          body: providerConfig,
        });
      } else {
        throw new Error(`Credential type ${account.credentialType} not supported for AWS`);
      }
    } else {
      throw new Error(`Provider ${account.provider} not supported yet`);
    }

    // Mark as active in DB
    await db
      .update(cloudAccounts)
      .set({ status: "active", lastError: null, updatedAt: new Date() })
      .where(eq(cloudAccounts.id, accountId));

  } catch (error: unknown) {
    console.error(`Failed to create ProviderConfig for account ${accountId}:`, error);
    
    // Update DB with error
    await db
      .update(cloudAccounts)
      .set({ 
        status: "error", 
        lastError: errorMessage(error) || "Unknown error during ProviderConfig creation",
        updatedAt: new Date() 
      })
      .where(eq(cloudAccounts.id, accountId));
      
    throw error;
  }
}

/**
 * Removes a Crossplane ProviderConfig and its associated secret if any.
 */
export async function deleteProviderConfig(accountId: string) {
  const [account] = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, accountId))
    .limit(1);

  if (!account) return;

  const CustomObjectsApiClass = await getCustomObjectsApi();
  const CoreV1ApiClass = await getCoreV1Api();
  const kubeConfig = await getClusterConfig();
  const k8sCustomApi = kubeConfig.makeApiClient(CustomObjectsApiClass);
  const k8sCoreApi = kubeConfig.makeApiClient(CoreV1ApiClass);

  if (account.provider === "aws") {
    // Delete ProviderConfig
    try {
      await k8sCustomApi.deleteClusterCustomObject({
        group: AWS_PROVIDER_GROUP,
        version: AWS_PROVIDER_VERSION,
        plural: "providerconfigs",
        name: account.id,
      });
    } catch (e: unknown) {
      if (k8sStatusCode(e) !== 404) {
        console.error(`Error deleting ProviderConfig ${account.id}:`, e);
      }
    }

    // Delete Secret if it was an access_key
    if (account.credentialType === "access_key") {
      try {
        const secretName = `aws-creds-${account.id}`;
        await k8sCoreApi.deleteNamespacedSecret({
          name: secretName,
          namespace: "crossplane-system",
        });
      } catch (e: unknown) {
        if (k8sStatusCode(e) !== 404) {
          console.error(`Error deleting secret aws-creds-${account.id}:`, e);
        }
      }
    }
  }
}

/**
 * Compute the Kubernetes metadata.name for a managed cluster claim.
 * Appends a short ID suffix to ensure uniqueness and guard against the edge
 * case where sanitization of the cluster name produces an empty string (e.g.
 * a name consisting only of symbols).
 *
 * Cluster IDs are UUIDs (36 chars), so slice(-8) always returns 8 characters.
 */
function clusterClaimName(clusterName: string, clusterId: string): string {
  const sanitized = sanitizeNamespaceName(clusterName);
  const idSuffix = clusterId.slice(-8);
  return sanitized ? `${sanitized}-${idSuffix}` : idSuffix;
}

/**
 * Creates a KubernetesCluster Claim in the team's namespace.
 */
export async function createClusterClaim(clusterId: string) {
  const [cluster] = await db
    .select()
    .from(managedClusters)
    .where(eq(managedClusters.id, clusterId))
    .limit(1);

  if (!cluster) {
    throw new Error(`Managed cluster ${clusterId} not found`);
  }

  try {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, cluster.teamId))
      .limit(1);

    if (!team) {
      throw new Error(`Team ${cluster.teamId} not found`);
    }

    const pools = await db
      .select()
      .from(nodePools)
      .where(eq(nodePools.clusterId, cluster.id));

    // Ensure team namespace exists
    const CustomObjectsApiClass = await getCustomObjectsApi();
    const kubeConfig = await getClusterConfig();
    await ensureTeamNamespace(kubeConfig, team.name);

    // Use the same sanitization as ensureTeamNamespace for namespace consistency
    const namespace = sanitizeNamespaceName(team.name);
    const k8sCustomApi = kubeConfig.makeApiClient(CustomObjectsApiClass);

    // Sanitize cluster name to be DNS-1123 compliant for K8s metadata.name
    const clusterMetadataName = clusterClaimName(cluster.name, cluster.id);

    const claim = {
      apiVersion: `${CATALYST_GROUP}/${CATALYST_VERSION}`,
      kind: "KubernetesCluster",
      metadata: {
        name: clusterMetadataName,
        namespace: namespace,
      },
      spec: {
        region: cluster.region,
        kubernetesVersion: cluster.kubernetesVersion,
        nodePools: pools.map(p => ({
          name: p.name,
          instanceType: p.instanceType,
          minNodes: p.minNodes,
          maxNodes: p.maxNodes,
          desiredNodes: p.minNodes, // Initial desired equals min
          spot: p.spotEnabled,
        })),
        // XRD defines providerConfigRef as a string (not an object)
        providerConfigRef: cluster.cloudAccountId,
      },
    };

    await k8sCustomApi.createNamespacedCustomObject({
      group: CATALYST_GROUP,
      version: CATALYST_VERSION,
      namespace,
      plural: "kubernetesclusters",
      body: claim,
    });

    // Initial status update in DB if needed (usually it's already 'provisioning')
    if (cluster.status !== "provisioning") {
      await db
        .update(managedClusters)
        .set({ status: "provisioning", updatedAt: new Date() })
        .where(eq(managedClusters.id, clusterId));
    }

  } catch (error: unknown) {
    console.error(`Failed to create cluster claim for ${clusterId}:`, error);
    
    // Update DB with error
    await db
      .update(managedClusters)
      .set({ 
        status: "error", 
        updatedAt: new Date() 
      })
      .where(eq(managedClusters.id, clusterId));
      
    throw error;
  }
}

/**
 * Deletes a KubernetesCluster Claim.
 */
export async function deleteClusterClaim(clusterId: string) {
  const [cluster] = await db
    .select()
    .from(managedClusters)
    .where(eq(managedClusters.id, clusterId))
    .limit(1);

  if (!cluster) return;

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, cluster.teamId))
    .limit(1);

  if (!team) return;

  const namespace = sanitizeNamespaceName(team.name);
  const CustomObjectsApiClass = await getCustomObjectsApi();
  const kubeConfig = await getClusterConfig();
  const k8sCustomApi = kubeConfig.makeApiClient(CustomObjectsApiClass);

  // Compute the same claim name used when creating the resource
  const clusterMetadataName = clusterClaimName(cluster.name, cluster.id);

  try {
    await k8sCustomApi.deleteNamespacedCustomObject({
      group: CATALYST_GROUP,
      version: CATALYST_VERSION,
      namespace,
      plural: "kubernetesclusters",
      name: clusterMetadataName,
    });
  } catch (e: unknown) {
    if (k8sStatusCode(e) !== 404) {
      console.error(`Error deleting cluster claim ${cluster.name}:`, e);
    }
  }
}

/**
 * Syncs the status of a managed cluster from its Crossplane Claim.
 */
export async function syncClusterStatus(clusterId: string) {
  const [cluster] = await db
    .select()
    .from(managedClusters)
    .where(eq(managedClusters.id, clusterId))
    .limit(1);

  if (!cluster) return;

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, cluster.teamId))
    .limit(1);

  if (!team) return;

  const namespace = sanitizeNamespaceName(team.name);
  const CustomObjectsApiClass = await getCustomObjectsApi();
  const kubeConfig = await getClusterConfig();
  const k8sCustomApi = kubeConfig.makeApiClient(CustomObjectsApiClass);

  // Compute the same claim name used when creating the resource
  const clusterMetadataName = clusterClaimName(cluster.name, cluster.id);

  try {
    const response = await k8sCustomApi.getNamespacedCustomObject({
      group: CATALYST_GROUP,
      version: CATALYST_VERSION,
      namespace,
      plural: "kubernetesclusters",
      name: clusterMetadataName,
    }) as K8sClusterResponse;

    // Check conditions for status
    const conditions: K8sCondition[] = response.status?.conditions ?? [];
    const readyCondition = conditions.find((c) => c.type === "Ready");

    let status = "provisioning";
    if (readyCondition?.status === "True") {
      status = "active";
    } else if (readyCondition?.status === "False") {
      // Check if it's a persistent failure or just not ready yet
      // For now, if Ready is False, we keep it as provisioning unless there's a more specific error
      // Crossplane often has "Ready=False" during initial provisioning.
      // But if it has a specific "Synced=False" with a serious error, we might want "error".
      const syncedCondition = conditions.find((c) => c.type === "Synced");
      if (syncedCondition?.status === "False" && syncedCondition?.reason === "ReconcileError") {
        status = "error";
      }
    }

    if (status !== cluster.status) {
      await db
        .update(managedClusters)
        .set({ status, updatedAt: new Date() })
        .where(eq(managedClusters.id, clusterId));
    }
  } catch (e: unknown) {
    if (k8sStatusCode(e) === 404) {
      // If the claim is gone and we were deleting, mark as deleted
      if (cluster.status === "deleting") {
        await db
          .update(managedClusters)
          .set({ status: "deleted", updatedAt: new Date() })
          .where(eq(managedClusters.id, clusterId));
      }
    } else {
      console.error(`Error syncing cluster status for ${clusterId}:`, e);
    }
  }
}

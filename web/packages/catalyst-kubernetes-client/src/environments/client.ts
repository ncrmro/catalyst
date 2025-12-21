/**
 * Environment CR client
 *
 * Provides CRUD operations for Environment custom resources.
 */

import { getClusterConfig, type KubeConfig } from "../config";
import { KubernetesError } from "../errors";
import { loadKubernetesClient } from "../loader";
import type { ListOptions } from "../types/common";
import {
  ENVIRONMENT_API,
  type Environment,
  type EnvironmentInput,
  type EnvironmentList,
} from "../types/environment";

/**
 * Client for Environment CR operations
 */
export class EnvironmentClient {
  private kubeConfig: KubeConfig;
  private defaultNamespace: string;

  constructor(kubeConfig: KubeConfig, defaultNamespace = "catalyst-system") {
    this.kubeConfig = kubeConfig;
    this.defaultNamespace = defaultNamespace;
  }

  /**
   * Get CustomObjectsApi client
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getApi(): Promise<any> {
    const k8s = await loadKubernetesClient();
    return this.kubeConfig.makeApiClient(k8s.CustomObjectsApi);
  }

  /**
   * Get a specific Environment by name
   */
  async get(name: string, namespace?: string): Promise<Environment | null> {
    const ns = namespace || this.defaultNamespace;
    const api = await this.getApi();

    try {
      const response = await api.getNamespacedCustomObject({
        group: ENVIRONMENT_API.group,
        version: ENVIRONMENT_API.version,
        namespace: ns,
        plural: ENVIRONMENT_API.plural,
        name,
      });
      return response as Environment;
    } catch (error) {
      const k8sError = KubernetesError.fromApiError(error);
      if (KubernetesError.isNotFound(k8sError)) {
        return null;
      }
      throw k8sError;
    }
  }

  /**
   * List Environments
   */
  async list(options?: ListOptions): Promise<EnvironmentList> {
    const api = await this.getApi();
    const ns = options?.namespace || this.defaultNamespace;

    try {
      const params: Record<string, unknown> = {
        group: ENVIRONMENT_API.group,
        version: ENVIRONMENT_API.version,
        namespace: ns,
        plural: ENVIRONMENT_API.plural,
      };

      if (options?.labelSelector) {
        params.labelSelector = options.labelSelector;
      }
      if (options?.fieldSelector) {
        params.fieldSelector = options.fieldSelector;
      }
      if (options?.limit) {
        params.limit = options.limit;
      }
      if (options?.continue) {
        params.continue = options.continue;
      }

      const response = await api.listNamespacedCustomObject(params);
      return response as EnvironmentList;
    } catch (error) {
      throw KubernetesError.fromApiError(error);
    }
  }

  /**
   * List Environments across all namespaces
   */
  async listAll(
    options?: Omit<ListOptions, "namespace">,
  ): Promise<EnvironmentList> {
    const api = await this.getApi();

    try {
      const params: Record<string, unknown> = {
        group: ENVIRONMENT_API.group,
        version: ENVIRONMENT_API.version,
        plural: ENVIRONMENT_API.plural,
      };

      if (options?.labelSelector) {
        params.labelSelector = options.labelSelector;
      }
      if (options?.fieldSelector) {
        params.fieldSelector = options.fieldSelector;
      }
      if (options?.limit) {
        params.limit = options.limit;
      }
      if (options?.continue) {
        params.continue = options.continue;
      }

      const response = await api.listClusterCustomObject(params);
      return response as EnvironmentList;
    } catch (error) {
      throw KubernetesError.fromApiError(error);
    }
  }

  /**
   * Create a new Environment
   */
  async create(
    env: EnvironmentInput,
    namespace?: string,
  ): Promise<Environment> {
    const ns = namespace || env.metadata.namespace || this.defaultNamespace;
    const api = await this.getApi();

    // Ensure proper API version and kind
    const body = {
      ...env,
      apiVersion: `${ENVIRONMENT_API.group}/${ENVIRONMENT_API.version}`,
      kind: ENVIRONMENT_API.kind,
      metadata: {
        ...env.metadata,
        namespace: ns,
      },
    };

    try {
      const response = await api.createNamespacedCustomObject({
        group: ENVIRONMENT_API.group,
        version: ENVIRONMENT_API.version,
        namespace: ns,
        plural: ENVIRONMENT_API.plural,
        body,
      });
      return response as Environment;
    } catch (error) {
      throw KubernetesError.fromApiError(error);
    }
  }

  /**
   * Update an existing Environment
   */
  async update(env: Environment): Promise<Environment> {
    const ns = env.metadata.namespace || this.defaultNamespace;
    const api = await this.getApi();

    try {
      const response = await api.replaceNamespacedCustomObject({
        group: ENVIRONMENT_API.group,
        version: ENVIRONMENT_API.version,
        namespace: ns,
        plural: ENVIRONMENT_API.plural,
        name: env.metadata.name,
        body: env,
      });
      return response as Environment;
    } catch (error) {
      throw KubernetesError.fromApiError(error);
    }
  }

  /**
   * Patch an Environment (partial update)
   */
  async patch(
    name: string,
    patch: Partial<Environment>,
    namespace?: string,
  ): Promise<Environment> {
    const ns = namespace || this.defaultNamespace;
    const api = await this.getApi();

    try {
      const response = await api.patchNamespacedCustomObject({
        group: ENVIRONMENT_API.group,
        version: ENVIRONMENT_API.version,
        namespace: ns,
        plural: ENVIRONMENT_API.plural,
        name,
        body: patch,
      });
      return response as Environment;
    } catch (error) {
      throw KubernetesError.fromApiError(error);
    }
  }

  /**
   * Delete an Environment
   */
  async delete(name: string, namespace?: string): Promise<void> {
    const ns = namespace || this.defaultNamespace;
    const api = await this.getApi();

    try {
      await api.deleteNamespacedCustomObject({
        group: ENVIRONMENT_API.group,
        version: ENVIRONMENT_API.version,
        namespace: ns,
        plural: ENVIRONMENT_API.plural,
        name,
      });
    } catch (error) {
      const k8sError = KubernetesError.fromApiError(error);
      // Ignore not found errors on delete
      if (!KubernetesError.isNotFound(k8sError)) {
        throw k8sError;
      }
    }
  }

  /**
   * Create or update an Environment (idempotent)
   */
  async apply(env: EnvironmentInput, namespace?: string): Promise<Environment> {
    const existing = await this.get(
      env.metadata.name,
      namespace || env.metadata.namespace,
    );

    if (existing) {
      return this.update({
        ...env,
        metadata: {
          ...env.metadata,
          resourceVersion: existing.metadata.resourceVersion,
        },
      } as Environment);
    }

    return this.create(env, namespace);
  }
}

/**
 * Create an EnvironmentClient with default configuration
 */
export async function createEnvironmentClient(
  clusterName?: string,
  defaultNamespace?: string,
): Promise<EnvironmentClient> {
  const kubeConfig = await getClusterConfig(clusterName);
  return new EnvironmentClient(kubeConfig, defaultNamespace);
}

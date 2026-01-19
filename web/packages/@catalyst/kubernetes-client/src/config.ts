/**
 * Kubernetes configuration management
 *
 * Handles loading kubeconfigs from environment variables, files, or in-cluster config.
 * Supports multi-cluster configurations via KUBECONFIG_* environment variables.
 */

import { loadKubernetesClient } from "./loader";
import { ConnectionError } from "./errors";

/**
 * Information about a configured cluster
 */
export interface ClusterInfo {
  /** Cluster context name */
  name: string;
  /** API server endpoint */
  endpoint: string;
  /** Source environment variable or 'default' */
  source: string;
}

/**
 * Options for creating a KubernetesClient
 */
export interface ClientOptions {
  /** Specific cluster name to use */
  cluster?: string;
  /** Default namespace for operations */
  defaultNamespace?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Wrapper around @kubernetes/client-node KubeConfig
 */
export class KubeConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _kc: any;

  /**
   * Configure cluster settings based on environment
   */
  private configureCluster(): void {
    if (!this._kc) {
      return;
    }

    try {
      const cluster = this._kc.getCurrentCluster();
      if (!cluster) {
        return;
      }

      const _serverUrl = cluster.server as string;

      // Override server URL if KUBERNETES_API_SERVER_HOST is set
      // This is used in Docker to reach the host's K8s API via host.docker.internal
      if (process.env.KUBERNETES_API_SERVER_HOST) {
        cluster.server = `https://${process.env.KUBERNETES_API_SERVER_HOST}:6443`;
        console.log(
          `Overrode cluster endpoint to ${cluster.server} from KUBERNETES_API_SERVER_HOST`,
        );
      }
      // Note: We no longer auto-rewrite localhost to host.docker.internal
      // Docker containers should set KUBERNETES_API_SERVER_HOST=host.docker.internal
      // Local dev (npm run dev) uses localhost:6443 which is forwarded by k3s-vm

      // Detect local development environments
      const isLocalCluster =
        cluster.server?.includes("localhost") ||
        cluster.server?.includes("127.0.0.1") ||
        cluster.server?.includes("host.docker.internal") ||
        cluster.server?.includes("kind-") ||
        cluster.server?.startsWith("http://") ||
        process.env.NODE_ENV === "development";

      // Check for explicit TLS skip override
      const skipTLSVerifyEnv = process.env.KUBE_SKIP_TLS_VERIFY;
      let skipTLSVerify = false;

      if (skipTLSVerifyEnv !== undefined) {
        skipTLSVerify = skipTLSVerifyEnv.toLowerCase() === "true";
      } else if (isLocalCluster) {
        skipTLSVerify = true;
      }

      if (skipTLSVerify) {
        cluster.skipTLSVerify = true;
        console.log("TLS verification disabled for local Kubernetes cluster");
      }
    } catch (error) {
      console.warn(
        "Failed to configure cluster settings:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Check if running inside a Kubernetes cluster
   */
  static isInCluster(): boolean {
    // Check for service account token - the definitive signal for in-cluster
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      return fs.existsSync(
        "/var/run/secrets/kubernetes.io/serviceaccount/token",
      );
    } catch {
      return false;
    }
  }

  /**
   * Load from in-cluster service account
   */
  async loadFromCluster(): Promise<void> {
    const k8s = await loadKubernetesClient();
    this._kc = new k8s.KubeConfig();
    this._kc.loadFromCluster();
    // Don't call configureCluster() for in-cluster - it's already correct
  }

  /**
   * Load from default kubeconfig location or in-cluster config
   */
  async loadFromDefault(): Promise<void> {
    const k8s = await loadKubernetesClient();
    this._kc = new k8s.KubeConfig();
    this._kc.loadFromDefault();
    this.configureCluster();
  }

  /**
   * Load from a kubeconfig string (YAML or JSON)
   */
  async loadFromString(kubeConfigString: string): Promise<void> {
    const k8s = await loadKubernetesClient();
    this._kc = new k8s.KubeConfig();
    this._kc.loadFromString(kubeConfigString);
    this.configureCluster();
  }

  /**
   * Load from a base64-encoded JSON kubeconfig in an environment variable
   */
  async loadFromEnvVar(envVarName: string): Promise<void> {
    const envValue = process.env[envVarName];
    if (!envValue) {
      throw new ConnectionError(`Environment variable ${envVarName} not found`);
    }

    let kubeConfigString: string;
    try {
      const decoded = Buffer.from(envValue, "base64").toString("utf-8");
      const kubeConfigObj = JSON.parse(decoded);
      kubeConfigString = JSON.stringify(kubeConfigObj);
    } catch (error) {
      throw new ConnectionError(
        `Failed to decode kubeconfig from ${envVarName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    await this.loadFromString(kubeConfigString);
  }

  /**
   * Get information about the current cluster
   */
  getClusterInfo(): ClusterInfo {
    if (!this._kc) {
      throw new ConnectionError(
        "KubeConfig not initialized. Call a load method first.",
      );
    }

    const currentContext = this._kc.getCurrentContext();
    const cluster = this._kc.getCurrentCluster();

    return {
      name: currentContext || "unknown",
      endpoint: cluster?.server || "unknown",
      source: "unknown",
    };
  }

  /**
   * Create an API client instance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeApiClient<T>(apiClass: new (...args: any[]) => T): T {
    if (!this._kc) {
      throw new ConnectionError(
        "KubeConfig not initialized. Call a load method first.",
      );
    }
    return this._kc.makeApiClient(apiClass);
  }

  /**
   * Get the underlying @kubernetes/client-node KubeConfig
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRawConfig(): any {
    return this._kc;
  }
}

/**
 * Registry for managing multiple kubeconfigs
 */
class KubeConfigRegistry {
  private configs: Map<string, KubeConfig> = new Map();
  private initialized = false;
  private clusterCache: ClusterInfo[] | null = null;
  private cacheExpiry = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Reset the registry (for testing)
   */
  reset(): void {
    this.configs.clear();
    this.initialized = false;
    this.clusterCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Initialize by loading kubeconfig from in-cluster or environment variables
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // PRIORITY 1: Check if running in-cluster (service account token exists)
    // This takes precedence over env vars since .env files may be mounted
    if (KubeConfig.isInCluster()) {
      try {
        const kubeConfig = new KubeConfig();
        await kubeConfig.loadFromCluster();
        this.configs.set("in-cluster", kubeConfig);
        this.initialized = true;
        return;
      } catch (error) {
        console.warn(
          "Failed to load in-cluster kubeconfig:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    // PRIORITY 2: Find all KUBECONFIG_* environment variables
    const kubeConfigEnvs = Object.keys(process.env).filter(
      (key) => key.startsWith("KUBECONFIG_") && process.env[key],
    );

    for (const envVar of kubeConfigEnvs) {
      try {
        const kubeConfig = new KubeConfig();
        await kubeConfig.loadFromEnvVar(envVar);

        // Extract suffix (e.g., KUBECONFIG_PRIMARY -> PRIMARY)
        const suffix = envVar.replace("KUBECONFIG_", "");
        this.configs.set(suffix, kubeConfig);
      } catch (error) {
        console.warn(
          `Failed to load kubeconfig from ${envVar}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    // PRIORITY 3: Fall back to default kubeconfig
    if (this.configs.size === 0) {
      try {
        const kubeConfig = new KubeConfig();
        await kubeConfig.loadFromDefault();
        this.configs.set("default", kubeConfig);
      } catch (error) {
        console.warn(
          "Failed to load default kubeconfig:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    if (this.configs.size === 0) {
      throw new ConnectionError(
        "No Kubernetes clusters configured. Ensure KUBECONFIG_PRIMARY or another KUBECONFIG_* environment variable is set with a valid base64-encoded kubeconfig.",
      );
    }

    this.initialized = true;
  }

  /**
   * Get all configured kubeconfigs
   */
  async getConfigs(): Promise<Map<string, KubeConfig>> {
    await this.initialize();
    return this.configs;
  }

  /**
   * Get kubeconfig for a specific cluster
   */
  async getConfigForCluster(clusterName: string): Promise<KubeConfig | null> {
    await this.initialize();

    // Try exact match first
    for (const [source, kubeConfig] of this.configs) {
      try {
        const clusterInfo = kubeConfig.getClusterInfo();
        if (clusterInfo.name === clusterName) {
          return kubeConfig;
        }
      } catch (error) {
        console.warn(
          `Failed to get cluster info for ${source}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    // Try by source name
    const config =
      this.configs.get(clusterName) ||
      this.configs.get(clusterName.replace("KUBECONFIG_", ""));
    return config || null;
  }

  /**
   * Get list of all available clusters
   */
  async getClusters(): Promise<ClusterInfo[]> {
    const now = Date.now();
    if (this.clusterCache && now < this.cacheExpiry) {
      return this.clusterCache;
    }

    await this.initialize();
    const clusters: ClusterInfo[] = [];

    for (const [source, kubeConfig] of this.configs) {
      try {
        const clusterInfo = kubeConfig.getClusterInfo();
        clusters.push({
          name: clusterInfo.name,
          endpoint: clusterInfo.endpoint,
          source: source === "default" ? "default" : `KUBECONFIG_${source}`,
        });
      } catch (error) {
        console.warn(
          `Failed to get cluster info for ${source}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    this.clusterCache = clusters;
    this.cacheExpiry = now + this.CACHE_TTL;

    return clusters;
  }

  /**
   * Get the best available kubeconfig
   */
  async getDefaultConfig(): Promise<KubeConfig> {
    await this.initialize();

    // Priority order for production clusters
    const productionNames = ["PRODUCTION", "PROD", "PRIMARY", "MAIN"];
    for (const name of productionNames) {
      const config = await this.getConfigForCluster(name);
      if (config) return config;
    }

    // Return first available
    const configs = await this.getConfigs();
    const first = configs.values().next().value;
    if (first) return first;

    throw new ConnectionError(
      "No Kubernetes clusters configured. Ensure KUBECONFIG_PRIMARY or another KUBECONFIG_* environment variable is set.",
    );
  }
}

// Global registry instance
const kubeConfigRegistry = new KubeConfigRegistry();

/**
 * Get all available clusters
 */
export async function getClusters(): Promise<ClusterInfo[]> {
  return kubeConfigRegistry.getClusters();
}

/**
 * Get kubeconfig for a specific cluster or the default
 */
export async function getClusterConfig(
  clusterName?: string,
): Promise<KubeConfig> {
  if (clusterName) {
    const config = await kubeConfigRegistry.getConfigForCluster(clusterName);
    if (config) return config;
    throw new ConnectionError(
      `Kubernetes cluster "${clusterName}" not found. Ensure KUBECONFIG_${clusterName} environment variable is set.`,
    );
  }
  return kubeConfigRegistry.getDefaultConfig();
}

/**
 * Get the AppsV1Api constructor
 */
export async function getAppsV1Api(): Promise<
  typeof import("@kubernetes/client-node").AppsV1Api
> {
  const k8s = await loadKubernetesClient();
  return k8s.AppsV1Api;
}

/**
 * Get the CoreV1Api constructor
 */
export async function getCoreV1Api(): Promise<
  typeof import("@kubernetes/client-node").CoreV1Api
> {
  const k8s = await loadKubernetesClient();
  return k8s.CoreV1Api;
}

/**
 * Get the CustomObjectsApi constructor
 */
export async function getCustomObjectsApi(): Promise<
  typeof import("@kubernetes/client-node").CustomObjectsApi
> {
  const k8s = await loadKubernetesClient();
  return k8s.CustomObjectsApi;
}

/**
 * Get the BatchV1Api constructor
 */
export async function getBatchV1Api(): Promise<
  typeof import("@kubernetes/client-node").BatchV1Api
> {
  const k8s = await loadKubernetesClient();
  return k8s.BatchV1Api;
}

/**
 * Reset the global registry (for testing)
 */
export function resetKubeConfigRegistry(): void {
  kubeConfigRegistry.reset();
}

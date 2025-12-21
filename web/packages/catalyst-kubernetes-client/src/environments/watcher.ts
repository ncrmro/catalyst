/**
 * Environment CR watcher
 *
 * Provides watch functionality for Environment resources with automatic reconnection.
 */

import type { KubeConfig } from "../config";
import { WatchError } from "../errors";
import { loadKubernetesClient } from "../loader";
import type { WatchEvent, WatchHandle, WatchOptions } from "../types/common";
import { ENVIRONMENT_API, type Environment } from "../types/environment";

/**
 * Event handler for Environment watch events
 */
export type EnvironmentWatchHandler = (
  event: WatchEvent<Environment>,
) => void | Promise<void>;

/**
 * Error handler for watch errors
 */
export type WatchErrorHandler = (error: WatchError) => void;

/**
 * Connection handler for watch connect events
 */
export type WatchConnectHandler = () => void;

/**
 * Options for watching Environments
 */
export interface EnvironmentWatchOptions extends WatchOptions {
  /** Handler for watch events */
  onEvent: EnvironmentWatchHandler;
  /** Handler for errors (optional) */
  onError?: WatchErrorHandler;
  /** Handler for connection events (optional) */
  onConnect?: WatchConnectHandler;
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay for reconnection backoff in ms (default: 1000) */
  reconnectDelayMs?: number;
}

/**
 * Watcher for Environment resources
 */
export class EnvironmentWatcher implements WatchHandle {
  private kubeConfig: KubeConfig;
  private defaultNamespace: string;
  private active = false;
  private abortController: AbortController | null = null;
  private resourceVersion: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(kubeConfig: KubeConfig, defaultNamespace = "catalyst-system") {
    this.kubeConfig = kubeConfig;
    this.defaultNamespace = defaultNamespace;
  }

  /**
   * Start watching Environments
   */
  async start(options: EnvironmentWatchOptions): Promise<void> {
    if (this.active) {
      return;
    }

    this.active = true;
    this.abortController = new AbortController();

    const {
      namespace,
      onEvent,
      onError,
      onConnect,
      autoReconnect = true,
      maxReconnectAttempts = 10,
      reconnectDelayMs = 1000,
      labelSelector,
      fieldSelector,
      resourceVersion,
      timeoutSeconds,
    } = options;

    const ns = namespace || this.defaultNamespace;

    // Use provided resourceVersion or stored one from previous watch
    if (resourceVersion) {
      this.resourceVersion = resourceVersion;
    }

    try {
      const k8s = await loadKubernetesClient();
      const watch = new k8s.Watch(this.kubeConfig.getRawConfig());

      const path = `/apis/${ENVIRONMENT_API.group}/${ENVIRONMENT_API.version}/namespaces/${ns}/${ENVIRONMENT_API.plural}`;

      const queryParams: Record<string, string> = {};
      if (labelSelector) queryParams.labelSelector = labelSelector;
      if (fieldSelector) queryParams.fieldSelector = fieldSelector;
      if (this.resourceVersion)
        queryParams.resourceVersion = this.resourceVersion;
      if (timeoutSeconds)
        queryParams.timeoutSeconds = timeoutSeconds.toString();

      // Notify connection
      onConnect?.();
      this.reconnectAttempts = 0;

      await watch.watch(
        path,
        queryParams,
        // Event callback
        (
          type: string,
          apiObj: Environment,
          watchObj: { metadata?: { resourceVersion?: string } },
        ) => {
          // Track resource version for reconnection
          if (watchObj?.metadata?.resourceVersion) {
            this.resourceVersion = watchObj.metadata.resourceVersion;
          }

          // Skip BOOKMARK events (they only update resourceVersion)
          if (type === "BOOKMARK") {
            return;
          }

          // Emit event
          const event: WatchEvent<Environment> = {
            type: type as WatchEvent<Environment>["type"],
            object: apiObj,
          };

          Promise.resolve(onEvent(event)).catch((err) => {
            console.error("Error in watch event handler:", err);
          });
        },
        // Error/done callback
        (err: Error | null) => {
          if (!this.active) {
            return;
          }

          if (err) {
            const watchError = new WatchError(
              err.message,
              err,
              this.resourceVersion || undefined,
            );
            onError?.(watchError);

            // Attempt reconnection if enabled
            if (
              autoReconnect &&
              this.reconnectAttempts < maxReconnectAttempts
            ) {
              this.scheduleReconnect(options, reconnectDelayMs);
            } else if (this.reconnectAttempts >= maxReconnectAttempts) {
              this.active = false;
              onError?.(
                new WatchError(
                  `Max reconnection attempts (${maxReconnectAttempts}) reached`,
                ),
              );
            }
          }
        },
      );
    } catch (error) {
      this.active = false;
      const watchError = new WatchError(
        error instanceof Error ? error.message : "Unknown watch error",
        error instanceof Error ? error : undefined,
      );
      onError?.(watchError);
      throw watchError;
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(
    options: EnvironmentWatchOptions,
    baseDelayMs: number,
  ): void {
    if (!this.active) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      baseDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      30000, // Max 30 seconds
    );

    console.log(
      `Scheduling watch reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.active) {
        this.start(options).catch((err) => {
          console.error("Failed to reconnect watch:", err);
        });
      }
    }, delay);
  }

  /**
   * Stop watching
   */
  stop(): void {
    this.active = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if watch is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get the current resource version
   */
  getResourceVersion(): string | null {
    return this.resourceVersion;
  }
}

/**
 * Watch all Environments (cluster-wide)
 */
export class ClusterEnvironmentWatcher implements WatchHandle {
  private kubeConfig: KubeConfig;
  private active = false;
  private abortController: AbortController | null = null;
  private resourceVersion: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(kubeConfig: KubeConfig) {
    this.kubeConfig = kubeConfig;
  }

  /**
   * Start watching all Environments cluster-wide
   */
  async start(
    options: Omit<EnvironmentWatchOptions, "namespace">,
  ): Promise<void> {
    if (this.active) {
      return;
    }

    this.active = true;
    this.abortController = new AbortController();

    const {
      onEvent,
      onError,
      onConnect,
      autoReconnect = true,
      maxReconnectAttempts = 10,
      reconnectDelayMs = 1000,
      labelSelector,
      fieldSelector,
      resourceVersion,
      timeoutSeconds,
    } = options;

    if (resourceVersion) {
      this.resourceVersion = resourceVersion;
    }

    try {
      const k8s = await loadKubernetesClient();
      const watch = new k8s.Watch(this.kubeConfig.getRawConfig());

      // Cluster-wide path (no namespace)
      const path = `/apis/${ENVIRONMENT_API.group}/${ENVIRONMENT_API.version}/${ENVIRONMENT_API.plural}`;

      const queryParams: Record<string, string> = {};
      if (labelSelector) queryParams.labelSelector = labelSelector;
      if (fieldSelector) queryParams.fieldSelector = fieldSelector;
      if (this.resourceVersion)
        queryParams.resourceVersion = this.resourceVersion;
      if (timeoutSeconds)
        queryParams.timeoutSeconds = timeoutSeconds.toString();

      onConnect?.();
      this.reconnectAttempts = 0;

      await watch.watch(
        path,
        queryParams,
        (
          type: string,
          apiObj: Environment,
          watchObj: { metadata?: { resourceVersion?: string } },
        ) => {
          if (watchObj?.metadata?.resourceVersion) {
            this.resourceVersion = watchObj.metadata.resourceVersion;
          }

          if (type === "BOOKMARK") {
            return;
          }

          const event: WatchEvent<Environment> = {
            type: type as WatchEvent<Environment>["type"],
            object: apiObj,
          };

          Promise.resolve(onEvent(event)).catch((err) => {
            console.error("Error in watch event handler:", err);
          });
        },
        (err: Error | null) => {
          if (!this.active) {
            return;
          }

          if (err) {
            const watchError = new WatchError(
              err.message,
              err,
              this.resourceVersion || undefined,
            );
            onError?.(watchError);

            if (
              autoReconnect &&
              this.reconnectAttempts < maxReconnectAttempts
            ) {
              this.scheduleReconnect(options, reconnectDelayMs);
            } else if (this.reconnectAttempts >= maxReconnectAttempts) {
              this.active = false;
              onError?.(
                new WatchError(
                  `Max reconnection attempts (${maxReconnectAttempts}) reached`,
                ),
              );
            }
          }
        },
      );
    } catch (error) {
      this.active = false;
      const watchError = new WatchError(
        error instanceof Error ? error.message : "Unknown watch error",
        error instanceof Error ? error : undefined,
      );
      onError?.(watchError);
      throw watchError;
    }
  }

  private scheduleReconnect(
    options: Omit<EnvironmentWatchOptions, "namespace">,
    baseDelayMs: number,
  ): void {
    if (!this.active) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      baseDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );

    console.log(
      `Scheduling cluster watch reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.active) {
        this.start(options).catch((err) => {
          console.error("Failed to reconnect cluster watch:", err);
        });
      }
    }, delay);
  }

  stop(): void {
    this.active = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getResourceVersion(): string | null {
    return this.resourceVersion;
  }
}

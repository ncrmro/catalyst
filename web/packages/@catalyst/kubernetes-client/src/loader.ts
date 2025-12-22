/**
 * Dynamic ESM loader for @kubernetes/client-node
 *
 * This module provides a dynamic import wrapper to handle ESM compatibility
 * with Jest and other CommonJS-based tooling.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let k8sModule: typeof import("@kubernetes/client-node") | null = null;

/**
 * Dynamically load the Kubernetes client module.
 * Caches the module after first load for efficiency.
 */
export async function loadKubernetesClient(): Promise<
  typeof import("@kubernetes/client-node")
> {
  if (!k8sModule) {
    k8sModule = await import("@kubernetes/client-node");
  }
  return k8sModule;
}

/**
 * Reset the cached module (for testing purposes)
 */
export function resetLoader(): void {
  k8sModule = null;
}

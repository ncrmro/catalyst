// Kubernetes client wrapper to handle ESM issues with Jest
// This module provides a CommonJS interface to the ESM Kubernetes client

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let k8s: any;

// Dynamic import to handle ESM module
async function loadKubernetesClient() {
  if (!k8s) {
    k8s = await import('@kubernetes/client-node');
  }
  return k8s;
}

export class KubeConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _kc: any;

  constructor() {
    // Will be initialized when needed
  }

  async loadFromDefault() {
    const k8sModule = await loadKubernetesClient();
    this._kc = new k8sModule.KubeConfig();
    return this._kc.loadFromDefault();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeApiClient(apiClass: any) {
    if (!this._kc) {
      throw new Error('KubeConfig not initialized. Call loadFromDefault() first.');
    }
    return this._kc.makeApiClient(apiClass);
  }
}

export async function getAppsV1Api() {
  const k8sModule = await loadKubernetesClient();
  return k8sModule.AppsV1Api;
}

export async function getCoreV1Api() {
  const k8sModule = await loadKubernetesClient();
  return k8sModule.CoreV1Api;
}
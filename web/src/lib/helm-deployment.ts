/**
 * Helm Deployment Module
 *
 * Handles Helm-based deployments for preview environments.
 * Uses helm CLI to deploy charts to Kubernetes namespaces.
 */

import { spawn } from "child_process";
import path from "path";

export interface HelmDeploymentConfig {
  namespace: string;
  releaseName: string;
  imageRepository: string;
  imageTag: string;
  prNumber: number;
  commitSha: string;
  publicUrl?: string;
  ingressEnabled?: boolean;
  ingressHost?: string;
  resourceLimits?: {
    cpu: string;
    memory: string;
  };
  resourceRequests?: {
    cpu: string;
    memory: string;
  };
  postgresqlEnabled?: boolean;
}

export interface HelmDeploymentResult {
  success: boolean;
  releaseName?: string;
  error?: string;
  output?: string;
}

/**
 * Deploy a Helm chart for a preview environment.
 *
 * Uses the nextjs chart from the charts directory to deploy
 * the preview application with dynamic configuration.
 *
 * @param config - Helm deployment configuration
 * @returns Deployment result
 */
export async function deployHelmChart(
  config: HelmDeploymentConfig,
): Promise<HelmDeploymentResult> {
  const {
    namespace,
    releaseName,
    imageRepository,
    imageTag,
    prNumber,
    commitSha,
    publicUrl,
    ingressEnabled = false,
    ingressHost,
    resourceLimits = { cpu: "500m", memory: "512Mi" },
    resourceRequests = { cpu: "100m", memory: "128Mi" },
    postgresqlEnabled = false,
  } = config;

  // Build helm command arguments
  const chartPath = path.resolve(process.cwd(), "../charts/nextjs");

  const helmArgs = [
    "upgrade",
    "--install",
    releaseName,
    chartPath,
    "--namespace",
    namespace,
    "--create-namespace",
    "--wait",
    "--timeout",
    "3m",
    // Image configuration
    "--set",
    `image.repository=${imageRepository}`,
    "--set",
    `image.tag=${imageTag}`,
    "--set",
    "image.pullPolicy=Always",
    // Resource limits
    "--set",
    `resources.limits.cpu=${resourceLimits.cpu}`,
    "--set",
    `resources.limits.memory=${resourceLimits.memory}`,
    "--set",
    `resources.requests.cpu=${resourceRequests.cpu}`,
    "--set",
    `resources.requests.memory=${resourceRequests.memory}`,
    // Disable PostgreSQL for preview environments (simpler setup)
    "--set",
    `postgresql.enabled=${postgresqlEnabled}`,
    // Environment variables for the app
    "--set",
    `nextjs.env[0].name=NODE_ENV`,
    "--set",
    `nextjs.env[0].value=preview`,
    "--set",
    `nextjs.env[1].name=PR_NUMBER`,
    "--set",
    `nextjs.env[1].value=${prNumber}`,
    "--set",
    `nextjs.env[2].name=COMMIT_SHA`,
    "--set",
    `nextjs.env[2].value=${commitSha}`,
    // Labels for tracking
    "--set",
    `podLabels.app=preview-environment`,
    "--set",
    `podLabels.pr-number=${prNumber}`,
    "--set",
    `podLabels.commit-sha=${commitSha.slice(0, 7)}`,
    "--set",
    `podLabels.created-by=catalyst`,
    // NetworkPolicy configuration (T092 - security isolation)
    // Enable network policy for namespace isolation
    "--set",
    "networkPolicy.enabled=true",
    // Allow ingress from ingress-nginx namespace
    "--set",
    "networkPolicy.ingress[0].from[0].namespaceSelector.matchLabels.name=ingress-nginx",
    // Allow egress to kube-system for DNS
    "--set",
    "networkPolicy.egress[0].to[0].namespaceSelector.matchLabels.name=kube-system",
    "--set",
    "networkPolicy.egress[0].ports[0].protocol=UDP",
    "--set",
    "networkPolicy.egress[0].ports[0].port=53",
    // Allow egress to docker-registry namespace
    "--set",
    "networkPolicy.egress[1].to[0].namespaceSelector.matchLabels.name=docker-registry",
    "--set",
    "networkPolicy.egress[1].ports[0].protocol=TCP",
    "--set",
    "networkPolicy.egress[1].ports[0].port=5000",
    // Deny all other traffic by default (implicit with NetworkPolicy)
    "--set",
    "networkPolicy.policyTypes[0]=Ingress",
    "--set",
    "networkPolicy.policyTypes[1]=Egress",
  ];

  // Add ingress configuration if enabled
  if (ingressEnabled && ingressHost) {
    helmArgs.push(
      "--set",
      "ingress.enabled=true",
      "--set",
      `ingress.hosts[0].host=${ingressHost}`,
      "--set",
      `ingress.hosts[0].paths[0].path=/`,
      "--set",
      `ingress.hosts[0].paths[0].pathType=Prefix`,
    );
  }

  // Add public URL as environment variable if provided
  if (publicUrl) {
    helmArgs.push(
      "--set",
      `nextjs.env[3].name=PUBLIC_URL`,
      "--set",
      `nextjs.env[3].value=${publicUrl}`,
    );
  }

  return new Promise((resolve) => {
    const helm = spawn("helm", helmArgs, {
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    helm.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    helm.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    helm.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          releaseName,
          output: stdout,
        });
      } else {
        console.error("Helm deployment failed:", stderr);
        resolve({
          success: false,
          error: stderr || `Helm exited with code ${code}`,
          output: stdout,
        });
      }
    });

    helm.on("error", (err) => {
      console.error("Helm spawn error:", err);
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}

/**
 * Delete a Helm release.
 *
 * @param releaseName - Name of the Helm release
 * @param namespace - Kubernetes namespace
 * @returns Deletion result
 */
export async function deleteHelmRelease(
  releaseName: string,
  namespace: string,
): Promise<{ success: boolean; error?: string }> {
  const helmArgs = ["uninstall", releaseName, "--namespace", namespace];

  return new Promise((resolve) => {
    const helm = spawn("helm", helmArgs, {
      env: { ...process.env },
    });

    let stderr = "";

    helm.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    helm.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        // If release not found, that's okay
        if (stderr.includes("not found")) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr || `Helm uninstall exited with code ${code}`,
          });
        }
      }
    });

    helm.on("error", (err) => {
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}

/**
 * Get the status of a Helm release.
 *
 * @param releaseName - Name of the Helm release
 * @param namespace - Kubernetes namespace
 * @returns Release status
 */
export async function getHelmReleaseStatus(
  releaseName: string,
  namespace: string,
): Promise<{
  success: boolean;
  status?: string;
  deployed?: boolean;
  error?: string;
}> {
  const helmArgs = [
    "status",
    releaseName,
    "--namespace",
    namespace,
    "--output",
    "json",
  ];

  return new Promise((resolve) => {
    const helm = spawn("helm", helmArgs, {
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    helm.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    helm.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    helm.on("close", (code) => {
      if (code === 0) {
        try {
          const status = JSON.parse(stdout);
          resolve({
            success: true,
            status: status.info?.status || "unknown",
            deployed: status.info?.status === "deployed",
          });
        } catch {
          resolve({
            success: true,
            status: "unknown",
            deployed: false,
          });
        }
      } else {
        if (stderr.includes("not found")) {
          resolve({
            success: true,
            status: "not-found",
            deployed: false,
          });
        } else {
          resolve({
            success: false,
            error: stderr || `Helm status exited with code ${code}`,
          });
        }
      }
    });

    helm.on("error", (err) => {
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}

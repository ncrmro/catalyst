"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ClusterInfo } from "@/lib/k8s-client";
import type { GitHubOIDCResult } from "@/lib/k8s-github-oidc";

export interface ExtendedClusterInfo extends ClusterInfo {
  costPerMonth?: string;
  currentNodes?: number;
  maxNodes?: number;
  allocatedCPU?: string;
  allocatedMemory?: string;
  allocatedStorage?: string;
  githubOIDCEnabled?: boolean;
}

export interface ClusterCardProps {
  cluster: ExtendedClusterInfo;
  /** Action callback for toggling GitHub OIDC - passed from server component */
  onToggleOIDC?: (
    clusterName: string,
    enabled: boolean,
  ) => Promise<GitHubOIDCResult>;
}

export function ClusterCard({ cluster, onToggleOIDC }: ClusterCardProps) {
  const [githubOIDCEnabled, setGithubOIDCEnabled] = useState(
    cluster.githubOIDCEnabled || false,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isRealCluster = !!(cluster.endpoint && cluster.source);

  const handleGitHubOIDCToggle = () => {
    if (!isRealCluster || !onToggleOIDC) {
      return; // Don't allow toggling for mock clusters or if no handler
    }

    const newValue = !githubOIDCEnabled;
    setError(null);

    startTransition(async () => {
      try {
        await onToggleOIDC(cluster.name, newValue);
        setGithubOIDCEnabled(newValue);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to toggle GitHub OIDC",
        );
        // Reset the checkbox state on error
        setGithubOIDCEnabled(!newValue);
      }
    });
  };

  return (
    <div className="border border-outline rounded-lg p-6 bg-surface shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-on-surface capitalize">
          {cluster.name}
        </h3>
        {isRealCluster && (
          <span className="text-xs bg-primary-container text-on-primary-container px-2 py-1 rounded">
            {cluster.source}
          </span>
        )}
      </div>

      {isRealCluster && (
        <div className="mb-4">
          <p className="text-sm text-on-surface-variant">Endpoint</p>
          <p className="text-sm font-mono text-on-surface break-all">
            {cluster.endpoint}
          </p>
        </div>
      )}

      {/* GitHub OIDC Section */}
      {isRealCluster && (
        <div className="mb-4 p-3 bg-primary-container/50 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-on-surface">GitHub OIDC</p>
              <p className="text-xs text-on-surface-variant">
                Environment token authentication
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={githubOIDCEnabled}
                onChange={handleGitHubOIDCToggle}
                disabled={isPending}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-outline peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          {error && <p className="text-xs text-error mt-2">{error}</p>}
          {isPending && (
            <p className="text-xs text-on-surface-variant mt-2">Updating...</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-on-surface-variant">Cost per Month</p>
          <p className="text-lg font-medium text-secondary">
            {cluster.costPerMonth || "N/A"}
          </p>
        </div>

        <div>
          <p className="text-sm text-on-surface-variant">Nodes</p>
          <p className="text-lg font-medium text-on-surface">
            {cluster.currentNodes && cluster.maxNodes
              ? `${cluster.currentNodes} / ${cluster.maxNodes}`
              : "N/A"}
          </p>
        </div>

        <div>
          <p className="text-sm text-on-surface-variant">CPU</p>
          <p className="text-lg font-medium text-on-surface">
            {cluster.allocatedCPU || "N/A"}
          </p>
        </div>

        <div>
          <p className="text-sm text-on-surface-variant">Memory</p>
          <p className="text-lg font-medium text-on-surface">
            {cluster.allocatedMemory || "N/A"}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-sm text-on-surface-variant">Storage</p>
          <p className="text-lg font-medium text-on-surface">
            {cluster.allocatedStorage || "N/A"}
          </p>
        </div>
      </div>

      {cluster.currentNodes && cluster.maxNodes && (
        <div className="mt-4 bg-primary-container rounded p-3">
          <div className="flex justify-between text-sm text-on-primary-container">
            <span>Node Utilization:</span>
            <span>
              {Math.round((cluster.currentNodes / cluster.maxNodes) * 100)}%
            </span>
          </div>
          <div className="w-full bg-outline rounded-full h-2 mt-1">
            <div
              className="bg-primary h-2 rounded-full"
              style={{
                width: `${(cluster.currentNodes / cluster.maxNodes) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/compute/clusters/${encodeURIComponent(cluster.name)}/namespaces`}
          className="flex-1 bg-primary text-on-primary text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-primary-variant transition-colors"
        >
          View Namespaces
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PRICING } from "@catalyst/billing";
import { createManagedCluster, deleteManagedCluster, ManagedClusterSummary } from "@/actions/managed-clusters";

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1"] as const;
const K8S_VERSIONS = ["1.31", "1.30", "1.29"] as const;
const INSTANCE_TYPES = [
  "t3.medium",
  "t3.large",
  "m5.large",
  "m5.xlarge",
] as const;

interface ClusterProvisioningProps {
  teamId: string;
  cloudAccountId: string;
  initialClusters: ManagedClusterSummary[];
}

export function ClusterProvisioning({
  teamId,
  cloudAccountId,
  initialClusters,
}: ClusterProvisioningProps) {
  const router = useRouter();
  const [region, setRegion] = useState<string>(REGIONS[0]);
  const [k8sVersion, setK8sVersion] = useState<string>(K8S_VERSIONS[0]);
  const [clusterName, setClusterName] = useState("");
  const [instanceType, setInstanceType] = useState<string>(INSTANCE_TYPES[0]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleProvision = async () => {
    setIsProvisioning(true);
    setError(null);

    try {
      const result = await createManagedCluster(teamId, {
        cloudAccountId,
        name: clusterName,
        region,
        kubernetesVersion: k8sVersion,
        config: { instanceType },
      });

      if (result.success) {
        setClusterName("");
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (_err) {
      setError("Failed to provision cluster.");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleDelete = async (clusterId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete cluster "${name}"?`)) return;

    setDeletingId(clusterId);
    try {
      const result = await deleteManagedCluster(teamId, clusterId, name);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (_err) {
      alert("Failed to delete cluster.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {initialClusters.map((cluster) => (
        <Card key={cluster.id}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-on-surface">
                Managed Cluster: {cluster.name}
              </h3>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  cluster.status === "active" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                }`}>
                  {cluster.status}
                </span>
                <button
                  onClick={() => handleDelete(cluster.id, cluster.name)}
                  disabled={deletingId === cluster.id}
                  className="text-xs text-error hover:underline disabled:opacity-50"
                >
                  {deletingId === cluster.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-outline/50">
              <div>
                <p className="text-xs text-on-surface-variant">Region</p>
                <p className="text-sm text-on-surface">{cluster.region}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">
                  Kubernetes Version
                </p>
                <p className="text-sm text-on-surface">v{cluster.kubernetesVersion}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <div className="space-y-4">
          <h3 className="text-base font-medium text-on-surface">
            Provision a Cluster
          </h3>
          <p className="text-sm text-on-surface-variant">
            Deploy a self-managed Kubernetes cluster in your cloud account.
          </p>

          {isProvisioning ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              <p className="text-sm text-on-surface-variant">
                Provisioning cluster...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">
                  Cluster Name
                </label>
                <input
                  type="text"
                  value={clusterName}
                  onChange={(e) => setClusterName(e.target.value)}
                  placeholder="my-cluster"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">
                  Kubernetes Version
                </label>
                <select
                  value={k8sVersion}
                  onChange={(e) => setK8sVersion(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {K8S_VERSIONS.map((v) => (
                    <option key={v} value={v}>
                      v{v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">
                  Control Plane Instance Type
                </label>
                <select
                  value={instanceType}
                  onChange={(e) => setInstanceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {INSTANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          {!isProvisioning && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-on-surface-variant">
                ${PRICING.MANAGED_CLUSTER_MONTHLY}/mo per cluster
              </span>
              <button
                onClick={handleProvision}
                disabled={!clusterName}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-opacity ${
                  clusterName
                    ? "text-on-primary bg-primary hover:opacity-90"
                    : "bg-surface-variant text-on-surface-variant cursor-not-allowed"
                }`}
              >
                Provision Cluster
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

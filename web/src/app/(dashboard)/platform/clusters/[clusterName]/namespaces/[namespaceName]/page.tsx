import { notFound } from "next/navigation";
import { getClusters } from "@/actions/clusters";
import { getNamespaces } from "@/actions/namespaces";
import { getPodsInNamespace, PodInfo } from "@/actions/pods";
import Link from "next/link";

interface PodCardProps {
  pod: PodInfo;
}

function PodCard({ pod }: PodCardProps) {
  const age = pod.creationTimestamp
    ? Math.floor(
        (Date.now() - new Date(pod.creationTimestamp).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "succeeded":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="border border-outline rounded-lg p-6 bg-surface shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-on-surface">{pod.name}</h3>
        <span
          className={`text-xs px-2 py-1 rounded border ${getStatusColor(pod.status)}`}
        >
          {pod.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-on-surface-variant">Age</p>
            <p className="text-sm text-on-surface">
              {age > 0 ? `${age} days` : "Less than 1 day"}
            </p>
          </div>

          {pod.nodeName && (
            <div>
              <p className="text-sm text-on-surface-variant">Node</p>
              <p className="text-sm text-on-surface font-mono">
                {pod.nodeName}
              </p>
            </div>
          )}
        </div>

        {pod.containers.length > 0 && (
          <div>
            <p className="text-sm text-on-surface-variant mb-2">
              Containers ({pod.containers.length})
            </p>
            <div className="space-y-2">
              {pod.containers.map((container, index) => (
                <div key={index} className="bg-secondary-container rounded p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-on-secondary-container">
                      {container.name}
                    </span>
                    <span
                      className={`text-xs px-1 py-0.5 rounded ${
                        container.ready
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {container.ready ? "Ready" : "Not Ready"}
                    </span>
                  </div>
                  <p className="text-xs text-on-secondary-container font-mono mt-1">
                    {container.image}
                  </p>
                  {container.restartCount > 0 && (
                    <p className="text-xs text-on-secondary-container mt-1">
                      Restarts: {container.restartCount}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pod.labels && Object.keys(pod.labels).length > 0 && (
          <div>
            <p className="text-sm text-on-surface-variant">Labels</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(pod.labels)
                .slice(0, 3)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="text-xs bg-secondary-container text-on-secondary-container px-2 py-1 rounded"
                    title={`${key}: ${value}`}
                  >
                    {key.includes("/") ? key.split("/")[1] : key}: {value}
                  </span>
                ))}
              {Object.keys(pod.labels).length > 3 && (
                <span className="text-xs text-on-surface-variant">
                  +{Object.keys(pod.labels).length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{
    clusterName: string;
    namespaceName: string;
  }>;
}

export default async function NamespaceDetailPage({ params }: PageProps) {
  const { clusterName, namespaceName } = await params;
  const decodedClusterName = decodeURIComponent(clusterName);
  const decodedNamespaceName = decodeURIComponent(namespaceName);

  // Verify cluster exists
  const clusters = await getClusters();
  const cluster = clusters.find((c) => c.name === decodedClusterName);

  if (!cluster) {
    notFound();
    return;
  }

  // Verify namespace exists
  let namespaceExists = false;
  try {
    const namespaces = await getNamespaces(decodedClusterName);
    namespaceExists = namespaces.some((ns) => ns.name === decodedNamespaceName);
  } catch (err) {
    console.error("Failed to verify namespace:", err);
  }

  if (!namespaceExists) {
    notFound();
    return;
  }

  let pods: PodInfo[] = [];
  let error: string | null = null;

  try {
    pods = await getPodsInNamespace(decodedNamespaceName, decodedClusterName);
  } catch (err) {
    console.error("Failed to load pods:", err);
    error = err instanceof Error ? err.message : "Unknown error occurred";
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/compute/clusters/${encodeURIComponent(decodedClusterName)}/namespaces`}
              className="text-primary hover:text-primary-variant text-sm"
            >
              ← Back to Namespaces
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-on-background catalyst-title">
            Namespace: {decodedNamespaceName}
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Resources in the {decodedNamespaceName} namespace on{" "}
            {decodedClusterName}
          </p>
          {cluster.endpoint && (
            <p className="mt-1 text-sm text-on-surface-variant font-mono">
              {cluster.endpoint}
            </p>
          )}
        </div>

        {error ? (
          <div className="bg-error-container border border-error rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-on-error-container mb-2">
              Failed to load pods
            </h2>
            <p className="text-on-error-container">{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-on-surface">Pods</h2>
                <p className="text-sm text-on-surface-variant">
                  Found {pods.length} pod{pods.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pods.map((pod) => (
                <PodCard key={pod.name} pod={pod} />
              ))}
            </div>

            {pods.length === 0 && (
              <div className="text-center py-12">
                <p className="text-lg text-on-surface-variant">
                  No pods found in this namespace
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

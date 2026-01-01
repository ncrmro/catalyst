"use client";

import type { PodInfo } from "@/lib/k8s-pods";
import { EntityCard } from "@/components/ui/entity-card";

interface PodCardProps {
  pod: PodInfo;
}

function getStatusColor(status: string) {
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
}

export function PodCard({ pod }: PodCardProps) {
  const age = pod.creationTimestamp
    ? Math.floor(
        (Date.now() - new Date(pod.creationTimestamp).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const ageText = age > 0 ? `${age} days` : "< 1 day";

  const statusBadge = (
    <span
      className={`text-xs px-2 py-1 rounded border ${getStatusColor(pod.status)}`}
    >
      {pod.status}
    </span>
  );

  const metadata = (
    <div className="flex items-center gap-4">
      <span>{ageText}</span>
      {pod.nodeName && (
        <span className="font-mono text-on-surface-variant">
          {pod.nodeName}
        </span>
      )}
      <span>
        {pod.containers.length} container
        {pod.containers.length !== 1 ? "s" : ""}
      </span>
    </div>
  );

  const expandedContent = (
    <div className="space-y-4 border-t border-outline/30 pt-4">
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
          <p className="text-sm text-on-surface-variant mb-2">Labels</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(pod.labels)
              .slice(0, 5)
              .map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs bg-secondary-container text-on-secondary-container px-2 py-1 rounded"
                  title={`${key}: ${value}`}
                >
                  {key.includes("/") ? key.split("/")[1] : key}: {value}
                </span>
              ))}
            {Object.keys(pod.labels).length > 5 && (
              <span className="text-xs text-on-surface-variant">
                +{Object.keys(pod.labels).length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <EntityCard
      title={pod.name}
      metadata={metadata}
      trailingContent={statusBadge}
      expandable
      expanded
      expandedContent={expandedContent}
      size="sm"
    />
  );
}

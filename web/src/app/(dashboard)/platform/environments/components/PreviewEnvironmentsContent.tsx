import Link from "next/link";
import {
  getPreviewEnvironmentsWithMetrics,
} from "@/actions/preview-environments";
import {
  RESOURCE_QUOTA_LIMITS,
  type PreviewPodWithMetrics,
} from "@/types/preview-environments";

/**
 * Get status badge styling based on pod status
 */
function getStatusBadge(status: string) {
  switch (status) {
    case "running":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        dot: "bg-green-500",
        label: "Running",
      };
    case "deploying":
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        dot: "bg-blue-500 animate-pulse",
        label: "Deploying",
      };
    case "pending":
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        dot: "bg-yellow-500",
        label: "Pending",
      };
    case "failed":
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        dot: "bg-red-500",
        label: "Failed",
      };
    case "deleting":
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        dot: "bg-gray-500 animate-pulse",
        label: "Deleting",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        dot: "bg-gray-500",
        label: status,
      };
  }
}

/**
 * Format resource usage display
 */
function formatResourceUsage(
  value: number | undefined,
  limit: number,
  unit: string,
): { display: string; isExceeding: boolean } {
  if (value === undefined || value === 0) {
    return { display: "-", isExceeding: false };
  }
  const isExceeding = value > limit;
  return {
    display: `${Math.round(value)}${unit}`,
    isExceeding,
  };
}

/**
 * Format age display
 */
function formatAge(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Preview environment row component with resource metrics
 */
function PreviewEnvironmentRow({
  podWithMetrics,
}: {
  podWithMetrics: PreviewPodWithMetrics;
}) {
  const { pod, pullRequest, resourceUsage, ageDays, isExceedingQuota } =
    podWithMetrics;
  const statusBadge = getStatusBadge(pod.status);

  const cpuUsage = formatResourceUsage(
    resourceUsage?.cpuMillicores,
    RESOURCE_QUOTA_LIMITS.cpuMillicores,
    "m",
  );
  const memUsage = formatResourceUsage(
    resourceUsage?.memoryMiB,
    RESOURCE_QUOTA_LIMITS.memoryMiB,
    "Mi",
  );

  return (
    <tr className="hover:bg-surface-variant/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
          <Link
            href={`/preview-environments/${pod.id}`}
            className="font-medium text-on-surface hover:text-primary"
          >
            {pod.namespace}
          </Link>
          {isExceedingQuota && (
            <span className="text-amber-500" title="Exceeding resource quota">
              ⚠️
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
        >
          {statusBadge.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <span className={cpuUsage.isExceeding ? "text-red-600" : ""}>
            {cpuUsage.display}
          </span>
          <span className="text-on-surface-variant mx-1">/</span>
          <span className={memUsage.isExceeding ? "text-red-600" : ""}>
            {memUsage.display}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-variant">
        {formatAge(ageDays)}
      </td>
      <td className="px-4 py-3">
        {pod.publicUrl ? (
          <a
            href={pod.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            Open
          </a>
        ) : (
          <span className="text-on-surface-variant text-sm">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/pull-requests/${pullRequest.id}`}
          className="text-primary hover:underline text-sm"
        >
          #{pullRequest.number}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-variant">
        {pod.branch}
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-variant font-mono">
        {pod.commitSha.slice(0, 7)}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/preview-environments/${pod.id}`}
          className="text-sm text-primary hover:underline"
        >
          Details
        </Link>
      </td>
    </tr>
  );
}

/**
 * Server component that fetches and displays preview environments content
 * This component is wrapped in suspense by the parent
 */
export async function PreviewEnvironmentsContent() {
  const result = await getPreviewEnvironmentsWithMetrics({
    includeMetrics: true,
  });

  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Error loading preview environments</p>
        <p className="text-sm">{result.error}</p>
      </div>
    );
  }

  const pods = result.data || [];

  // Count environments by status
  const statusCounts = pods.reduce(
    (acc, p) => {
      acc[p.pod.status] = (acc[p.pod.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Count environments exceeding quota
  const exceedingQuotaCount = pods.filter((p) => p.isExceedingQuota).length;

  if (pods.length === 0) {
    return (
      <div className="bg-surface border border-outline rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-on-surface-variant text-2xl">🚀</span>
        </div>
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          No Preview Environments
        </h3>
        <p className="text-on-surface-variant max-w-md mx-auto">
          You don&apos;t have any active preview environments at the moment.
          When you open pull requests in configured repositories, preview
          environments will be automatically created and appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-on-surface">
          Active Environments ({pods.length})
        </h2>
        <div className="flex items-center gap-4 text-sm">
          {statusCounts.running && (
            <span className="text-green-600">
              {statusCounts.running} running
            </span>
          )}
          {statusCounts.deploying && (
            <span className="text-blue-600">
              {statusCounts.deploying} deploying
            </span>
          )}
          {statusCounts.pending && (
            <span className="text-yellow-600">
              {statusCounts.pending} pending
            </span>
          )}
          {statusCounts.failed && (
            <span className="text-red-600">{statusCounts.failed} failed</span>
          )}
          {exceedingQuotaCount > 0 && (
            <span className="text-amber-600">
              ⚠️ {exceedingQuotaCount} over quota
            </span>
          )}
        </div>
      </div>

      <div className="bg-surface border border-outline rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-variant/50 border-b border-outline">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  Namespace
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  CPU / Mem
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  URL
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  PR
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  Commit
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-on-surface">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {pods.map((podWithMetrics) => (
                <PreviewEnvironmentRow
                  key={podWithMetrics.pod.id}
                  podWithMetrics={podWithMetrics}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

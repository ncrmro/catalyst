import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPreviewEnvironmentStatus,
  getPreviewEnvironmentLogs,
} from "@/actions/preview-environments";
import { DeleteButton } from "./DeleteButton";
import { RetryButton } from "./RetryButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
    case "available":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        dot: "bg-green-500",
        label: "Available",
      };
    case "progressing":
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        dot: "bg-blue-500 animate-pulse",
        label: "Progressing",
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
 * Logs viewer component with real-time refresh capability
 */
async function LogsViewer({ podId }: { podId: string }) {
  const logsResult = await getPreviewEnvironmentLogs(podId, {
    tailLines: 100,
    timestamps: true,
  });

  if (!logsResult.success) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        <p className="font-medium">Unable to fetch logs</p>
        <p className="text-sm">{logsResult.error}</p>
      </div>
    );
  }

  const logs = logsResult.data || "No logs available";

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-gray-300 text-sm font-medium">
          Container Logs (last 100 lines)
        </span>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">
            Auto-refresh: On page reload
          </span>
        </div>
      </div>
      <pre className="p-4 text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto font-mono">
        {logs}
      </pre>
    </div>
  );
}

/**
 * Preview Environment detail page
 * Shows full pod details, deployment status, and container logs
 */
export default async function PreviewEnvironmentDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const statusResult = await getPreviewEnvironmentStatus(id);

  if (!statusResult.success) {
    if (statusResult.error === "Access denied") {
      notFound();
    }
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Error loading preview environment</p>
        <p className="text-sm">{statusResult.error}</p>
      </div>
    );
  }

  const status = statusResult.data!;
  const dbBadge = getStatusBadge(status.dbStatus);
  const k8sBadge = status.k8sStatus
    ? getStatusBadge(status.k8sStatus.status)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/preview-environments"
              className="text-on-surface-variant hover:text-on-surface"
            >
              Preview Environments
            </Link>
            <span className="text-on-surface-variant">/</span>
            <span className="text-on-surface font-medium">
              {status.namespace}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-on-background">
            {status.deploymentName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {status.publicUrl && status.dbStatus === "running" && (
            <a
              href={status.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span>Open Preview</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
          {status.dbStatus === "failed" && <RetryButton podId={id} />}
          <DeleteButton podId={id} deploymentName={status.deploymentName} />
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Database Status */}
        <div className="bg-surface border border-outline rounded-lg p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            Database Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Status</span>
              <span
                className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${dbBadge.bg} ${dbBadge.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${dbBadge.dot}`} />
                {dbBadge.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Namespace</span>
              <span className="text-on-surface font-mono text-sm">
                {status.namespace}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Deployment</span>
              <span className="text-on-surface font-mono text-sm">
                {status.deploymentName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Branch</span>
              <span className="text-on-surface font-mono text-sm">
                {status.branch}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Commit</span>
              <span className="text-on-surface font-mono text-sm">
                {status.commitSha.slice(0, 7)}
              </span>
            </div>
          </div>
        </div>

        {/* Kubernetes Status */}
        <div className="bg-surface border border-outline rounded-lg p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            Kubernetes Status
          </h2>
          {k8sBadge ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Status</span>
                <span
                  className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${k8sBadge.bg} ${k8sBadge.text}`}
                >
                  <span className={`w-2 h-2 rounded-full ${k8sBadge.dot}`} />
                  {k8sBadge.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Ready</span>
                <span className="text-on-surface">
                  {status.k8sStatus?.ready ? "Yes" : "No"}
                </span>
              </div>
              {status.k8sStatus?.replicas !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Replicas</span>
                  <span className="text-on-surface">
                    {status.k8sStatus?.readyReplicas || 0} /{" "}
                    {status.k8sStatus?.replicas}
                  </span>
                </div>
              )}
              {status.k8sStatus?.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                  {status.k8sStatus.error}
                </div>
              )}
            </div>
          ) : (
            <p className="text-on-surface-variant">
              Kubernetes status not available
            </p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-surface border border-outline rounded-lg p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {status.publicUrl && (
            <div>
              <span className="text-on-surface-variant text-sm">
                Public URL
              </span>
              <p className="text-on-surface">
                <a
                  href={status.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {status.publicUrl}
                </a>
              </p>
            </div>
          )}
          <div>
            <span className="text-on-surface-variant text-sm">Created At</span>
            <p className="text-on-surface">
              {new Date(status.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-on-surface-variant text-sm">Updated At</span>
            <p className="text-on-surface">
              {new Date(status.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Logs Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-on-surface">
          Container Logs
        </h2>
        <Suspense
          fallback={
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          }
        >
          <LogsViewer podId={id} />
        </Suspense>
      </div>
    </div>
  );
}

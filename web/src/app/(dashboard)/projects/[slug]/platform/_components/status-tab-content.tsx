"use client";

import Link from "next/link";
import type { EnvironmentCR } from "@/types/crd";

interface StatusTabContentProps {
  environment: EnvironmentCR;
  projectSlug: string;
}

export function StatusTabContent({
  environment,
  projectSlug,
}: StatusTabContentProps) {
  const { metadata, spec, status } = environment;
  const envName = metadata.name;
  const branchName = spec.source.branch;
  const previewUrl = status?.url;

  // Calculate namespace and pod name (matching operator logic)
  const targetNamespace = `env-${envName}`;
  const commitPart = spec.source.commitSha?.substring(0, 7) || "unknown";
  const podName = `workspace-${spec.projectRef.name}-${commitPart.toLowerCase()}`;

  return (
    <div className="space-y-4">
      {/* Preview URL */}
      {previewUrl && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-variant/30">
          <div>
            <span className="text-sm font-medium text-on-surface">
              Preview URL
            </span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-primary hover:underline truncate max-w-md"
            >
              {previewUrl}
            </a>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            Open
          </a>
        </div>
      )}

      {/* Branch */}
      <div className="p-3 rounded-lg bg-surface-variant/30">
        <span className="text-sm font-medium text-on-surface">Branch</span>
        <p className="text-sm text-on-surface-variant font-mono">
          {branchName}
        </p>
      </div>

      {/* Infrastructure Info */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3 rounded-lg bg-surface-variant/30">
          <span className="text-sm font-medium text-on-surface">Namespace</span>
          <p className="text-sm text-on-surface-variant font-mono">
            {targetNamespace}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-surface-variant/30">
          <span className="text-sm font-medium text-on-surface">Pod</span>
          <p className="text-sm text-on-surface-variant font-mono truncate">
            {podName}
          </p>
        </div>
      </div>

      {/* View Details Link */}
      <div className="pt-2 border-t border-outline/30">
        <Link
          href={`/projects/${projectSlug}/env/${envName}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          View full details
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

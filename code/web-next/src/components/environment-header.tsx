import { StatusBadge } from "./ui/status-badge";

export interface EnvironmentHeaderProps {
  /**
   * Branch name or environment name
   */
  branchName: string;
  /**
   * Environment status
   */
  status: string;
  /**
   * Preview URL (optional)
   */
  previewUrl?: string;
  /**
   * Kubernetes namespace
   */
  targetNamespace: string;
  /**
   * Pod name
   */
  podName: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * EnvironmentHeader - A molecule component for displaying environment header information
 *
 * Shows the environment name, status, preview URL, and Kubernetes metadata.
 * Provides a link to open the preview environment in a new tab.
 *
 * @example
 * ```tsx
 * <EnvironmentHeader
 *   branchName="feat/preview-environments"
 *   status="Ready"
 *   previewUrl="https://pr-42.preview.example.com"
 *   targetNamespace="env-catalyst-web-feat-preview-environments"
 *   podName="workspace-catalyst-web-abc1234"
 * />
 *
 * <EnvironmentHeader
 *   branchName="main"
 *   status="Deploying"
 *   targetNamespace="env-catalyst-web-production"
 *   podName="workspace-catalyst-web-main1234"
 * />
 * ```
 */
export function EnvironmentHeader({
  branchName,
  status,
  previewUrl,
  targetNamespace,
  podName,
  className,
}: EnvironmentHeaderProps) {
  return (
    <div className={className}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">
            Preview Environment
          </h2>
          <h1 className="text-xl font-bold text-on-surface mt-1">
            {branchName}
          </h1>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-on-surface-variant hover:text-primary mt-1 block"
            >
              {previewUrl}
            </a>
          )}
          <div className="text-xs text-on-surface-variant mt-2 font-mono">
            Namespace: {targetNamespace} <br />
            Pod: {podName}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
            >
              Open Preview
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

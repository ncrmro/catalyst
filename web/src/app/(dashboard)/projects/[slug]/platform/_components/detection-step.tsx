"use client";

import { useState, useEffect } from "react";
import { reDetectProject } from "@/actions/project-detection";
import type {
  EnvironmentConfig,
  ProjectType,
  DetectionConfidence,
} from "@/types/environment-config";
import { cn } from "@/lib/utils";

/**
 * Get human-readable label for project type
 */
function getProjectTypeLabel(projectType: ProjectType): string {
  switch (projectType) {
    case "docker-compose":
      return "Docker Compose";
    case "dockerfile":
      return "Dockerfile";
    case "nodejs":
      return "Node.js";
    case "makefile":
      return "Makefile";
    case "unknown":
      return "Unknown";
  }
}

/**
 * Get badge color classes for confidence level
 */
function getConfidenceBadgeClasses(confidence: DetectionConfidence): string {
  switch (confidence) {
    case "high":
      return "bg-success-container text-on-success-container";
    case "medium":
      return "bg-warning-container text-on-warning-container";
    case "low":
      return "bg-error-container text-on-error-container";
  }
}

/**
 * Get icon for file type
 */
function getFileIcon(filename: string): string {
  if (filename === "docker-compose.yml" || filename === "compose.yml") {
    return "🐳";
  }
  if (filename === "Dockerfile") {
    return "📦";
  }
  if (filename === "package.json") {
    return "📄";
  }
  if (filename === "Makefile") {
    return "🔨";
  }
  return "📁";
}

interface DetectionStepProps {
  projectId: string;
  repoId: string;
  repoFullName: string;
  environmentName: string;
  initialConfig?: EnvironmentConfig | null;
  initialWorkdir?: string;
  onConfigSelected: (config: EnvironmentConfig) => void;
}

export function DetectionStep({
  projectId,
  repoId,
  repoFullName,
  environmentName,
  initialConfig,
  initialWorkdir,
  onConfigSelected,
}: DetectionStepProps) {
  const [workdir, setWorkdir] = useState(initialWorkdir || "/");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionState, setDetectionState] = useState<{
    config: EnvironmentConfig | null;
    files: string[];
    version: number;
  }>({
    config: initialConfig || null,
    files: [],
    version: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [filesExpanded, setFilesExpanded] = useState(false);

  // Extract values for easier access
  const detectedConfig = detectionState.config;
  const detectedFiles = detectionState.files;

  // Sync with initialConfig when it changes
  useEffect(() => {
    if (initialConfig && initialConfig !== detectionState.config) {
      setDetectionState((prev) => ({
        config: initialConfig,
        files: prev.files,
        version: prev.version + 1,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig]);

  const handleReDetect = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      const result = await reDetectProject(
        projectId,
        repoId,
        repoFullName,
        environmentName,
        workdir,
      );

      if (process.env.NODE_ENV === "development") {
        console.log("Detection result:", result);
      }

      if (!result.success) {
        setError(result.error || "Detection failed");
        return;
      }

      // Update detection state as a single atomic update
      setDetectionState((prev) => {
        const newVersion = prev.version + 1;
        if (process.env.NODE_ENV === "development") {
          console.log("State updated successfully, version:", newVersion);
        }
        return {
          config: result.config || null,
          files: result.detectedFiles || [],
          version: newVersion,
        };
      });
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Detection error:", err);
      }
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleContinue = () => {
    if (detectedConfig) {
      onConfigSelected(detectedConfig);
    }
  };

  const hasSuccessfulDetection =
    detectedConfig &&
    detectedConfig.projectType &&
    detectedConfig.projectType !== "unknown";

  const hasFailedDetection =
    detectedConfig && detectedConfig.projectType === "unknown";

  return (
    <div className="space-y-6">
      {/* Directory Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-on-surface">
          🔍 Project Detection
        </h4>
        <p className="text-sm text-on-surface-variant">
          Specify the directory to search for project configuration files. Leave
          empty or use &quot;/&quot; for the repository root. For monorepos,
          specify a subdirectory path without leading slashes (e.g.,
          &quot;web&quot;, &quot;apps/frontend&quot;).
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={workdir}
            onChange={(e) => setWorkdir(e.target.value)}
            placeholder="/"
            className="flex-1 px-3 py-2 text-sm rounded-md border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleReDetect}
            disabled={isDetecting}
            className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
          >
            {isDetecting ? "Detecting..." : "🔄 Re-detect"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-md bg-error/10 text-error border border-error/20 text-sm">
          {error}
        </div>
      )}

      {/* Detection Result - Success */}
      {hasSuccessfulDetection && detectedConfig && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 flex-shrink-0">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-on-surface">
                  ✨ Detected:{" "}
                  {getProjectTypeLabel(detectedConfig.projectType!)}
                </span>
                {detectedConfig.confidence && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full",
                      getConfidenceBadgeClasses(detectedConfig.confidence),
                    )}
                  >
                    {detectedConfig.confidence} confidence
                  </span>
                )}
              </div>

              {detectedConfig.devCommand && (
                <div className="text-sm">
                  <span className="text-on-surface-variant">Dev command: </span>
                  <code className="px-1.5 py-0.5 bg-surface rounded text-xs font-mono text-on-surface">
                    {detectedConfig.devCommand}
                  </code>
                </div>
              )}

              {detectedConfig.packageManager && (
                <div className="text-sm text-on-surface-variant">
                  Package manager: {detectedConfig.packageManager}
                </div>
              )}

              {detectedConfig.workdir && (
                <div className="text-sm text-on-surface-variant">
                  Working directory: {detectedConfig.workdir}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detected Files - Collapsible */}
      {detectedFiles.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setFilesExpanded(!filesExpanded)}
            className="flex items-center gap-2 w-full text-left text-sm font-medium text-on-surface hover:text-primary transition-colors"
          >
            <svg
              className={cn(
                "w-4 h-4 transition-transform",
                filesExpanded ? "rotate-90" : "",
              )}
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
            <span>📁 Detected Files ({detectedFiles.length})</span>
          </button>
          {filesExpanded && (
            <div className="grid grid-cols-2 gap-2 pl-6">
              {detectedFiles.map((file) => (
                <div
                  key={file}
                  className="flex items-center gap-2 p-2 rounded-md bg-surface-container text-sm"
                >
                  <span>{getFileIcon(file)}</span>
                  <span className="text-on-surface font-mono">{file}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detection Result - Failed */}
      {hasFailedDetection && (
        <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/20">
              <svg
                className="w-4 h-4 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-medium text-on-surface">
                Could not auto-detect project type
              </span>
              <p className="text-sm text-on-surface-variant mt-1">
                No recognized configuration files found. Try a different
                directory or configure manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      {detectedConfig && (
        <div className="flex justify-end pt-4 border-t border-outline/30">
          <button
            type="button"
            onClick={handleContinue}
            className="px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
          >
            Continue with Configuration →
          </button>
        </div>
      )}

      {/* Initial State Help Text */}
      {!detectedConfig && !isDetecting && !error && (
        <div className="text-center py-8 text-sm text-on-surface-variant">
          <p>
            Click &quot;Re-detect&quot; to scan the repository for configuration
            files.
          </p>
        </div>
      )}
    </div>
  );
}

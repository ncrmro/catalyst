"use client";

import { useState } from "react";
import { DetectionStep } from "./detection-step";
import { DevelopmentConfigForm } from "./development-config-form";
import { DeploymentConfigForm } from "./deployment-config-form";
import type { EnvironmentConfig } from "@/types/environment-config";
import type { ProjectConfig } from "@/types/project-config";

interface DetectionFlowProps {
  projectId: string;
  repoId: string;
  repoFullName: string;
  environmentName: string;
  environmentType: "deployment" | "development";
  initialConfig?: EnvironmentConfig | null;
  projectConfig?: ProjectConfig | null;
}

/**
 * Client component that manages the detection flow:
 * 1. Show DetectionStep for directory selection and re-detection
 * 2. Once config is selected, show the appropriate config form
 */
export function DetectionFlow({
  projectId,
  repoId,
  repoFullName,
  environmentName,
  environmentType,
  initialConfig,
  projectConfig,
}: DetectionFlowProps) {
  const [selectedConfig, setSelectedConfig] =
    useState<EnvironmentConfig | null>(initialConfig || null);
  const [showConfigForm, setShowConfigForm] = useState(
    initialConfig?.projectType !== undefined &&
      initialConfig?.projectType !== "unknown",
  );

  const handleConfigSelected = (config: EnvironmentConfig) => {
    setSelectedConfig(config);
    setShowConfigForm(true);
  };

  const handleBackToDetection = () => {
    setShowConfigForm(false);
  };

  // Show detection step if no config selected or user wants to go back
  if (!showConfigForm) {
    return (
      <DetectionStep
        projectId={projectId}
        repoId={repoId}
        repoFullName={repoFullName}
        environmentName={environmentName}
        initialConfig={selectedConfig}
        onConfigSelected={handleConfigSelected}
      />
    );
  }

  // Show config form after detection
  return (
    <div className="space-y-4">
      {/* Back to Detection Button */}
      <button
        type="button"
        onClick={handleBackToDetection}
        className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
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
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span>Back to Detection</span>
      </button>

      {/* Config Form */}
      {environmentType === "deployment" ? (
        <DeploymentConfigForm
          projectId={projectId}
          projectConfig={projectConfig}
          environmentConfig={selectedConfig}
        />
      ) : (
        <DevelopmentConfigForm
          projectId={projectId}
          environmentName={environmentName}
          config={selectedConfig}
        />
      )}
    </div>
  );
}

import { runProjectDetection } from "@/actions/project-detection";
import { DevelopmentConfigForm } from "./development-config-form";
import { DeploymentConfigForm } from "./deployment-config-form";
import type { ProjectConfig } from "@/types/project-config";

interface DetectionWrapperProps {
  projectId: string;
  repoId: string;
  repoFullName: string;
  environmentName: string;
  environmentType: "deployment" | "development";
  projectConfig?: ProjectConfig | null;
}

/**
 * Async server component that runs project detection and renders the appropriate form.
 *
 * This component is designed to be wrapped in a Suspense boundary to show a loading
 * state while detection runs.
 */
export async function DetectionWrapper({
  projectId,
  repoId,
  repoFullName,
  environmentName,
  environmentType,
  projectConfig,
}: DetectionWrapperProps) {
  const environmentConfig = await runProjectDetection(
    projectId,
    repoId,
    repoFullName,
    environmentName,
  );

  if (environmentType === "deployment") {
    return (
      <DeploymentConfigForm
        projectId={projectId}
        projectConfig={projectConfig}
        environmentConfig={environmentConfig}
      />
    );
  }

  return (
    <DevelopmentConfigForm
      projectId={projectId}
      environmentName={environmentName}
      config={environmentConfig}
    />
  );
}

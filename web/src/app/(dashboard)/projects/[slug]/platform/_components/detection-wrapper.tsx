import { runProjectDetection } from "@/actions/project-detection";
import { DetectionFlow } from "./detection-flow";
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
 * Async server component that runs initial project detection and renders the detection flow.
 *
 * This component is designed to be wrapped in a Suspense boundary to show a loading
 * state while the initial detection runs. After that, the client-side DetectionFlow
 * component handles directory changes and re-detection.
 */
export async function DetectionWrapper({
  projectId,
  repoId,
  repoFullName,
  environmentName,
  environmentType,
  projectConfig,
}: DetectionWrapperProps) {
  // Run initial detection server-side for SSR
  const environmentConfig = await runProjectDetection(
    projectId,
    repoId,
    repoFullName,
    environmentName,
  );

  // Render client component that handles the interactive detection flow
  return (
    <DetectionFlow
      projectId={projectId}
      repoId={repoId}
      repoFullName={repoFullName}
      environmentName={environmentName}
      environmentType={environmentType}
      initialConfig={environmentConfig}
      projectConfig={projectConfig}
    />
  );
}

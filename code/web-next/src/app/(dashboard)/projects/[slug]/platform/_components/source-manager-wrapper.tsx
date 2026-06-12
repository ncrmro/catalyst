"use client";

import { SourceManager } from "./source-manager";
import { updateProjectSources } from "@/actions/project-sources";
import type { SourceConfig } from "@/types/crd";

interface SourceManagerWrapperProps {
  projectId: string;
  initialSources: SourceConfig[];
}

/**
 * Client component wrapper for SourceManager that handles server action callback
 */
export function SourceManagerWrapper({
  projectId,
  initialSources,
}: SourceManagerWrapperProps) {
  const handleSave = async (sources: SourceConfig[]) => {
    return await updateProjectSources(projectId, sources);
  };

  return <SourceManager initialSources={initialSources} onSave={handleSave} />;
}

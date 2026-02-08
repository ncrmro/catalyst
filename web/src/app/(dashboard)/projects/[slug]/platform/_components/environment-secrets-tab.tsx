"use client";

import { TemplateSecretsSection } from "./template-secrets-section";
import type { SecretEnvironmentType } from "@/types/secrets";

interface EnvironmentSecretsTabProps {
  teamId: string;
  projectId: string;
  environmentType: SecretEnvironmentType;
}

/**
 * Secrets tab for the platform page.
 * Shows only template-level secrets (deployment/development defaults).
 * Environment-specific overrides are managed on the individual environment detail pages.
 */
export function EnvironmentSecretsTab({
  teamId,
  projectId,
  environmentType,
}: EnvironmentSecretsTabProps) {
  return (
    <TemplateSecretsSection
      teamId={teamId}
      projectId={projectId}
      environmentType={environmentType}
    />
  );
}

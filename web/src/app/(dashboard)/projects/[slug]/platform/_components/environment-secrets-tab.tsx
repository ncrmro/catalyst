"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SecretList } from "@/components/secrets/secret-list";
import { SecretForm } from "@/components/secrets/secret-form";
import { DeleteSecretDialog } from "@/components/secrets/delete-secret-dialog";
import {
  listSecrets,
  createSecret,
  updateSecret,
  deleteSecret as deleteSecretAction,
} from "@/actions/secrets";
import { getProjectEnvironmentsMap } from "@/actions/environments";
import { TemplateSecretsSection } from "./template-secrets-section";
import type { EnvironmentCR } from "@/types/crd";
import type {
  MaskedSecret,
  SecretScope,
  CreateSecretInput,
  UpdateSecretInput,
  SecretEnvironmentType,
} from "@/types/secrets";

interface EnvironmentSecretsTabProps {
  environments: EnvironmentCR[];
  projectSlug: string;
  teamId: string;
  projectId: string;
  environmentType: SecretEnvironmentType;
}

export function EnvironmentSecretsTab({
  environments,
  projectSlug,
  teamId,
  projectId,
  environmentType,
}: EnvironmentSecretsTabProps) {
  const [envMap, setEnvMap] = useState<Record<string, string>>({});
  const [selectedEnvName, setSelectedEnvName] = useState<string | null>(
    environments.length > 0 ? (environments[0]?.metadata.name ?? null) : null,
  );

  const [projectSecrets, setProjectSecrets] = useState<MaskedSecret[]>([]);
  const [templateSecrets, setTemplateSecrets] = useState<MaskedSecret[]>([]);
  const [envSecrets, setEnvSecrets] = useState<MaskedSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load environment mapping (name -> DB ID)
  useEffect(() => {
    const loadMap = async () => {
      const map = await getProjectEnvironmentsMap(projectSlug);
      setEnvMap(map);
    };
    loadMap();
  }, [projectSlug]);

  const selectedEnvId = selectedEnvName ? envMap[selectedEnvName] : null;

  const loadSecrets = useCallback(async () => {
    if (!teamId || !projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Load project secrets (inherited)
      const projectScope: SecretScope = { level: "project", teamId, projectId };
      const projectResult = await listSecrets(projectScope);

      if (projectResult.success) {
        setProjectSecrets(projectResult.data);
      }

      // 2. Load template secrets (inherited)
      const templateScope: SecretScope = {
        level: "template",
        teamId,
        projectId,
        environmentType,
      };
      const templateResult = await listSecrets(templateScope);

      if (templateResult.success) {
        setTemplateSecrets(templateResult.data);
      }

      // 3. Load environment secrets (if env selected)
      if (selectedEnvId) {
        const envScope: SecretScope = {
          level: "environment",
          teamId,
          projectId,
          environmentId: selectedEnvId,
        };
        const envResult = await listSecrets(envScope);
        if (envResult.success) {
          setEnvSecrets(envResult.data);
        } else {
          setEnvSecrets([]);
        }
      } else {
        setEnvSecrets([]);
      }
    } catch (err) {
      console.error("Failed to load secrets:", err);
      setError("Failed to load secrets");
    } finally {
      setIsLoading(false);
    }
  }, [teamId, projectId, selectedEnvId, environmentType]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const handleCreate = async (data: CreateSecretInput | UpdateSecretInput) => {
    if (!selectedEnvId) return;
    if (!("name" in data) || !("value" in data)) return;

    setIsSubmitting(true);
    const scope: SecretScope = {
      level: "environment",
      teamId,
      projectId,
      environmentId: selectedEnvId,
    };

    const result = await createSecret(scope, data as CreateSecretInput);
    if (result.success) {
      setShowForm(false);
      await loadSecrets();
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async (data: CreateSecretInput | UpdateSecretInput) => {
    if (!selectedEnvId || !editingSecret) return;

    setIsSubmitting(true);
    const scope: SecretScope = {
      level: "environment",
      teamId,
      projectId,
      environmentId: selectedEnvId,
    };

    const result = await updateSecret(
      scope,
      editingSecret,
      data as UpdateSecretInput,
    );
    if (result.success) {
      setEditingSecret(null);
      await loadSecrets();
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedEnvId || !deletingSecret) return;

    const scope: SecretScope = {
      level: "environment",
      teamId,
      projectId,
      environmentId: selectedEnvId,
    };

    const result = await deleteSecretAction(scope, deletingSecret);
    if (result.success) {
      setDeletingSecret(null);
      await loadSecrets();
    } else {
      setError(result.error);
    }
  };

  // Combine secrets for display, marking overrides
  const combinedSecrets = useMemo(() => {
    const envSecretNames = new Set(envSecrets.map((s) => s.name));
    const templateSecretNames = new Set(templateSecrets.map((s) => s.name));

    // Process project secrets
    const projectItems = projectSecrets.map((s) => ({
      ...s,
      isOverridden: envSecretNames.has(s.name) || templateSecretNames.has(s.name),
      isInherited: true,
      sourceDisplay: "Project",
    }));

    // Process template secrets
    const templateItems = templateSecrets.map((s) => ({
      ...s,
      isOverridden: envSecretNames.has(s.name),
      isInherited: true,
      sourceDisplay: "Template",
    }));

    // Process environment secrets
    const envItems = envSecrets.map((s) => {
      const isTemplateOverride = templateSecrets.some((ps) => ps.name === s.name);
      const isProjectOverride = projectSecrets.some((ps) => ps.name === s.name);
      return {
        ...s,
        isOverride: isTemplateOverride || isProjectOverride,
        overrideType: isTemplateOverride ? "Template" : "Project",
        isInherited: false,
        sourceDisplay: "Environment",
      };
    });

    return [
      ...envItems,
      ...templateItems.filter((p) => !p.isOverridden),
      ...projectItems.filter((p) => !p.isOverridden),
    ];
  }, [projectSecrets, templateSecrets, envSecrets]);

  return (
    <div className="space-y-8">
      {/* 1. Template-Level Secrets (Always Editable) */}
      <TemplateSecretsSection
        teamId={teamId}
        projectId={projectId}
        environmentType={environmentType}
      />

      <div className="border-t border-outline/30 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
            Environment-Specific Overrides
          </h3>
          {selectedEnvId && !showForm && !editingSecret && (
            <button
              onClick={() => setShowForm(true)}
              className="px-2 py-1 text-xs bg-primary text-on-primary rounded hover:bg-primary-hover"
            >
              + Add Override
            </button>
          )}
        </div>

        {environments.length === 0 ? (
          <div className="py-8 text-center bg-surface-variant/20 rounded-lg">
            <p className="text-sm text-on-surface-variant">
              No environments exist. Overrides can be managed once an environment is created.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <label
                htmlFor="env-selector"
                className="text-sm font-medium text-on-surface"
              >
                Environment:
              </label>
              <select
                id="env-selector"
                value={selectedEnvName || ""}
                onChange={(e) => setSelectedEnvName(e.target.value)}
                className="bg-surface border border-outline rounded-md px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {environments.map((env) => (
                  <option key={env.metadata.name} value={env.metadata.name}>
                    {env.metadata.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-error-container border border-error rounded-lg p-3">
                <p className="text-sm text-on-error-container">{error}</p>
              </div>
            )}

            {showForm && (
              <div className="bg-surface border border-outline rounded-lg p-4">
                <h3 className="text-md font-semibold text-on-surface mb-4">
                  New Secret for {selectedEnvName}
                </h3>
                <SecretForm
                  mode="create"
                  onSubmit={handleCreate}
                  onCancel={() => setShowForm(false)}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {editingSecret && (
              <div className="bg-surface border border-outline rounded-lg p-4">
                <h3 className="text-md font-semibold text-on-surface mb-4">
                  Edit Secret: {editingSecret}
                </h3>
                <SecretForm
                  mode="edit"
                  initialData={envSecrets.find((s) => s.name === editingSecret)}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingSecret(null)}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {!selectedEnvId && !isLoading && (
              <div className="p-4 bg-warning-container text-on-warning-container rounded-lg text-sm">
                Warning: This environment is not yet synced to the database. You
                cannot manage environment-level secrets until it is initialized.
              </div>
            )}

            <div className="bg-surface border border-outline rounded-lg overflow-hidden">
              <SecretList
                secrets={combinedSecrets}
                onEdit={(name) => {
                  const isEnvSecret = envSecrets.some((s) => s.name === name);
                  if (isEnvSecret) setEditingSecret(name);
                }}
                onDelete={(name) => {
                  const isEnvSecret = envSecrets.some((s) => s.name === name);
                  if (isEnvSecret) setDeletingSecret(name);
                }}
                isLoading={isLoading}
                renderCustomActions={(secret) => {
                  const typedSecret = secret as any;
                  if (typedSecret.isInherited) {
                    return (
                      <span className="text-xs px-2 py-0.5 bg-surface-variant text-on-surface-variant rounded-full">
                        Inherited from {typedSecret.sourceDisplay}
                      </span>
                    );
                  }

                  if (typedSecret.isOverride) {
                    return (
                      <span className="text-xs px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full">
                        Overrides {typedSecret.overrideType}
                      </span>
                    );
                  }

                  return null;
                }}
              />
            </div>
          </div>
        )}
      </div>

      <DeleteSecretDialog
        secretName={deletingSecret || ""}
        isOpen={!!deletingSecret}
        onConfirm={handleDelete}
        onCancel={() => setDeletingSecret(null)}
      />
    </div>
  );
}
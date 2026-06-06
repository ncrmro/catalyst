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
import type {
  MaskedSecret,
  SecretScope,
  CreateSecretInput,
  UpdateSecretInput,
  SecretEnvironmentType,
} from "@/types/secrets";

interface EnvironmentSecretsCardProps {
  teamId: string;
  projectId: string;
  environmentId: string;
  environmentType: SecretEnvironmentType;
}

export function EnvironmentSecretsCard({
  teamId,
  projectId,
  environmentId,
  environmentType,
}: EnvironmentSecretsCardProps) {
  const [projectSecrets, setProjectSecrets] = useState<MaskedSecret[]>([]);
  const [templateSecrets, setTemplateSecrets] = useState<MaskedSecret[]>([]);
  const [envSecrets, setEnvSecrets] = useState<MaskedSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSecrets = useCallback(async () => {
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

      // 3. Load environment secrets
      const envScope: SecretScope = {
        level: "environment",
        teamId,
        projectId,
        environmentId,
      };
      const envResult = await listSecrets(envScope);
      if (envResult.success) {
        setEnvSecrets(envResult.data);
      } else {
        setEnvSecrets([]);
      }
    } catch (err) {
      console.error("Failed to load secrets:", err);
      setError("Failed to load secrets");
    } finally {
      setIsLoading(false);
    }
  }, [teamId, projectId, environmentId, environmentType]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const handleCreate = async (data: CreateSecretInput | UpdateSecretInput) => {
    if (!("name" in data) || !("value" in data)) return;

    setIsSubmitting(true);
    const scope: SecretScope = {
      level: "environment",
      teamId,
      projectId,
      environmentId,
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
    if (!editingSecret) return;

    setIsSubmitting(true);
    const scope: SecretScope = {
      level: "environment",
      teamId,
      projectId,
      environmentId,
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
    if (!deletingSecret) return;

    const scope: SecretScope = {
      level: "environment",
      teamId,
      projectId,
      environmentId,
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
      isOverridden:
        envSecretNames.has(s.name) || templateSecretNames.has(s.name),
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
      const isTemplateOverride = templateSecrets.some(
        (ps) => ps.name === s.name,
      );
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">
          Secrets available to this environment. Environment-level secrets
          override inherited defaults.
        </p>
        {!showForm && !editingSecret && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-xs bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            + Add Override
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error-container border border-error rounded-lg p-3">
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-surface-container border border-outline/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-on-surface mb-4">
            New Environment Secret
          </h4>
          <SecretForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {editingSecret && (
        <div className="bg-surface-container border border-outline/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-on-surface mb-4">
            Edit Secret: {editingSecret}
          </h4>
          <SecretForm
            mode="edit"
            initialData={envSecrets.find((s) => s.name === editingSecret)}
            onSubmit={handleUpdate}
            onCancel={() => setEditingSecret(null)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      <div className="bg-surface border border-outline/50 rounded-lg overflow-hidden">
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
            const typedSecret = secret as (typeof combinedSecrets)[number];
            if (typedSecret.isInherited) {
              return (
                <span className="text-xs px-2 py-0.5 bg-surface-variant text-on-surface-variant rounded-full">
                  Inherited from {typedSecret.sourceDisplay}
                </span>
              );
            }

            if ("isOverride" in typedSecret && typedSecret.isOverride) {
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

      <DeleteSecretDialog
        secretName={deletingSecret || ""}
        isOpen={!!deletingSecret}
        onConfirm={handleDelete}
        onCancel={() => setDeletingSecret(null)}
      />
    </div>
  );
}

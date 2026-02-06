"use client";

import { useState, useEffect, useCallback } from "react";
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

interface TemplateSecretsSectionProps {
  teamId: string;
  projectId: string;
  environmentType: SecretEnvironmentType;
}

export function TemplateSecretsSection({
  teamId,
  projectId,
  environmentType,
}: TemplateSecretsSectionProps) {
  const [secrets, setSecrets] = useState<MaskedSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSecrets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const scope: SecretScope = {
      level: "template",
      teamId,
      projectId,
      environmentType,
    };

    const result = await listSecrets(scope);

    if (result.success) {
      setSecrets(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [teamId, projectId, environmentType]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const handleCreate = async (data: CreateSecretInput | UpdateSecretInput) => {
    if (!("name" in data) || !("value" in data)) return;

    setIsSubmitting(true);
    const scope: SecretScope = {
      level: "template",
      teamId,
      projectId,
      environmentType,
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
      level: "template",
      teamId,
      projectId,
      environmentType,
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
      level: "template",
      teamId,
      projectId,
      environmentType,
    };

    const result = await deleteSecretAction(scope, deletingSecret);
    if (result.success) {
      setDeletingSecret(null);
      await loadSecrets();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
            {environmentType === "deployment" ? "Deployment" : "Development"} Defaults
          </h3>
          <p className="text-xs text-on-surface-variant">
            Secrets applied to all {environmentType} environments.
          </p>
        </div>
        {!showForm && !editingSecret && (
          <button
            onClick={() => setShowForm(true)}
            className="px-2 py-1 text-xs bg-secondary text-on-secondary rounded hover:bg-secondary-hover"
          >
            + Add Default
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error-container border border-error rounded p-2 text-xs">
          <p className="text-on-error-container">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-surface border border-outline rounded-lg p-4">
          <h4 className="text-sm font-semibold text-on-surface mb-4">
            New {environmentType} Default Secret
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
        <div className="bg-surface border border-outline rounded-lg p-4">
          <h4 className="text-sm font-semibold text-on-surface mb-4">
            Edit Default: {editingSecret}
          </h4>
          <SecretForm
            mode="edit"
            initialData={secrets.find((s) => s.name === editingSecret)}
            onSubmit={handleUpdate}
            onCancel={() => setEditingSecret(null)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      <div className="bg-surface border border-outline rounded-lg overflow-hidden">
        <SecretList
          secrets={secrets}
          onEdit={setEditingSecret}
          onDelete={setDeletingSecret}
          isLoading={isLoading}
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

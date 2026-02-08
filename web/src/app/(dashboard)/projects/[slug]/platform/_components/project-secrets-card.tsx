"use client";

import { useState, useEffect, useCallback } from "react";
import { SecretList } from "@/components/secrets/secret-list";
import { SecretForm } from "@/components/secrets/secret-form";
import { DeleteSecretDialog } from "@/components/secrets/delete-secret-dialog";
import { GlassCard } from "@tetrastack/react-glass-components";
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
} from "@/types/secrets";

interface ProjectSecretsCardProps {
  teamId: string;
  projectId: string;
}

export function ProjectSecretsCard({
  teamId,
  projectId,
}: ProjectSecretsCardProps) {
  const [secrets, setSecrets] = useState<MaskedSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadSecrets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const scope: SecretScope = {
      level: "project",
      teamId,
      projectId,
    };

    const result = await listSecrets(scope);

    if (result.success) {
      setSecrets(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [teamId, projectId]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const handleCreate = async (data: CreateSecretInput | UpdateSecretInput) => {
    // Type guard to ensure this is CreateSecretInput
    if (!("name" in data) || !("value" in data)) {
      setError("Invalid secret data");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const scope: SecretScope = {
      level: "project",
      teamId,
      projectId,
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
    setError(null);

    const scope: SecretScope = {
      level: "project",
      teamId,
      projectId,
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
      level: "project",
      teamId,
      projectId,
    };

    const result = await deleteSecretAction(scope, deletingSecret);

    if (result.success) {
      setDeletingSecret(null);
      await loadSecrets();
    } else {
      setError(result.error);
    }
  };

  const editingSecretData = secrets.find((s) => s.name === editingSecret);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">
            Project Secrets
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Secrets inherited by all environments. Environment-specific secrets
            can override these.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showForm && !editingSecret && (
            <button
              onClick={() => {
                setShowForm(true);
                setIsExpanded(true);
              }}
              className="px-3 py-1.5 text-sm bg-primary text-on-primary rounded-md hover:bg-primary-hover"
            >
              + Add Secret
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
          >
            <svg
              className={`w-6 h-6 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-6 pt-4 border-t border-outline/30">
          {error && (
            <div className="bg-error-container border border-error rounded-lg p-3">
              <p className="text-sm text-on-error-container">{error}</p>
            </div>
          )}

          {showForm && (
            <div className="bg-surface border border-outline rounded-lg p-4">
              <h3 className="text-md font-semibold text-on-surface mb-4">
                Create New Secret
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
                initialData={editingSecretData}
                onSubmit={handleUpdate}
                onCancel={() => setEditingSecret(null)}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          <div className="bg-surface border border-outline rounded-lg overflow-hidden">
            <SecretList
              secrets={secrets}
              onEdit={(name) => {
                setEditingSecret(name);
                setIsExpanded(true);
              }}
              onDelete={(name) => setDeletingSecret(name)}
              isLoading={isLoading}
            />
          </div>

          <div className="bg-surface-variant/30 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Security Info
            </h4>
            <ul className="text-xs text-on-surface-variant space-y-1 list-disc list-inside">
              <li>Secrets are encrypted at rest using AES-256-GCM.</li>
              <li>Inherited by all environments unless overridden.</li>
              <li>Redeploy environments for changes to take effect.</li>
            </ul>
          </div>
        </div>
      )}

      <DeleteSecretDialog
        secretName={deletingSecret || ""}
        isOpen={!!deletingSecret}
        onConfirm={handleDelete}
        onCancel={() => setDeletingSecret(null)}
      />
    </GlassCard>
  );
}

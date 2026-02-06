"use client";

/**
 * Project Secrets Page
 *
 * Allows viewing, creating, editing, and deleting project-level secrets.
 * Secrets are inherited by all environments in the project.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { SecretList } from "@/components/secrets/secret-list";
import { SecretForm } from "@/components/secrets/secret-form";
import { DeleteSecretDialog } from "@/components/secrets/delete-secret-dialog";
import { fetchProjectBySlug } from "@/actions/projects";
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

export default function ProjectSecretsPage() {
  const params = useParams();
  const projectSlug = params.slug as string;

  const [secrets, setSecrets] = useState<MaskedSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [teamId, setTeamId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        console.log(`Fetching project data for slug: ${projectSlug}`);
        const project = await fetchProjectBySlug(projectSlug);
        if (project) {
          console.log(
            `Successfully fetched project: ${project.id} for team: ${project.teamId}`,
          );
          setTeamId(project.teamId);
          setProjectId(project.id);
        } else {
          console.warn(`Project not found for slug: ${projectSlug}`);
          setError("Project not found");
        }
      } catch (err) {
        console.error("Failed to fetch project data:", err);
        setError(
          `Failed to load project data: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };

    fetchProjectData();
  }, [projectSlug]);

  const loadSecrets = useCallback(async () => {
    if (!teamId || !projectId) return;

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
    if (teamId && projectId) {
      loadSecrets();
    }
  }, [teamId, projectId, loadSecrets]);

  const handleCreate = async (data: CreateSecretInput | UpdateSecretInput) => {
    if (!teamId || !projectId) return;

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
    if (!teamId || !projectId || !editingSecret) return;

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
    if (!teamId || !projectId || !deletingSecret) return;

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

  if (!teamId || !projectId) {
    return (
      <div className="p-6">
        <p className="text-on-surface-variant">Loading project data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">
              Project Secrets
            </h1>
            <p className="text-on-surface-variant mt-2">
              Manage secrets that will be available to all environments in this
              project.
            </p>
          </div>
          {!showForm && !editingSecret && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-hover"
            >
              + Add Secret
            </button>
          )}
        </div>

        {error && (
          <div className="bg-error-container border border-error rounded-lg p-4 mb-4">
            <p className="text-on-error-container">{error}</p>
          </div>
        )}

        <div className="bg-surface-variant rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-2">
            About Project Secrets
          </h3>
          <ul className="text-sm text-on-surface-variant space-y-1 list-disc list-inside">
            <li>Secrets are encrypted at rest using AES-256-GCM encryption</li>
            <li>
              Project secrets are inherited by all environments in this project
            </li>
            <li>Environment-specific secrets can override project secrets</li>
            <li>
              Changes to secrets require redeployment of environments to take
              effect
            </li>
          </ul>
        </div>
      </div>

      {showForm && (
        <div className="bg-surface border border-outline rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-on-surface mb-4">
            Create New Secret
          </h2>
          <SecretForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {editingSecret && (
        <div className="bg-surface border border-outline rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-on-surface mb-4">
            Edit Secret: {editingSecret}
          </h2>
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
          onEdit={(name) => setEditingSecret(name)}
          onDelete={(name) => setDeletingSecret(name)}
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

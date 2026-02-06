"use client";

/**
 * Secret List Component
 *
 * Displays a list of secrets with masked values.
 * Shows secret name, source (team/project/environment), and actions.
 */

import type { MaskedSecret } from "@/types/secrets";

interface SecretListProps {
  secrets: MaskedSecret[];
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  isLoading?: boolean;
  renderCustomActions?: (secret: MaskedSecret) => React.ReactNode;
}

export function SecretList({
  secrets,
  onEdit,
  onDelete,
  isLoading,
  renderCustomActions,
}: SecretListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-on-surface-variant">
        Loading secrets...
      </div>
    );
  }

  if (secrets.length === 0) {
    return (
      <div className="text-center py-8 bg-surface-variant rounded-lg">
        <p className="text-on-surface-variant">
          No secrets configured. Add your first secret to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-outline">
        <thead className="bg-surface-variant">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Value
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Source
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Description
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-surface divide-y divide-outline">
          {secrets.map((secret) => {
            const customActions = renderCustomActions?.(secret);

            return (
              <tr key={secret.name} className="hover:bg-surface-variant">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-on-surface">
                  <code className="bg-surface-variant px-2 py-1 rounded">
                    {secret.name}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                  <span className="font-mono">●●●●●●●●</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      secret.source === "environment"
                        ? "bg-primary-container text-on-primary-container"
                        : secret.source === "project"
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-tertiary-container text-on-tertiary-container"
                    }`}
                  >
                    {secret.source}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant max-w-xs truncate">
                  {secret.description || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {customActions}
                  {(!renderCustomActions || (secret.source === "environment" || (secret.source === "project" && !renderCustomActions))) && (
                    <>
                      <button
                        onClick={() => onEdit(secret.name)}
                        className="text-primary hover:text-primary-hover ml-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(secret.name)}
                        className="text-error hover:text-error-hover ml-4"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

/**
 * Delete Secret Dialog Component
 *
 * Confirmation dialog for deleting a secret.
 */

import { useState } from "react";

interface DeleteSecretDialogProps {
  secretName: string;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteSecretDialog({
  secretName,
  isOpen,
  onConfirm,
  onCancel,
}: DeleteSecretDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-4">
          Delete Secret
        </h3>

        <p className="text-on-surface-variant mb-2">
          Are you sure you want to delete the secret{" "}
          <code className="bg-surface-variant px-2 py-1 rounded font-mono">
            {secretName}
          </code>
          ?
        </p>

        <p className="text-sm text-error mb-6">
          This action cannot be undone. Any environments using this secret will
          need to be redeployed to pick up the change.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 border border-outline rounded-lg text-on-surface hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-error text-on-error rounded-lg hover:bg-error-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete Secret"}
          </button>
        </div>
      </div>
    </div>
  );
}

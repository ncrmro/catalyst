"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProjectEnvironment } from "@/actions/environments";

interface CreateDevEnvironmentProps {
  projectId: string;
}

/**
 * Component for creating new development environments
 * Shows a simple form with optional name and branch inputs
 */
export function CreateDevEnvironment({
  projectId,
}: CreateDevEnvironmentProps) {
  const router = useRouter();
  const [environmentName, setEnvironmentName] = useState("");
  const [branch, setBranch] = useState("main");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("environmentType", "development");
      formData.append("branch", branch);

      const result = await createProjectEnvironment(formData);

      if (!result.success) {
        setError(result.message || "Failed to create environment");
        return;
      }

      setSuccess(result.message || "Environment created successfully");
      // Reset form
      setEnvironmentName("");
      setBranch("main");
      // Refresh to show new environment in status tab
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="text-sm text-on-surface-variant">
        <p>
          Create a new development environment from a specific branch.
          Development environments are ephemeral and used for testing features
          in isolation.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-lg border border-success/30 bg-success/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
              <svg
                className="w-4 h-4 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-medium text-on-surface">{success}</span>
              <p className="text-sm text-on-surface-variant mt-1">
                The environment will appear in the Status tab once it&apos;s
                ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg border border-error/30 bg-error/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-error/20">
              <svg
                className="w-4 h-4 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-medium text-on-surface">
                Failed to create environment
              </span>
              <p className="text-sm text-on-surface-variant mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Inputs */}
      <div className="space-y-4">
        {/* Environment Name (Optional) */}
        <div>
          <label
            htmlFor="environment-name"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Environment Name (Optional)
          </label>
          <input
            id="environment-name"
            type="text"
            value={environmentName}
            onChange={(e) => setEnvironmentName(e.target.value)}
            placeholder="auto-generate (e.g., dev-amber-firefly)"
            disabled={isCreating}
            className="w-full px-3 py-2 text-sm bg-surface border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Leave empty to auto-generate a unique name
          </p>
        </div>

        {/* Branch Selector */}
        <div>
          <label
            htmlFor="branch"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Branch
          </label>
          <input
            id="branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            disabled={isCreating}
            className="w-full px-3 py-2 text-sm bg-surface border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-mono"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            The git branch to deploy (e.g., main, develop, feature/xyz)
          </p>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-end pt-4 border-t border-outline/30">
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create Environment"}
        </button>
      </div>
    </div>
  );
}

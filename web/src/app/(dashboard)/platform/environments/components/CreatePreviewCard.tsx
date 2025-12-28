"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createManualPreview,
  getUserRepositories,
  getLatestImageForRepo,
} from "@/actions/preview-environments";
import { type SelectRepo } from "@/types/preview-environments";

interface CreatePreviewCardProps {
  onClose: () => void;
}

export function CreatePreviewCard({ onClose }: CreatePreviewCardProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<SelectRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [repoId, setRepoId] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const loadLatestImage = useCallback(async (selectedRepoId: string) => {
    setIsLoadingImage(true);
    setImageUri(""); // Clear current value

    const result = await getLatestImageForRepo(selectedRepoId);

    if (result.success && result.data) {
      setImageUri(result.data);
    } else {
      // If no image found, default to node:latest
      setImageUri("node:latest");
    }

    setIsLoadingImage(false);
  }, []);

  const loadRepositories = useCallback(async () => {
    setIsLoadingRepos(true);
    setError("");

    const result = await getUserRepositories();

    if (result.success && result.data) {
      setRepos(result.data);
      if (result.data.length > 0) {
        const firstRepoId = result.data[0].id;
        setRepoId(firstRepoId);
        // Auto-load latest image for first repo
        loadLatestImage(firstRepoId);
      }
    } else {
      setError(result.error || "Failed to load repositories");
    }

    setIsLoadingRepos(false);
  }, [loadLatestImage]);

  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
  }, [loadRepositories]);

  // Load latest image when repo changes
  useEffect(() => {
    if (repoId) {
      loadLatestImage(repoId);
    }
  }, [repoId, loadLatestImage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setProgress("Creating preview environment...");

    if (!repoId) {
      setError("Please select a repository");
      setIsSubmitting(false);
      return;
    }

    if (!imageUri) {
      setError("Please provide an image URI");
      setIsSubmitting(false);
      return;
    }

    try {
      const { success, data, error: actionError } = await createManualPreview({
        repoId,
        imageUri,
        branchName: branchName || undefined,
      });

      if (!success || actionError || !data) {
        setError(
          actionError || "Failed to create preview environment. Please try again.",
        );
        setIsSubmitting(false);
        setProgress("");
        return;
      }

      router.refresh();
      onClose();
      setRepoId(repos[0]?.id || "");
      setImageUri("");
      setBranchName("");
      setProgress("");
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsSubmitting(false);
      setProgress("");
    }
  };

  return (
    <div className="bg-surface border border-outline rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-on-background">
          Create Preview Environment
        </h2>
        <button
          onClick={onClose}
          className="text-on-surface-variant hover:text-on-background"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
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
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error rounded-md text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="repository"
              className="block text-sm font-medium text-on-background mb-1"
            >
              Repository
            </label>
            {isLoadingRepos ? (
              <div className="h-10 bg-surface-variant/20 rounded-md animate-pulse" />
            ) : repos.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No repositories found. Please connect a repository first.
              </p>
            ) : (
              <select
                id="repository"
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
                required
              >
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label
              htmlFor="imageUri"
              className="block text-sm font-medium text-on-background mb-1"
            >
              Image URI
            </label>
            {isLoadingImage ? (
              <div className="h-10 bg-surface-variant/20 rounded-md animate-pulse" />
            ) : (
              <input
                id="imageUri"
                type="text"
                value={imageUri}
                onChange={(e) => setImageUri(e.target.value)}
                placeholder="docker.io/myorg/myapp:latest"
                className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
                required
              />
            )}
            <p className="mt-1 text-xs text-on-surface-variant">
              {imageUri
                ? "Latest image tag auto-populated from recent deployments"
                : "Full container image URI with tag"}
            </p>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="branchName"
              className="block text-sm font-medium text-on-background mb-1"
            >
              Branch Name (optional)
            </label>
            <input
              id="branchName"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="feature/my-feature"
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Leave empty to auto-generate a memorable name
            </p>
          </div>
        </div>

        {progress && (
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md flex items-center gap-2 text-primary animate-pulse">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">{progress}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-outline rounded-md text-on-background hover:bg-surface-variant/10"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || isLoadingRepos || repos.length === 0}
          >
            {isSubmitting ? "Processing..." : "Create Preview"}
          </button>
        </div>
      </form>
    </div>
  );
}

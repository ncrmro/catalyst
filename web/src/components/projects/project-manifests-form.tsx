"use client";

import { useState } from "react";
import {
	type CreateProjectManifestRequest,
	createProjectManifest,
	deleteProjectManifest,
	type ProjectManifest,
} from "@/actions/project-manifests";
import type { ProjectRepo } from "@/models/projects";

interface ProjectManifestsFormProps {
	projectId: string;
	repositories: ProjectRepo[];
	manifests: ProjectManifest[];
}

export function ProjectManifestsForm({
	projectId,
	repositories,
	manifests: initialManifests,
}: ProjectManifestsFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [manifests, setManifests] =
		useState<ProjectManifest[]>(initialManifests);
	const [formData, setFormData] = useState<CreateProjectManifestRequest>({
		projectId,
		repoId: repositories[0]?.id.toString() || "",
		path: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);
		setSuccess(null);

		try {
			if (!formData.path.trim()) {
				throw new Error("Path is required");
			}

			const newManifest = await createProjectManifest(formData);
			setSuccess("Environment template added successfully!");

			// Add the new manifest to the local state
			setManifests((prev) => [...prev, newManifest]);

			setFormData({
				projectId,
				repoId: repositories[0]?.id.toString() || "",
				path: "",
			});
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to add environment template",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (repoId: string, path: string) => {
		if (
			!confirm("Are you sure you want to delete this environment template?")
		) {
			return;
		}

		try {
			await deleteProjectManifest(projectId, repoId, path);
			setSuccess("Environment template deleted successfully!");

			// Remove the manifest from local state
			setManifests((prev) =>
				prev.filter((m) => !(m.repoId === repoId && m.path === path)),
			);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to delete environment template",
			);
		}
	};

	const getPathDisplayName = (path: string) => {
		const fileName = path.split("/").pop() || path;

		if (fileName === "Dockerfile") {
			return "🐳 Dockerfile";
		} else if (fileName === "Chart.yaml") {
			return "⎈ Helm Chart";
		} else if (fileName.endsWith(".yaml") || fileName.endsWith(".yml")) {
			return "📄 YAML Manifest";
		} else if (fileName === "package.json") {
			return "📦 Node.js Package";
		} else if (fileName === "Cargo.toml") {
			return "🦀 Rust Package";
		} else if (fileName === "Gemfile") {
			return "💎 Ruby Package";
		}

		return `📄 ${fileName}`;
	};

	const getRepositoryName = (repoId: string) => {
		const repo = repositories.find((r) => r.id.toString() === repoId);
		return repo ? repo.name : "Unknown Repository";
	};

	return (
		<div className="space-y-6">
			{/* Existing Manifests */}
			{manifests.length > 0 && (
				<div>
					<h4 className="text-lg font-medium text-on-surface mb-4">
						Current Environment Templates
					</h4>
					<div className="grid gap-3">
						{manifests.map((manifest) => (
							<div
								key={`${manifest.repoId}-${manifest.path}`}
								className="bg-surface border border-outline rounded-lg p-4 flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div className="text-lg">
										{getPathDisplayName(manifest.path)}
									</div>
									<div>
										<div className="font-medium text-on-surface">
											{manifest.path}
										</div>
										<div className="text-sm text-on-surface-variant">
											Repository: {getRepositoryName(manifest.repoId)}
										</div>
									</div>
								</div>
								<button
									onClick={() => handleDelete(manifest.repoId, manifest.path)}
									className="text-error hover:text-error/80 text-sm font-medium px-3 py-1 rounded border border-error hover:bg-error/10 transition-colors"
								>
									Delete
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Add New Manifest Form */}
			<div className="bg-surface border border-outline rounded-lg p-6">
				<h4 className="text-lg font-medium text-on-surface mb-4">
					Add Environment Template
				</h4>
				<p className="text-sm text-on-surface-variant mb-6">
					Define Dockerfile paths, Helm charts, or other manifest files that
					provide hints about project deployment configuration.
				</p>

				{error && (
					<div className="bg-error-container border border-error rounded-lg p-3 mb-4">
						<p className="text-on-error-container text-sm">{error}</p>
					</div>
				)}

				{success && (
					<div className="bg-success-container border border-success rounded-lg p-3 mb-4">
						<p className="text-on-success-container text-sm">{success}</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="repoId"
								className="block text-sm font-medium text-on-surface mb-2"
							>
								Repository
							</label>
							<select
								id="repoId"
								value={formData.repoId}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, repoId: e.target.value }))
								}
								className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
								required
							>
								{repositories.map((repo) => (
									<option key={repo.id} value={repo.id.toString()}>
										{repo.name} {repo.primary ? "(primary)" : ""}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="path"
								className="block text-sm font-medium text-on-surface mb-2"
							>
								File Path
							</label>
							<input
								type="text"
								id="path"
								value={formData.path}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, path: e.target.value }))
								}
								placeholder="e.g., Dockerfile, Chart.yaml, charts/app/Chart.yaml"
								className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
								required
							/>
						</div>
					</div>

					<div className="text-xs text-on-surface-variant">
						<p className="mb-1">
							<strong>Common examples:</strong>
						</p>
						<ul className="list-disc list-inside space-y-1">
							<li>
								<code>Dockerfile</code> - Docker containerization
							</li>
							<li>
								<code>Chart.yaml</code> - Helm chart configuration
							</li>
							<li>
								<code>charts/app/Chart.yaml</code> - Nested Helm chart
							</li>
							<li>
								<code>k8s/deployment.yaml</code> - Kubernetes manifests
							</li>
							<li>
								<code>package.json</code> - Node.js application
							</li>
						</ul>
					</div>

					<div className="pt-4">
						<button
							type="submit"
							disabled={isSubmitting || !formData.path.trim()}
							className="px-4 py-2 bg-primary text-on-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Adding..." : "Add Environment Template"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

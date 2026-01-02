"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchGitHubRepos } from "@/actions/repos.github";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GitHubRepo, ReposData } from "@/mocks/github";

// TODO: Add SSH URL support (git@github.com:owner/repo.git)
// Will require:
// - SSH key management UI
// - Server-side SSH key storage
// - Deploy key or user SSH key configuration

export interface CreateProjectFormData {
	name: string;
	slug: string;
	description: string;
	repoUrls: string[];
}

export interface SelectedRepository {
	fullName: string;
	url: string;
	isManual: boolean;
	/** Repo name for auto-fill (e.g., "catalyst") */
	name?: string;
	/** Repo description for auto-fill */
	description?: string;
}

type GitHubStatus =
	| "loading"
	| "connected"
	| "not_connected"
	| "not_configured";

type WizardStep = "repos" | "details";

export interface CreateProjectWizardProps {
	onSubmit?: (data: CreateProjectFormData) => void;
	onCancel?: () => void;
	isSubmitting?: boolean;
	/** Initial step for testing/storybook */
	initialStep?: WizardStep;
	/** Initial selected repos for testing/storybook */
	initialSelectedRepos?: SelectedRepository[];
	/** Initial GitHub status for testing/storybook - skips fetch if provided */
	initialGitHubStatus?: Exclude<GitHubStatus, "loading">;
	/** Initial repos data for testing/storybook - used when initialGitHubStatus is "connected" */
	initialRepos?: ReposData;
}

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function CreateProjectWizard({
	onSubmit,
	onCancel,
	isSubmitting = false,
	initialStep = "repos",
	initialSelectedRepos = [],
	initialGitHubStatus,
	initialRepos,
}: CreateProjectWizardProps) {
	// Wizard step state
	const [step, setStep] = useState<WizardStep>(initialStep);

	// Multiple repositories state
	const [selectedRepos, setSelectedRepos] =
		useState<SelectedRepository[]>(initialSelectedRepos);
	const [manualUrlInput, setManualUrlInput] = useState("");

	// Project details state (for step 2)
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
	const [description, setDescription] = useState("");

	// Repository selection state
	const [githubStatus, setGithubStatus] = useState<GitHubStatus>(
		initialGitHubStatus || "loading",
	);
	const [repos, setRepos] = useState<ReposData | null>(initialRepos || null);
	const [showManualInput, setShowManualInput] = useState(false);

	// Searchable combobox state
	const [repoSearch, setRepoSearch] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Filter repos based on search
	const filteredRepos = useMemo(() => {
		if (!repos)
			return { userRepos: [], orgRepos: {} as Record<string, GitHubRepo[]> };

		const searchLower = repoSearch.toLowerCase();
		const userRepos = repos.user_repos.filter(
			(repo) =>
				repo.full_name.toLowerCase().includes(searchLower) ||
				repo.description?.toLowerCase().includes(searchLower),
		);

		const orgRepos: Record<string, GitHubRepo[]> = {};
		for (const org of repos.organizations) {
			const filtered = (repos.org_repos[org.login] || []).filter(
				(repo) =>
					repo.full_name.toLowerCase().includes(searchLower) ||
					repo.description?.toLowerCase().includes(searchLower),
			);
			if (filtered.length > 0) {
				orgRepos[org.login] = filtered;
			}
		}

		return { userRepos, orgRepos };
	}, [repos, repoSearch]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Auto-fill form data when starting on step 2 with pre-selected repos (for Storybook)
	useEffect(() => {
		if (
			initialStep === "details" &&
			initialSelectedRepos.length > 0 &&
			!name &&
			!slug
		) {
			const firstRepo = initialSelectedRepos[0];
			setName(firstRepo.name || "");
			setSlug(generateSlug(firstRepo.name || ""));
			setDescription(firstRepo.description || "");
		}
	}, [initialStep, initialSelectedRepos, name, slug]);

	// Fetch GitHub repos on mount (skip if initial data provided)
	useEffect(() => {
		if (initialGitHubStatus) {
			return;
		}

		async function loadRepos() {
			try {
				const data = await fetchGitHubRepos();

				if (!data.github_integration_enabled) {
					if (data.reason === "no_access_token") {
						setGithubStatus("not_connected");
					} else {
						setGithubStatus("not_configured");
					}
					setShowManualInput(true);
					return;
				}

				const hasRepos =
					data.user_repos.length > 0 ||
					Object.values(data.org_repos).some((repos) => repos.length > 0);

				if (hasRepos) {
					setGithubStatus("connected");
					setRepos(data);
				} else {
					setGithubStatus("connected");
					setRepos(data);
				}
			} catch (error) {
				console.error("Failed to fetch GitHub repos:", error);
				setGithubStatus("not_configured");
				setShowManualInput(true);
			}
		}

		loadRepos();
	}, [initialGitHubStatus]);

	// Handle adding a repository from dropdown
	const handleRepoSelect = (value: string) => {
		if (value === "manual") {
			setShowManualInput(true);
			return;
		}

		if (value && repos) {
			if (selectedRepos.some((r) => r.fullName === value)) {
				return;
			}

			const allRepos: GitHubRepo[] = [
				...repos.user_repos,
				...Object.values(repos.org_repos).flat(),
			];
			const repo = allRepos.find((r) => r.full_name === value);
			if (repo) {
				setSelectedRepos((prev) => [
					...prev,
					{
						fullName: repo.full_name,
						url: repo.html_url,
						isManual: false,
						name: repo.name,
						description: repo.description || undefined,
					},
				]);
			}
		}
	};

	// Handle adding a manual URL
	const handleAddManualUrl = () => {
		if (!manualUrlInput.trim()) return;

		if (selectedRepos.some((r) => r.url === manualUrlInput.trim())) {
			setManualUrlInput("");
			setShowManualInput(false);
			return;
		}

		// Extract repo name from URL if possible
		const urlMatch = manualUrlInput.match(
			/github\.com\/[^/]+\/([^/]+?)(?:\.git)?$/,
		);
		const repoName = urlMatch ? urlMatch[1] : undefined;

		setSelectedRepos((prev) => [
			...prev,
			{
				fullName: manualUrlInput.trim(),
				url: manualUrlInput.trim(),
				isManual: true,
				name: repoName,
			},
		]);
		setManualUrlInput("");
		setShowManualInput(false);
	};

	// Handle removing a repository
	const handleRemoveRepo = (url: string) => {
		setSelectedRepos((prev) => prev.filter((r) => r.url !== url));
	};

	// Handle continuing to step 2 - auto-fill from first repo
	const handleContinue = () => {
		if (selectedRepos.length > 0) {
			const firstRepo = selectedRepos[0];
			setName(firstRepo.name || "");
			setSlug(generateSlug(firstRepo.name || ""));
			setDescription(firstRepo.description || "");
			// TODO: AI-generated project description when:
			// - Multiple repos added (combine repo descriptions?)
			// - Single repo with no description
			// - User requests regeneration
		}
		setStep("details");
	};

	// Handle going back to step 1
	const handleBack = () => {
		setStep("repos");
	};

	const handleNameChange = (value: string) => {
		setName(value);
		if (!slugManuallyEdited) {
			setSlug(generateSlug(value));
		}
	};

	const handleSlugChange = (value: string) => {
		setSlug(value);
		setSlugManuallyEdited(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit?.({
			name,
			slug,
			description,
			repoUrls: selectedRepos.map((r) => r.url),
		});
	};

	// Step 1: Repository Selection
	if (step === "repos") {
		return (
			<div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<Card className="mb-6 p-6">
					<div className="flex items-center gap-3 mb-2">
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-medium">
							1
						</div>
						<h1 className="text-3xl font-bold text-on-background">
							Select Repositories
						</h1>
					</div>
					<p className="text-on-surface-variant ml-11">
						Choose the repositories to include in this project. You can add
						multiple repositories.
					</p>
				</Card>

				<Card className="mb-6 p-6">
					<div className="space-y-6">
						{/* Selected repositories list */}
						{selectedRepos.length > 0 && (
							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="block text-sm font-medium text-on-surface">
										Selected Repositories
									</label>
									<span className="text-xs text-on-surface-variant">
										{selectedRepos.length} added
									</span>
								</div>
								<div className="space-y-2">
									{selectedRepos.map((repo) => (
										<div
											key={repo.url}
											className="flex items-center justify-between px-3 py-2 bg-surface-variant/30 border border-outline/30 rounded-lg"
										>
											<div className="flex items-center gap-2 min-w-0">
												<svg
													className="w-4 h-4 text-on-surface-variant flex-shrink-0"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													{repo.isManual ? (
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
														/>
													) : (
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
														/>
													)}
												</svg>
												<span className="text-sm text-on-surface truncate">
													{repo.fullName}
												</span>
											</div>
											<button
												type="button"
												onClick={() => handleRemoveRepo(repo.url)}
												className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors flex-shrink-0"
												aria-label="Remove repository"
											>
												<svg
													className="w-4 h-4"
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
									))}
								</div>
							</div>
						)}

						{/* Repository selector */}
						<div>
							<label className="block text-sm font-medium text-on-surface mb-2">
								Add Repository
							</label>

							{/* Loading state */}
							{githubStatus === "loading" && (
								<div className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface-variant/30 animate-pulse">
									<div className="h-5 bg-surface-variant/50 rounded w-32" />
								</div>
							)}

							{/* GitHub not configured */}
							{githubStatus === "not_configured" && (
								<div className="space-y-3">
									<div className="p-3 bg-surface-variant/30 border border-outline/30 rounded-lg">
										<p className="text-sm text-on-surface-variant">
											GitHub integration not configured
										</p>
										<p className="text-xs text-on-surface-variant/70 mt-1">
											Configure GITHUB_APP_* environment variables to enable
											repository selection
										</p>
									</div>
									<div className="flex gap-2">
										<input
											type="url"
											value={manualUrlInput}
											onChange={(e) => setManualUrlInput(e.target.value)}
											placeholder="https://github.com/org/repo"
											className="flex-1 px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											data-testid="manual-url-input"
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													handleAddManualUrl();
												}
											}}
										/>
										<button
											type="button"
											onClick={handleAddManualUrl}
											disabled={!manualUrlInput.trim()}
											data-testid="add-manual-url"
											className={cn(
												"px-3 py-2 text-sm font-medium rounded-lg transition-colors",
												manualUrlInput.trim()
													? "bg-primary text-on-primary hover:opacity-90"
													: "bg-surface-variant text-on-surface-variant cursor-not-allowed",
											)}
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
													d="M12 4v16m8-8H4"
												/>
											</svg>
										</button>
									</div>
								</div>
							)}

							{/* GitHub not connected */}
							{githubStatus === "not_connected" && (
								<div className="space-y-3">
									<div className="p-3 bg-primary-container/30 border border-primary/30 rounded-lg">
										<p className="text-sm text-on-surface">
											Connect your GitHub account to select from your
											repositories
										</p>
										<a
											href="/account?highlight=github"
											className="text-xs text-primary hover:underline mt-1 inline-block"
										>
											Connect GitHub in Account settings →
										</a>
									</div>
									<div className="flex gap-2">
										<input
											type="url"
											value={manualUrlInput}
											onChange={(e) => setManualUrlInput(e.target.value)}
											placeholder="https://github.com/org/repo"
											className="flex-1 px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
											data-testid="manual-url-input"
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													handleAddManualUrl();
												}
											}}
										/>
										<button
											type="button"
											onClick={handleAddManualUrl}
											disabled={!manualUrlInput.trim()}
											data-testid="add-manual-url"
											className={cn(
												"px-3 py-2 text-sm font-medium rounded-lg transition-colors",
												manualUrlInput.trim()
													? "bg-primary text-on-primary hover:opacity-90"
													: "bg-surface-variant text-on-surface-variant cursor-not-allowed",
											)}
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
													d="M12 4v16m8-8H4"
												/>
											</svg>
										</button>
									</div>
								</div>
							)}

							{/* GitHub connected - searchable dropdown */}
							{githubStatus === "connected" && repos && (
								<div className="space-y-3">
									<div ref={dropdownRef} className="relative">
										{/* Trigger button */}
										<div
											className={cn(
												"w-full px-3 py-2 border rounded-lg bg-surface text-on-surface cursor-pointer flex items-center justify-between",
												isDropdownOpen
													? "border-primary ring-2 ring-primary"
													: "border-outline/50 hover:border-outline",
											)}
											onClick={() => setIsDropdownOpen(!isDropdownOpen)}
											data-testid="repo-dropdown"
										>
											<span className="text-on-surface-variant/50">
												Add a repository...
											</span>
											<svg
												className={cn(
													"w-4 h-4 text-on-surface-variant transition-transform",
													isDropdownOpen && "rotate-180",
												)}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M19 9l-7 7-7-7"
												/>
											</svg>
										</div>

										{/* Dropdown */}
										{isDropdownOpen && (
											<div className="absolute z-50 w-full mt-1 bg-surface border border-outline/50 rounded-lg shadow-lg max-h-80 overflow-hidden">
												{/* Search input */}
												<div className="p-2 border-b border-outline/30">
													<input
														type="text"
														value={repoSearch}
														onChange={(e) => setRepoSearch(e.target.value)}
														placeholder="Search repositories..."
														className="w-full px-3 py-2 border border-outline/50 rounded-md bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
														onClick={(e) => e.stopPropagation()}
														data-testid="repo-search"
													/>
												</div>

												{/* Scrollable options */}
												<div className="max-h-60 overflow-y-auto">
													{/* Manual entry option */}
													<button
														type="button"
														className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary/10 flex items-center gap-2 border-b border-outline/30"
														onClick={() => {
															handleRepoSelect("manual");
															setIsDropdownOpen(false);
															setRepoSearch("");
														}}
													>
														<svg
															className="w-4 h-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
															/>
														</svg>
														Enter URL manually
													</button>

													{/* User repositories */}
													{filteredRepos.userRepos.length > 0 && (
														<div>
															<div className="px-4 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-variant/30 sticky top-0">
																Your Repositories
															</div>
															{filteredRepos.userRepos.map((repo) => {
																const isAdded = selectedRepos.some(
																	(r) => r.fullName === repo.full_name,
																);
																return (
																	<button
																		key={repo.id}
																		type="button"
																		disabled={isAdded}
																		className={cn(
																			"w-full px-4 py-2 text-left text-sm",
																			isAdded
																				? "bg-surface-variant/50 text-on-surface-variant cursor-not-allowed"
																				: "hover:bg-primary/10",
																		)}
																		onClick={() => {
																			if (!isAdded) {
																				handleRepoSelect(repo.full_name);
																				setIsDropdownOpen(false);
																				setRepoSearch("");
																			}
																		}}
																	>
																		<div className="flex items-center justify-between">
																			<span>{repo.full_name}</span>
																			<div className="flex items-center gap-2">
																				{repo.private && (
																					<span className="text-xs text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded">
																						private
																					</span>
																				)}
																				{isAdded && (
																					<span className="text-xs text-primary">
																						Added
																					</span>
																				)}
																			</div>
																		</div>
																		{repo.description && (
																			<p className="text-xs text-on-surface-variant mt-0.5 truncate">
																				{repo.description}
																			</p>
																		)}
																	</button>
																);
															})}
														</div>
													)}

													{/* Organization repositories */}
													{Object.entries(filteredRepos.orgRepos).map(
														([orgLogin, orgRepos]) => (
															<div key={orgLogin}>
																<div className="px-4 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-variant/30 sticky top-0">
																	{orgLogin}
																</div>
																{orgRepos.map((repo) => {
																	const isAdded = selectedRepos.some(
																		(r) => r.fullName === repo.full_name,
																	);
																	return (
																		<button
																			key={repo.id}
																			type="button"
																			disabled={isAdded}
																			className={cn(
																				"w-full px-4 py-2 text-left text-sm",
																				isAdded
																					? "bg-surface-variant/50 text-on-surface-variant cursor-not-allowed"
																					: "hover:bg-primary/10",
																			)}
																			onClick={() => {
																				if (!isAdded) {
																					handleRepoSelect(repo.full_name);
																					setIsDropdownOpen(false);
																					setRepoSearch("");
																				}
																			}}
																		>
																			<div className="flex items-center justify-between">
																				<span>{repo.full_name}</span>
																				<div className="flex items-center gap-2">
																					{repo.private && (
																						<span className="text-xs text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded">
																							private
																						</span>
																					)}
																					{isAdded && (
																						<span className="text-xs text-primary">
																							Added
																						</span>
																					)}
																				</div>
																			</div>
																			{repo.description && (
																				<p className="text-xs text-on-surface-variant mt-0.5 truncate">
																					{repo.description}
																				</p>
																			)}
																		</button>
																	);
																})}
															</div>
														),
													)}

													{/* No results */}
													{filteredRepos.userRepos.length === 0 &&
														Object.keys(filteredRepos.orgRepos).length === 0 &&
														repoSearch && (
															<div className="px-4 py-3 text-sm text-on-surface-variant text-center">
																No repositories matching &quot;{repoSearch}
																&quot;
															</div>
														)}
												</div>
											</div>
										)}
									</div>

									{/* Manual URL input when selected */}
									{showManualInput && (
										<div className="flex gap-2">
											<input
												type="url"
												value={manualUrlInput}
												onChange={(e) => setManualUrlInput(e.target.value)}
												placeholder="https://github.com/org/repo"
												className="flex-1 px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
												data-testid="manual-url-input"
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														handleAddManualUrl();
													}
												}}
											/>
											<button
												type="button"
												onClick={handleAddManualUrl}
												disabled={!manualUrlInput.trim()}
												data-testid="add-manual-url"
												className={cn(
													"px-3 py-2 text-sm font-medium rounded-lg transition-colors",
													manualUrlInput.trim()
														? "bg-primary text-on-primary hover:opacity-90"
														: "bg-surface-variant text-on-surface-variant cursor-not-allowed",
												)}
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
														d="M12 4v16m8-8H4"
													/>
												</svg>
											</button>
											<button
												type="button"
												onClick={() => {
													setShowManualInput(false);
													setManualUrlInput("");
												}}
												className="px-3 py-2 text-sm font-medium rounded-lg bg-surface-variant text-on-surface-variant hover:bg-surface-variant/70 transition-colors"
											>
												Cancel
											</button>
										</div>
									)}
								</div>
							)}
						</div>

						{/* Actions */}
						<div className="flex items-center justify-between pt-4 border-t border-outline/30">
							<button
								type="button"
								onClick={onCancel}
								className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleContinue}
								disabled={selectedRepos.length === 0}
								className={cn(
									"px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md transition-opacity flex items-center gap-2",
									selectedRepos.length === 0
										? "opacity-50 cursor-not-allowed"
										: "hover:opacity-90",
								)}
							>
								Continue
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	// Step 2: Project Details
	return (
		<div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{/* Header */}
			<Card className="mb-6 p-6">
				<div className="flex items-center gap-3 mb-2">
					<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-medium">
						2
					</div>
					<h1 className="text-3xl font-bold text-on-background">
						Project Details
					</h1>
				</div>
				<p className="text-on-surface-variant ml-11">
					Configure your project name and description. These can be changed
					later.
				</p>
			</Card>

			<form onSubmit={handleSubmit}>
				<Card className="mb-6 p-6">
					<div className="space-y-6">
						{/* Selected repos summary (read-only) */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<label className="block text-sm font-medium text-on-surface">
									Repositories
								</label>
								<span className="text-xs text-on-surface-variant">
									{selectedRepos.length} selected
								</span>
							</div>
							<div className="space-y-1">
								{selectedRepos.map((repo) => (
									<div
										key={repo.url}
										className="flex items-center gap-2 px-3 py-1.5 bg-surface-variant/20 rounded text-sm text-on-surface-variant"
									>
										<svg
											className="w-4 h-4 flex-shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											{repo.isManual ? (
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
												/>
											) : (
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
												/>
											)}
										</svg>
										<span className="truncate">{repo.fullName}</span>
									</div>
								))}
							</div>
						</div>

						{/* Project Name */}
						<div>
							<label className="block text-sm font-medium text-on-surface mb-1">
								Project Name <span className="text-error">*</span>
							</label>
							<input
								type="text"
								name="name"
								value={name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="My Awesome Project"
								required
								className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							/>
							<p className="mt-1 text-xs text-on-surface-variant">
								A display name for your project
							</p>
						</div>

						{/* Project Slug */}
						<div>
							<label className="block text-sm font-medium text-on-surface mb-1">
								Project Slug <span className="text-error">*</span>
							</label>
							<input
								type="text"
								name="slug"
								value={slug}
								onChange={(e) => handleSlugChange(e.target.value)}
								placeholder="my-awesome-project"
								required
								pattern="[a-z0-9\-]+"
								className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
							/>
							<p className="mt-1 text-xs text-on-surface-variant">
								Used in URLs and Kubernetes resources (lowercase, hyphens only)
							</p>
						</div>

						{/* Description */}
						<div>
							<label className="block text-sm font-medium text-on-surface mb-1">
								Description
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="A brief description of your project..."
								rows={3}
								className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
							/>
							{/* TODO: AI-generated project description when:
                  - Multiple repos added (combine repo descriptions?)
                  - Single repo with no description
                  - User requests regeneration */}
						</div>

						{/* Actions */}
						<div className="flex items-center justify-between pt-4 border-t border-outline/30">
							<button
								type="button"
								onClick={handleBack}
								className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors flex items-center gap-2"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 19l-7-7 7-7"
									/>
								</svg>
								Back
							</button>
							<button
								type="submit"
								disabled={isSubmitting || !name || !slug}
								className={cn(
									"px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md transition-opacity",
									isSubmitting || !name || !slug
										? "opacity-50 cursor-not-allowed"
										: "hover:opacity-90",
								)}
							>
								{isSubmitting ? "Creating..." : "Create Project"}
							</button>
						</div>
					</div>
				</Card>
			</form>
		</div>
	);
}

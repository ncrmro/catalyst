import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchProjects } from "@/actions/projects";
import { fetchGitHubRepos } from "@/actions/repos.github";
import { ConnectRepoForm } from "@/components/repos/connect-repo-form";

interface ConnectRepoPageProps {
	params: Promise<{ repoId: string }>;
}

export default async function ConnectRepoPage({
	params,
}: ConnectRepoPageProps) {
	const { repoId } = await params;

	// Fetch repo data and find the specific repo
	const reposData = await fetchGitHubRepos();
	const allRepos = [
		...reposData.user_repos,
		...Object.values(reposData.org_repos).flat(),
	];

	const repo = allRepos.find((r) => r.id.toString() === repoId);

	if (!repo) {
		notFound();
	}

	// Fetch existing projects
	const projectsData = await fetchProjects();

	return (
		<div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-3xl mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-on-background">
						Connect Repository
					</h1>
					<p className="mt-4 text-lg text-on-surface-variant">
						Connect <span className="font-semibold">{repo.full_name}</span> to a
						project
					</p>
				</div>

				<div className="bg-surface shadow-sm border border-outline rounded-lg p-6 mb-8">
					<div className="flex items-center gap-4">
						<Image
							src={repo.owner.avatar_url}
							alt={`${repo.owner.login} avatar`}
							width={48}
							height={48}
							className="w-12 h-12 rounded-full"
						/>
						<div>
							<h2 className="text-xl font-semibold text-on-surface">
								{repo.full_name}
							</h2>
							{repo.description && (
								<p className="text-on-surface-variant">{repo.description}</p>
							)}
							<div className="flex items-center gap-4 text-sm text-on-surface-variant mt-2">
								{repo.language && (
									<span className="flex items-center gap-1">
										<span className="w-3 h-3 bg-primary rounded-full"></span>
										{repo.language}
									</span>
								)}
								<span>⭐ {repo.stargazers_count}</span>
								<span>🍴 {repo.forks_count}</span>
							</div>
						</div>
					</div>
				</div>

				<ConnectRepoForm repo={repo} existingProjects={projectsData.projects} />
			</div>
		</div>
	);
}

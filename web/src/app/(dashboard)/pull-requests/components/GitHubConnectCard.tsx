import Link from "next/link";

/**
 * Component shown when user needs to connect their GitHub account
 */
export function GitHubConnectCard() {
	return (
		<div className="bg-surface border border-outline rounded-lg p-8 text-center">
			<div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
				<span className="text-on-surface-variant text-2xl">🔗</span>
			</div>
			<h3 className="text-lg font-semibold text-on-surface mb-2">
				Connect GitHub
			</h3>
			<p className="text-on-surface-variant max-w-md mx-auto mb-6">
				Connect your GitHub account to view and manage your pull requests from
				all your repositories.
			</p>

			<Link
				href="/account?highlight=github"
				className="rounded-full border border-solid border-transparent transition-colors inline-flex items-center justify-center bg-primary text-on-primary gap-2 hover:opacity-90 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
			>
				Connect with GitHub
			</Link>
		</div>
	);
}

"use client";

interface PreviewEnvironmentsHeaderProps {
	onCreateClick: () => void;
	isCreating: boolean;
}

export function PreviewEnvironmentsHeader({
	onCreateClick,
	isCreating,
}: PreviewEnvironmentsHeaderProps) {
	return (
		<div className="flex justify-between items-start">
			<div>
				<h1 className="text-3xl font-bold text-on-background mb-2">
					Preview Environments
				</h1>
				<p className="text-on-surface-variant">
					View and manage your active preview environments for pull requests.
				</p>
			</div>

			<button
				onClick={onCreateClick}
				className={`px-4 py-2 rounded-md flex items-center gap-2 ${
					isCreating
						? "bg-surface-variant text-on-surface hover:bg-surface-variant/80"
						: "bg-primary text-on-primary hover:bg-primary/90"
				}`}
			>
				{isCreating ? (
					<>
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
						Cancel
					</>
				) : (
					<>
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
						Create
					</>
				)}
			</button>
		</div>
	);
}

export interface SignOutProps {
	/** Action callback for sign out - passed from server component */
	onSignOut: () => Promise<void>;
}

export default function SignOut({ onSignOut }: SignOutProps) {
	return (
		<form action={onSignOut}>
			<button
				type="submit"
				className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
			>
				Sign out
			</button>
		</form>
	);
}

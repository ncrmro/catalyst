"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Global app error:", error);
	}, [error]);

	return (
		<html lang="en">
			<body className="min-h-screen bg-background text-on-background flex items-center justify-center p-6">
				<div className="max-w-lg w-full bg-surface border border-outline rounded-lg shadow-sm p-6 space-y-4 text-center">
					<h1 className="text-2xl font-bold">Something went wrong</h1>
					<p className="text-on-surface-variant">
						We could not load this page. Try again or head back to sign in.
					</p>
					{error?.message && (
						<p className="text-sm text-on-surface-variant break-words">
							{error.message}
						</p>
					)}
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<button
							onClick={reset}
							className="inline-flex justify-center px-4 py-2 rounded-md bg-primary text-on-primary hover:opacity-90 transition"
						>
							Try again
						</button>
						<Link
							href="/login"
							className="inline-flex justify-center px-4 py-2 rounded-md border border-outline text-on-surface hover:bg-secondary-container hover:text-on-secondary-container transition"
						>
							Go to login
						</Link>
					</div>
				</div>
			</body>
		</html>
	);
}

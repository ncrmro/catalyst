"use client";

import { signIn } from "next-auth/react";

interface ConnectProviderButtonProps {
	providerId: string;
}

export function ConnectProviderButton({
	providerId,
}: ConnectProviderButtonProps) {
	const handleConnect = () => {
		signIn(providerId, { callbackUrl: "/account" });
	};

	return (
		<button
			onClick={handleConnect}
			className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors"
		>
			Connect
		</button>
	);
}

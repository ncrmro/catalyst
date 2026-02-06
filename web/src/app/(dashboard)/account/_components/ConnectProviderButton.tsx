"use client";

import { signIn } from "next-auth/react";

interface ConnectProviderButtonProps {
  providerId: string;
  disabled?: boolean;
}

export function ConnectProviderButton({
  providerId,
  disabled = false,
}: ConnectProviderButtonProps) {
  const handleConnect = () => {
    if (disabled) return;
    signIn(providerId, { callbackUrl: "/account" });
  };

  return (
    <button
      onClick={handleConnect}
      disabled={disabled}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        disabled
          ? "bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50"
          : "bg-primary text-on-primary hover:bg-primary/90 cursor-pointer"
      }`}
    >
      Connect
    </button>
  );
}

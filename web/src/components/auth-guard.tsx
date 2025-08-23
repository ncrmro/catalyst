"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect after component is mounted to avoid hydration issues
    if (mounted && status !== "loading") {
      // If not on login page and no session, redirect to login
      if (pathname !== "/login" && !session?.user) {
        window.location.href = "/login";
      }
    }
  }, [pathname, session, status, mounted]);

  // Show loading state while session is loading
  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-on-background">Loading...</p>
        </div>
      </div>
    );
  }

  // If not on login page and no session, show loading (redirect will happen)
  if (pathname !== "/login" && !session?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-on-background">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
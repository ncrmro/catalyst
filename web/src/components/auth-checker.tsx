"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthCheckerProps {
  children: React.ReactNode;
}

export default function AuthChecker({ children }: AuthCheckerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      // Skip auth check for login page to prevent redirect loops
      if (pathname === "/login") {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      try {
        // Check if we're in mocked mode (E2E tests)
        const configResponse = await fetch("/api/config");
        const config = await configResponse.json();
        
        if (config.mocked) {
          // In mocked mode, always allow access
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        // If config check fails, continue with normal auth check
        console.log("Config check failed, continuing with normal auth:", error);
      }

      try {
        // Check authentication by calling the session API
        const response = await fetch("/api/auth/session");
        const session = await response.json();

        // If no user session, redirect to login
        if (!session?.user) {
          router.push("/login");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
        return;
      }

      setIsLoading(false);
    }

    checkAuth();
  }, [pathname, router]);

  // Show loading state while checking auth (but not for login page)
  if (isLoading && pathname !== "/login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated or on login page
  if (!isAuthenticated && pathname !== "/login") {
    return null; // Don't render anything while redirecting
  }

  return <>{children}</>;
}
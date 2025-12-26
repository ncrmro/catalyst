import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Routes that don't require authentication
const publicRoutes = [
  "/login",
  "/api/auth",
  "/api/github/webhook",
  "/api/health",
];

// Routes that require admin access
const adminRoutes = ["/admin"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;

  // Allow public routes
  if (isPublicRoute(nextUrl.pathname)) {
    // If authenticated user visits login, redirect to projects
    if (nextUrl.pathname === "/login" && isAuthenticated) {
      return NextResponse.redirect(new URL("/projects", nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes
  if (isAdminRoute(nextUrl.pathname)) {
    const isAdmin = req.auth?.user?.admin;
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/projects", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

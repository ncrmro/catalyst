import { NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
  // Skip auth check in mocked mode (for E2E tests)
  if (process.env.MOCKED === "1") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  
  // Allow access to login page
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Allow access to auth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow access to static files and Next.js internal routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.includes(".") // files like favicon.ico, etc.
  ) {
    return NextResponse.next();
  }

  // For all other routes, check if we have an auth session cookie
  const sessionToken = request.cookies.get("authjs.session-token") || 
                      request.cookies.get("__Secure-authjs.session-token");
  
  if (!sessionToken) {
    // Redirect to login if no session token found
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
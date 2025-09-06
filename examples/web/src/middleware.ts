import authConfig from "@/lib/auth.config"
import NextAuth from "next-auth";
 
const { auth: middleware } = NextAuth(authConfig)

export default middleware((req) => {
  console.debug('Middleware invoked', req.nextUrl.pathname);
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    const newUrl = new URL("/login", req.nextUrl.origin)
    return Response.redirect(newUrl)
  }
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - login, api/auth (auth endpoints)
     */
    '/((?!login|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.well-known|favicon.ico).*)',
  ],
}
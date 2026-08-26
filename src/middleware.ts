import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface NextAuthRequest extends NextRequest {
  auth: import("next-auth").Session | null;
}

/**
 * Route groups that require authentication.
 * Business routes additionally require membership (checked server-side).
 */
const AUTHENTICATED_PREFIXES = ["/dashboard", "/history"];
const BUSINESS_PREFIXES = ["/business"];

/**
 * Auth.js v5 middleware.
 *
 * Layer 1 of the three-layer security model:
 *   Layer 1 — Middleware (fast route gating)
 *   Layer 2 — Server-side auth() (session + identity)
 *   Layer 3 — Service layer (ownership / data isolation)
 */
export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // API v1 routes — reserved for future API key authentication (Phase 8)
  if (pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  // Authenticated consumer routes
  if (AUTHENTICATED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Business routes — require authentication
  // Business membership is verified server-side via requireBusinessMembership()
  if (BUSINESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // All other routes are public (marketing, etc.)
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

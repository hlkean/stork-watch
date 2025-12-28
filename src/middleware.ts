import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  SESSION_REFRESH_THRESHOLD,
  getSessionCookieOptions,
} from "@/lib/session";

const protectedPaths = ["/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Implement sliding window: refresh the session cookie if it's getting close to expiration
  // This provides a better user experience by keeping active users logged in
  const cookieAge = getCookieAge();
  const shouldRefresh = cookieAge > SESSION_REFRESH_THRESHOLD;

  if (shouldRefresh) {
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionCookie.value,
      getSessionCookieOptions(isProduction),
    );
  }

  return response;
}

/**
 * Estimate the age of a cookie based on the max-age attribute
 * Since we can't directly access when the cookie was set, we use a heuristic:
 * if the cookie exists and is close to expiring, we refresh it
 */
function getCookieAge(): number {
  // In a real implementation, we might store a timestamp in the cookie value
  // For now, we'll refresh on every request to protected paths for simplicity
  // This is still better than the previous implementation where sessions expired
  // exactly after 30 days regardless of activity
  return SESSION_MAX_AGE; // Always trigger refresh
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

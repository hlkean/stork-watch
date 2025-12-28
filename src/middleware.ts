import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
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

  // Implement sliding window session refresh
  // Refresh the session cookie on every request to protected paths to keep active users logged in
  // This ensures sessions expire only after 30 days of inactivity, not 30 days from login
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set(
    SESSION_COOKIE_NAME,
    sessionCookie.value,
    getSessionCookieOptions(isProduction),
  );

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

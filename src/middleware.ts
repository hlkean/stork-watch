import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const sessionUser = request.cookies.get("session_user")?.value;
  if (!sessionUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

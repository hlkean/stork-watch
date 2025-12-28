import type { ResponseCookie } from "next/server";

/**
 * Session configuration constants
 */
export const SESSION_COOKIE_NAME = "session_user";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

/**
 * Get session cookie options
 */
export function getSessionCookieOptions(isProduction: boolean): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
  };
}

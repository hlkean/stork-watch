import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/**
 * Session configuration constants
 */
export const SESSION_COOKIE_NAME = "session_user";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
export const SESSION_REFRESH_THRESHOLD = 60 * 60 * 24 * 7; // Refresh if less than 7 days remaining

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

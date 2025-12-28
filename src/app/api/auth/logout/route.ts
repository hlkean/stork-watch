import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("Environment variable NEXT_PUBLIC_APP_URL is not defined.");
  }

  const response = NextResponse.redirect(new URL("/login", baseUrl));
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}

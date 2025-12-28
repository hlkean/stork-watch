import { NextResponse } from "next/server";

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("Environment variable NEXT_PUBLIC_APP_URL is not defined.");
  }

  const response = NextResponse.redirect(new URL("/login", baseUrl));
  response.cookies.set("session_user", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}

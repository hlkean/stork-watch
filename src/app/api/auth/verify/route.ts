import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { getTwilioClient } from "@/lib/twilio";
import { loginVerifySchema } from "@/lib/validation/auth";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = loginVerifySchema.parse(json);
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!serviceSid) {
      return NextResponse.json(
        { error: "Verification service not configured" },
        { status: 500 },
      );
    }

    const phone = normalizeUSPhone(parsed.phone);
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found for that phone" },
        { status: 404 },
      );
    }

    const client = getTwilioClient();
    const verification = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phone,
        code: parsed.verificationCode,
      });

    if (verification.status !== "approved") {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set(
      SESSION_COOKIE_NAME,
      user.id,
      getSessionCookieOptions(isProduction),
    );

    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      "issues" in error &&
      Array.isArray((error as { issues?: unknown }).issues)
    ) {
      return NextResponse.json(
        { error: "Invalid input", details: (error as { issues: unknown[] }).issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes("US phone number") ||
        error.message.includes("supported")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        );
      }
    }

    console.error("Login verify error", error);
    return NextResponse.json(
      { error: "Unable to verify code" },
      { status: 500 },
    );
  }
}

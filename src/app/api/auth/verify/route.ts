import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { getTwilioClient } from "@/lib/twilio";
import { loginVerifySchema } from "@/lib/validation/auth";
import {
  getClientIp,
  isRateLimited,
  recordVerificationAttempt,
} from "@/lib/rate-limit";

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
    const ipAddress = await getClientIp();

    // Check rate limiting before attempting verification
    const rateLimited = await isRateLimited(phone, ipAddress);
    if (rateLimited) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 },
      );
    }

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

    // Record the verification attempt
    await recordVerificationAttempt(
      phone,
      ipAddress,
      verification.status === "approved",
    );

    if (verification.status !== "approved") {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set("session_user", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

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

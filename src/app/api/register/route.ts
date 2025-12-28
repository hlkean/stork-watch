import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { getTwilioClient } from "@/lib/twilio";
import { registerSchema } from "@/lib/validation/register";
import { nanoid } from "nanoid";
import {
  getClientIp,
  isRateLimited,
  recordVerificationAttempt,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerSchema.parse(json);
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

    const client = getTwilioClient();
    const verification = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phone,
        code: parsed.verificationCode,
      });

    if (verification.status !== "approved") {
      // Record the failed verification attempt
      try {
        await recordVerificationAttempt(phone, ipAddress, false);
      } catch (error) {
        console.error("Failed to record verification attempt", error);
      }
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    // Record the successful verification attempt
    try {
      await recordVerificationAttempt(phone, ipAddress, true);
    } catch (error) {
      console.error("Failed to record verification attempt", error);
    }

    // Random slug; in production consider collision retries.
    const slug = `preg-${nanoid(8)}`;
    const birthDate = parsed.babyBirthDate
      ? new Date(parsed.babyBirthDate)
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone,
          email: null,
        },
      });

      const pregnancy = await tx.pregnancy.create({
        data: {
          slug,
          birthDate,
          sex: parsed.babySex ?? null,
          babyName: parsed.babyName ?? null,
          members: {
            create: {
              userId: user.id,
              role: "PARENT",
            },
          },
        },
      });

      return { user, pregnancy };
    });

    const response = NextResponse.json(result, { status: 201 });
    response.cookies.set("session_user", result.user.id, {
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
      // zod error shape
      return NextResponse.json(
        { error: "Invalid input", details: (error as { issues: unknown[] }).issues },
        { status: 400 },
      );
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "User already exists with that phone" },
        { status: 409 },
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

    console.error("Register error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

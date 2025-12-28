import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { getTwilioClient } from "@/lib/twilio";
import { registerSchema } from "@/lib/validation/register";
import { nanoid } from "nanoid";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/session";

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
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.user.id,
      getSessionCookieOptions(isProduction),
    );

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

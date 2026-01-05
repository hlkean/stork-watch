import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { getTwilioClient } from "@/lib/twilio";
import { registerSchema } from "@/lib/validation/register";
import { RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { nanoid } from "nanoid";

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

    const rate = checkRateLimit(
      `register-verify-success:${phone}`,
      RATE_LIMITS.registerVerifySuccess.limit,
      RATE_LIMITS.registerVerifySuccess.windowMs,
    );
    if (!rate.allowed) {
      const limited = rateLimitResponse(rate);
      return NextResponse.json(limited.body, {
        status: limited.status,
        headers: limited.headers,
      });
    }

    // Random slug with collision retries for safety.
    const birthDate = parsed.babyBirthDate
      ? new Date(parsed.babyBirthDate)
      : null;

    const maxSlugAttempts = 5;
    let result: { user: unknown; pregnancy: unknown } | undefined;

    for (let attempt = 0; attempt < maxSlugAttempts; attempt++) {
      const slug = `preg-${nanoid(8)}`;

      try {
        result = await prisma.$transaction(async (tx) => {
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

        break;
      } catch (err) {
        // Retry only on unique constraint errors related to the slug field.
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          const meta = (err as { meta?: { target?: string | string[] } }).meta;
          const target = meta && meta.target;
          const targetStr = Array.isArray(target)
            ? target.join(",")
            : String(target ?? "");

          if (targetStr.includes("slug")) {
            if (attempt < maxSlugAttempts - 1) {
              continue;
            }
          }
        }

        throw err;
      }
    }

    if (!result) {
      throw new Error("Failed to create pregnancy after slug retries");
    }
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
        { error: "Unable to complete registration" },
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

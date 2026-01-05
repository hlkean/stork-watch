import { NextResponse } from "next/server";
import { getTwilioClient } from "@/lib/twilio";
import { normalizeUSPhone } from "@/lib/phone";
import { sendCodeSchema } from "@/lib/validation/register";
import { RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = sendCodeSchema.parse(json);
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!serviceSid) {
      return NextResponse.json(
        { error: "Verification service not configured" },
        { status: 500 },
      );
    }

    const to = normalizeUSPhone(parsed.phone);
    const rate = checkRateLimit(
      `register-send:${to}`,
      RATE_LIMITS.registerSend.limit,
      RATE_LIMITS.registerSend.windowMs,
    );
    if (!rate.allowed) {
      const limited = rateLimitResponse(rate);
      return NextResponse.json(limited.body, {
        status: limited.status,
        headers: limited.headers,
      });
    }

    const client = getTwilioClient();
    await client.verify.v2.services(serviceSid).verifications.create({
      to,
      channel: "sms",
    });

    return NextResponse.json({ success: true });
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
    console.error("Send verification code error", error);
    return NextResponse.json(
      { error: "Unable to send verification code" },
      { status: 500 },
    );
  }
}

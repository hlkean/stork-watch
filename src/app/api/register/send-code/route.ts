import { NextResponse } from "next/server";
import { getTwilioClient } from "@/lib/twilio";
import { normalizeUSPhone } from "@/lib/phone";
import { sendCodeSchema } from "@/lib/validation/register";
import { rateLimitSMS } from "@/lib/rate-limit";

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

    // Check rate limit
    const rateLimit = await rateLimitSMS(to);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          resetIn: rateLimit.resetIn,
        },
        { status: 429 },
      );
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

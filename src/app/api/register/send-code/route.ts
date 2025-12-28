import { NextResponse } from "next/server";
import { getTwilioClient } from "@/lib/twilio";
import { normalizeUSPhone } from "@/lib/phone";
import { sendCodeSchema } from "@/lib/validation/register";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = sendCodeSchema.parse(json);
    
    // Rate limit by IP address (5 requests per 15 minutes)
    const clientIp = getClientIp(request);
    const ipRateLimit = checkRateLimit(`send-code-ip:${clientIp}`, {
      maxRequests: 5,
      windowSeconds: 15 * 60,
    });
    
    if (!ipRateLimit.success) {
      const resetDate = new Date(ipRateLimit.resetAt);
      return NextResponse.json(
        { 
          error: "Too many requests. Please try again later.",
          resetAt: resetDate.toISOString(),
        },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.max(0, Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000)).toString(),
          },
        },
      );
    }
    
    // Rate limit by phone number (3 requests per hour)
    const to = normalizeUSPhone(parsed.phone);
    const phoneRateLimit = checkRateLimit(`send-code-phone:${to}`, {
      maxRequests: 3,
      windowSeconds: 60 * 60,
    });
    
    if (!phoneRateLimit.success) {
      const resetDate = new Date(phoneRateLimit.resetAt);
      return NextResponse.json(
        { 
          error: "Too many verification attempts for this phone number. Please try again later.",
          resetAt: resetDate.toISOString(),
        },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.max(0, Math.ceil((phoneRateLimit.resetAt - Date.now()) / 1000)).toString(),
          },
        },
      );
    }
    
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!serviceSid) {
      return NextResponse.json(
        { error: "Verification service not configured" },
        { status: 500 },
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

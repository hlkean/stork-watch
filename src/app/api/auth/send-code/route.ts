import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { getTwilioClient } from "@/lib/twilio";
import { loginSendCodeSchema } from "@/lib/validation/auth";
import { checkRateLimit, getClientIp, getRetryAfterSeconds } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = loginSendCodeSchema.parse(json);
    
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
            "Retry-After": getRetryAfterSeconds(ipRateLimit.resetAt).toString(),
          },
        },
      );
    }
    
    // Rate limit by phone number (3 requests per hour)
    const phone = normalizeUSPhone(parsed.phone);
    const phoneRateLimit = checkRateLimit(`send-code-phone:${phone}`, {
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
            "Retry-After": getRetryAfterSeconds(phoneRateLimit.resetAt).toString(),
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
    await client.verify.v2.services(serviceSid).verifications.create({
      to: phone,
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

    console.error("Login send code error", error);
    return NextResponse.json(
      { error: "Unable to send verification code" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { getTwilioClient } from "@/lib/twilio";
import { loginSendCodeSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = loginSendCodeSchema.parse(json);
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

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const MAX_ATTEMPTS_PER_PHONE = 5;
const MAX_ATTEMPTS_PER_IP = 10;
const TIME_WINDOW_MINUTES = 15;

/**
 * Get the client IP address from request headers
 */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();
  // Check common headers for IP address
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return null;
}

/**
 * Check if verification attempts are within rate limits
 * @param identifier - The phone number being verified
 * @param ipAddress - The IP address of the requester (optional)
 * @returns true if rate limit is exceeded, false otherwise
 */
export async function isRateLimited(
  identifier: string,
  ipAddress: string | null,
): Promise<boolean> {
  const timeWindow = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000);

  // Check attempts by phone number
  const phoneAttempts = await prisma.verificationAttempt.count({
    where: {
      identifier,
      createdAt: {
        gte: timeWindow,
      },
    },
  });

  if (phoneAttempts >= MAX_ATTEMPTS_PER_PHONE) {
    return true;
  }

  // Check attempts by IP address if available
  if (ipAddress) {
    const ipAttempts = await prisma.verificationAttempt.count({
      where: {
        ipAddress,
        createdAt: {
          gte: timeWindow,
        },
      },
    });

    if (ipAttempts >= MAX_ATTEMPTS_PER_IP) {
      return true;
    }
  }

  return false;
}

/**
 * Record a verification attempt
 * @param identifier - The phone number being verified
 * @param ipAddress - The IP address of the requester (optional)
 * @param success - Whether the verification was successful
 */
export async function recordVerificationAttempt(
  identifier: string,
  ipAddress: string | null,
  success: boolean,
): Promise<void> {
  await prisma.verificationAttempt.create({
    data: {
      identifier,
      ipAddress,
      success,
    },
  });
}

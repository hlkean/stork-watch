import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const MAX_ATTEMPTS_PER_PHONE = 5;
const MAX_ATTEMPTS_PER_IP = 10;
const TIME_WINDOW_MINUTES = 15;

/**
 * Validate if a string is a valid IPv4 or IPv6 address
 */
function isValidIpAddress(ip: string): boolean {
  // IPv4 validation - check each octet is 0-255
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = ip.match(ipv4Regex);
  if (ipv4Match) {
    return ipv4Match.slice(1, 5).every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // IPv6 validation - simplified check for hex digits and colons
  const ipv6Regex = /^[a-f0-9:]+$/i;
  return ipv6Regex.test(ip) && ip.includes(":");
}

/**
 * Get the client IP address from request headers
 * Note: X-Forwarded-For can be spoofed. This implementation provides
 * defense-in-depth by rate limiting both by phone number and IP.
 * The phone number is the primary rate limit identifier.
 */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();
  // Check common headers for IP address
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (isValidIpAddress(ip)) {
      return ip;
    }
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp && isValidIpAddress(realIp)) {
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

  // Check attempts by phone number and IP address in a single query
  const [phoneAttempts, ipAttempts] = await Promise.all([
    prisma.verificationAttempt.count({
      where: {
        identifier,
        createdAt: {
          gte: timeWindow,
        },
      },
    }),
    ipAddress
      ? prisma.verificationAttempt.count({
          where: {
            ipAddress,
            createdAt: {
              gte: timeWindow,
            },
          },
        })
      : Promise.resolve(0),
  ]);

  if (phoneAttempts >= MAX_ATTEMPTS_PER_PHONE) {
    return true;
  }

  if (ipAttempts >= MAX_ATTEMPTS_PER_IP) {
    return true;
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

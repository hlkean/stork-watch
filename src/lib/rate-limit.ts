import { prisma } from "./prisma";
import { headers } from "next/headers";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of attempts allowed within the window
   */
  maxAttempts: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed (not rate limited)
   */
  allowed: boolean;
  /**
   * Number of attempts made in the current window
   */
  attempts: number;
  /**
   * Maximum attempts allowed
   */
  limit: number;
  /**
   * Time in seconds until the rate limit resets
   */
  resetIn?: number;
}

/**
 * Gets the client IP address from request headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  
  // Check various headers that might contain the client IP
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = headersList.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a generic identifier if IP cannot be determined
  return "unknown";
}

/**
 * Checks if a request should be rate limited
 * 
 * @param identifiers - Array of identifiers to use for rate limiting (e.g., IP, phone number)
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  identifiers: string[],
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);
  const expiresAt = new Date(now.getTime() + config.windowSeconds * 1000);

  // Create a combined key from all identifiers
  const key = identifiers.join(":");

  try {
    // Clean up expired rate limit records
    await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // Try to find existing rate limit record
    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (existing) {
      // Check if we're still within the same window
      if (existing.windowStart >= windowStart) {
        // Check if limit is exceeded
        if (existing.attempts >= config.maxAttempts) {
          const resetIn = Math.ceil(
            (existing.expiresAt.getTime() - now.getTime()) / 1000
          );
          return {
            allowed: false,
            attempts: existing.attempts,
            limit: config.maxAttempts,
            resetIn,
          };
        }

        // Increment attempts
        const updated = await prisma.rateLimit.update({
          where: { key },
          data: {
            attempts: {
              increment: 1,
            },
          },
        });

        return {
          allowed: true,
          attempts: updated.attempts,
          limit: config.maxAttempts,
        };
      }

      // Window has expired, reset the counter
      const updated = await prisma.rateLimit.update({
        where: { key },
        data: {
          attempts: 1,
          windowStart: now,
          expiresAt,
        },
      });

      return {
        allowed: true,
        attempts: updated.attempts,
        limit: config.maxAttempts,
      };
    }

    // Create new rate limit record
    await prisma.rateLimit.create({
      data: {
        key,
        attempts: 1,
        windowStart: now,
        expiresAt,
      },
    });

    return {
      allowed: true,
      attempts: 1,
      limit: config.maxAttempts,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // In case of error, allow the request but log it
    return {
      allowed: true,
      attempts: 0,
      limit: config.maxAttempts,
    };
  }
}

/**
 * Rate limit middleware for SMS sending endpoints
 * Limits based on both IP address and phone number
 */
export async function rateLimitSMS(
  phone: string
): Promise<RateLimitResult> {
  const ip = await getClientIP();
  
  // Check rate limit with both IP and phone number
  // This prevents abuse from a single IP or targeting a single phone number
  return checkRateLimit([`sms`, ip, phone], {
    maxAttempts: 3, // 3 attempts
    windowSeconds: 300, // per 5 minutes
  });
}

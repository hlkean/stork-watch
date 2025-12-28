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
    // X-Forwarded-For can contain multiple IPs, take the first one (client IP)
    // Note: If your app is behind multiple proxies, you may need to adjust this
    // to take the rightmost trusted IP instead. Verify your network architecture.
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = headersList.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // If IP cannot be determined, use a very restrictive approach
  // by treating all unknown IPs as a single highly rate-limited entity
  return "unknown-ip";
}

/**
 * Cleanup expired rate limit records
 * This should be called periodically (e.g., via a cron job) to prevent database bloat
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimit.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
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
    // Try to find existing rate limit record
    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (existing) {
      // Check if we're still within the same window
      // Window has expired if existing windowStart is before the threshold
      const windowExpired = existing.windowStart < windowStart;
      
      if (!windowExpired) {
        // Check if limit is exceeded
        if (existing.attempts >= config.maxAttempts) {
          // Calculate reset time based on window start + window duration
          const windowEnd = new Date(existing.windowStart.getTime() + config.windowSeconds * 1000);
          const resetIn = Math.ceil(
            (windowEnd.getTime() - now.getTime()) / 1000
          );
          return {
            allowed: false,
            attempts: existing.attempts,
            limit: config.maxAttempts,
            resetIn: Math.max(0, resetIn),
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
    // Fail securely: deny the request if rate limiting fails
    // This prevents bypassing rate limits when the database is unavailable
    return {
      allowed: false,
      attempts: config.maxAttempts,
      limit: config.maxAttempts,
      resetIn: config.windowSeconds,
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
  
  // Rate limit configuration for SMS
  const SMS_MAX_ATTEMPTS = 3;
  const SMS_WINDOW_SECONDS = 300; // 5 minutes
  
  // Check rate limit with both IP and phone number
  // This prevents abuse from a single IP or targeting a single phone number
  return checkRateLimit([`sms`, ip, phone], {
    maxAttempts: SMS_MAX_ATTEMPTS,
    windowSeconds: SMS_WINDOW_SECONDS,
  });
}

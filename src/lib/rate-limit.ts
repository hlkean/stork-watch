import { prisma } from "./prisma";

/**
 * Configuration for rate limiting verification attempts
 */
const RATE_LIMIT_CONFIG = {
  // Maximum number of failed verification attempts allowed
  maxAttempts: 5,
  // Time window in minutes for rate limiting
  windowMinutes: 15,
  // Lockout duration in minutes after exceeding max attempts
  lockoutMinutes: 30,
};

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining?: number;
  retryAfterMinutes?: number;
}

/**
 * Check if a phone number has exceeded rate limits for verification attempts
 * @param phone - Normalized phone number
 * @returns RateLimitResult indicating if the request is allowed
 */
export async function checkVerificationRateLimit(
  phone: string,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - RATE_LIMIT_CONFIG.windowMinutes * 60 * 1000,
  );

  // Get or create verification attempt record
  let attemptRecord = await prisma.verificationAttempt.findUnique({
    where: { phone },
  });

  if (!attemptRecord) {
    // First attempt - create record with 0 attempts (will be incremented below)
    attemptRecord = await prisma.verificationAttempt.create({
      data: {
        phone,
        attempts: 0,
        lastAttempt: now,
      },
    });
  }

  // Check if we're still in lockout period
  const lockoutEnd = new Date(
    attemptRecord.lastAttempt.getTime() +
      RATE_LIMIT_CONFIG.lockoutMinutes * 60 * 1000,
  );

  if (
    attemptRecord.attempts >= RATE_LIMIT_CONFIG.maxAttempts &&
    now < lockoutEnd
  ) {
    const retryAfterMinutes = Math.ceil(
      (lockoutEnd.getTime() - now.getTime()) / (60 * 1000),
    );
    return {
      allowed: false,
      retryAfterMinutes,
    };
  }

  // Check if we should reset the counter (outside time window)
  if (attemptRecord.lastAttempt < windowStart) {
    // Reset counter to 0 (will be incremented below)
    attemptRecord = await prisma.verificationAttempt.update({
      where: { phone },
      data: {
        attempts: 0,
        lastAttempt: now,
      },
    });
  }

  // Increment attempt counter
  const newAttempts = attemptRecord.attempts + 1;

  await prisma.verificationAttempt.update({
    where: { phone },
    data: {
      attempts: newAttempts,
      lastAttempt: now,
    },
  });

  // Check if we've exceeded max attempts
  if (newAttempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    const retryAfterMinutes = RATE_LIMIT_CONFIG.lockoutMinutes;
    return {
      allowed: false,
      retryAfterMinutes,
    };
  }

  return {
    allowed: true,
    attemptsRemaining: RATE_LIMIT_CONFIG.maxAttempts - newAttempts,
  };
}

/**
 * Reset rate limit for a phone number (e.g., after successful verification)
 * @param phone - Normalized phone number
 */
export async function resetVerificationRateLimit(phone: string): Promise<void> {
  await prisma.verificationAttempt.deleteMany({
    where: { phone },
  });
}

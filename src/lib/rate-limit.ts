type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

const globalStore =
  (globalThis as unknown as { __rateLimitStore?: Map<string, RateLimitEntry> })
    .__rateLimitStore ?? new Map<string, RateLimitEntry>();

// Persist store across hot reloads in dev.
(globalThis as unknown as { __rateLimitStore?: Map<string, RateLimitEntry> }).__rateLimitStore =
  globalStore;

/**
 * Check and increment a rate limit bucket.
 *
 * @param key - Identifier for the bucket (e.g., per phone or IP).
 * @param limit - Maximum number of allowed calls within the window.
 * @param windowMs - Rolling window duration in milliseconds.
 * @returns {RateLimitResult} allowed flag, remaining tokens, and reset timestamp (ms).
 *
 * Edge cases: when the window has expired or no bucket exists, the counter resets and starts at 1.
 * The check increments the count on each allowed call; callers should not increment separately.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = globalStore.get(key);

  if (!existing || existing.expiresAt <= now) {
    globalStore.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, reset: existing.expiresAt };
  }

  const nextCount = existing.count + 1;
  globalStore.set(key, { count: nextCount, expiresAt: existing.expiresAt });
  return {
    allowed: true,
    remaining: Math.max(0, limit - nextCount),
    reset: existing.expiresAt,
  };
}

/**
 * Build a standard 429 response payload from a rate limit result.
 *
 * @param rate - Result from `checkRateLimit`.
 * @returns An object with status, JSON body, and headers (including Retry-After seconds).
 *
 * Intended to be passed to NextResponse.json: `const limited = rateLimitResponse(rate);`
 */
export function rateLimitResponse(rate: RateLimitResult) {
  const retryAfter = Math.max(0, Math.ceil((rate.reset - Date.now()) / 1000));
  return {
    status: 429,
    body: { error: "Too many requests. Try again later." },
    headers: { "Retry-After": `${retryAfter}` },
  };
}

export const RATE_LIMITS = {
  registerSend: { limit: 5, windowMs: 15 * 60 * 1000 },
  loginSend: { limit: 5, windowMs: 15 * 60 * 1000 },
  registerVerifySuccess: { limit: 10, windowMs: 15 * 60 * 1000 },
  loginVerifySuccess: { limit: 10, windowMs: 15 * 60 * 1000 },
} as const;

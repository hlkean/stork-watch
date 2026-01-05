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

export function rateLimitResponse(rate: RateLimitResult) {
  const retryAfter = Math.max(0, Math.ceil((rate.reset - Date.now()) / 1000));
  return {
    status: 429,
    body: { error: "Too many requests. Try again later." },
    headers: { "Retry-After": `${retryAfter}` },
  };
}

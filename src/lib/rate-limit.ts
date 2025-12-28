/**
 * Simple in-memory rate limiter for API endpoints
 * Tracks requests by identifier (IP address or phone number)
 */

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitStore>();

/**
 * Cleanup expired entries (lazy cleanup during checkRateLimit)
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  const entries = Array.from(store.entries());
  for (const [key, value] of entries) {
    if (value.resetAt < now) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed within the window
   */
  maxRequests: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address or phone number)
 * @param options - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  // Periodically cleanup expired entries (every ~100 checks)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }
  
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  
  const existing = store.get(identifier);
  
  // If no entry exists or window expired, create new entry
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(identifier, {
      count: 1,
      resetAt,
    });
    
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetAt,
    };
  }
  
  // Check if limit exceeded
  if (existing.count >= options.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }
  
  // Increment counter
  existing.count++;
  
  return {
    success: true,
    remaining: options.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  
  // Use a hash of headers as fallback to avoid grouping all unknown IPs together
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  // Last resort: use a combination of headers to create a unique identifier
  const userAgent = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept") || "";
  return `fallback-${hashString(userAgent + accept)}`;
}

/**
 * Simple string hash function for fallback IP identification
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

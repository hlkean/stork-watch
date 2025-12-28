# Rate Limiting Implementation

## Overview
Rate limiting has been implemented for the SMS send-code endpoints to prevent abuse, SMS spam, and DoS attacks.

## Endpoints Protected
- `/api/register/send-code` - Registration OTP sending
- `/api/auth/send-code` - Login OTP sending

## Rate Limit Configuration
- **Limit**: 3 attempts per 5 minutes
- **Key**: Combined IP address + phone number
- **Response**: HTTP 429 (Too Many Requests) when limit exceeded

## Database Schema
A new `RateLimit` table has been added to track rate limit attempts:
- `key`: Unique identifier (IP:phone combination)
- `attempts`: Number of attempts in the current window
- `windowStart`: Start of the current rate limit window
- `expiresAt`: When the rate limit record expires

## How It Works
1. When a request is made, the system checks the rate limit based on IP + phone
2. If within limits, the attempt is recorded and the SMS is sent
3. If limit exceeded, returns 429 with retry information
4. If rate limiting fails (e.g., database unavailable), denies the request for security

## Cleanup
Expired rate limit records should be cleaned up periodically to prevent database bloat.
You can set up a cron job or scheduled task to call the `cleanupExpiredRateLimits()` function:

```typescript
import { cleanupExpiredRateLimits } from '@/lib/rate-limit';

// Example: Run cleanup every hour
const deletedCount = await cleanupExpiredRateLimits();
console.log(`Cleaned up ${deletedCount} expired rate limit records`);
```

## Security Considerations

### IP Address Detection
The rate limiter uses the `X-Forwarded-For` header to detect client IP addresses. By default, it takes the **first IP** in the header, which represents the original client.

**Important:** If your application is behind multiple proxies or load balancers, you may need to adjust the IP detection logic:
- If behind a single trusted proxy: Use the first IP (current implementation)
- If behind multiple proxies: Consider taking the rightmost trusted IP
- For maximum security: Implement a trusted proxy list

To customize IP detection, modify the `getClientIP()` function in `src/lib/rate-limit.ts`.

### Known Limitations
- Requests without detectable IP addresses are grouped under a shared "unknown-ip" bucket, which is more restrictive but may affect legitimate users
- IP-based rate limiting can be bypassed by attackers using multiple IP addresses (consider adding CAPTCHA for additional protection)

## Security Benefits
- Prevents attackers from sending unlimited SMS messages
- Protects against targeting specific phone numbers
- Reduces service costs from SMS abuse
- Mitigates DoS attacks

## Testing
To manually test the rate limiting:
1. Send 3 SMS codes to the same phone number from the same IP
2. The 4th attempt should return HTTP 429 with an error message
3. Wait 5 minutes and try again - should succeed

## Migration
Run the database migration to add the RateLimit table:
```bash
npx prisma migrate deploy
```

## Environment
The implementation uses:
- Prisma for database operations
- Next.js headers API to get client IP
- PostgreSQL for persistent storage

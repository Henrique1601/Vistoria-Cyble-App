/**
 * Simple in-memory rate limiter for API routes.
 * Uses sliding window per IP. Works in serverless (Vercel) because
 * each function instance has its own memory, but rate limiting is
 * still effective per-instance and prevents brute force from a single source.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (usually IP address).
 * Returns whether the request is allowed and metadata.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Predefined rate limit configs for different route types.
 */
export const RATE_LIMITS = {
  /** Auth endpoints (PIN validation) — stricter */
  auth: { windowMs: 60_000, max: 10 }, // 10 attempts per minute
  /** Upload endpoints — moderate */
  upload: { windowMs: 60_000, max: 30 }, // 30 uploads per minute
  /** Read endpoints — lenient */
  read: { windowMs: 60_000, max: 120 }, // 120 reads per minute
  /** Write endpoints (POST/PUT/DELETE) — moderate */
  write: { windowMs: 60_000, max: 40 }, // 40 writes per minute
} as const;

/**
 * Get client IP from request (works with Vercel's forwarded headers).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

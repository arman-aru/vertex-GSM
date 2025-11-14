/**
 * Rate Limiter Utility
 * 
 * Simple in-memory rate limiter for webhook and admin API protection.
 * For production with multiple instances, use Redis or a distributed store.
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and update rate limit for a given identifier (IP, API key, etc.)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Clean up expired entries
  if (store[key] && store[key].resetAt < now) {
    delete store[key];
  }

  // Initialize or get existing entry
  if (!store[key]) {
    store[key] = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  const entry = store[key];

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limiter identifier from request headers
 */
export function getRateLimitIdentifier(req: Request): string {
  // Try to get real IP from various headers (for proxied requests)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  const ip = cfConnectingIp || realIp || forwardedFor?.split(",")[0] || "unknown";
  return `ip:${ip}`;
}

/**
 * Rate limit configs for different endpoint types
 */
export const RATE_LIMITS = {
  WEBHOOK: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  ADMIN_API: { windowMs: 60000, maxRequests: 60 }, // 60 requests per minute
  SUPERADMIN_API: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  AUTH: { windowMs: 300000, maxRequests: 5 }, // 5 requests per 5 minutes
} as const;

/**
 * Cleanup old entries periodically (call this in a background task if needed)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  }
}

// Auto cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 300000);
}

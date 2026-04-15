import type { Request, Response, NextFunction } from "express";
import { RateLimiter, type RateLimitConfig } from "../../lib/rate-limiter.js";

export interface RateLimitMiddlewareOptions extends RateLimitConfig {
  /**
   * Custom function to extract identifier from request.
   * Default: combines IP and API key (for API key routes)
   */
  identifierFn?: (req: Request) => string;

  /**
   * Custom handler when rate limit is exceeded.
   * Default: returns 429 with JSON error
   */
  onLimitExceeded?: (req: Request, res: Response, retryAfter: number) => void;
}

/**
 * Create a rate limit middleware for Express.
 *
 * @example
 * // Apply to all authenticated routes
 * const rateLimitMiddleware = createRateLimitMiddleware({
 *   windowMs: 60 * 1000, // 1 minute
 *   maxRequests: 100,
 * });
 */
export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { identifierFn, onLimitExceeded, ...rateLimitConfig } = options;

  const limiter = new RateLimiter(rateLimitConfig);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get identifier for this request
      const identifier = identifierFn ?
        identifierFn(req) :
        getDefaultIdentifier(req);

      // Check rate limit
      const { allowed, remaining, retryAfter } =
        await limiter.checkLimit(identifier);

      // Set rate limit headers (standard format)
      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining));
      if (retryAfter) {
        res.setHeader("Retry-After", retryAfter);
      }

      if (!allowed) {
        if (onLimitExceeded) {
          onLimitExceeded(req, res, retryAfter || 0);
        } else {
          // Default response
          res.status(429).json({
            error: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            retryAfter: retryAfter || Math.ceil(options.windowMs / 1000),
          });
        }
        return;
      }

      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[RateLimitMiddleware] Error:", message);
      // On error, allow the request (fail open) but log it
      next();
    }
  };
}

/**
 * Get client IP from request, accounting for proxies.
 * Checks X-Forwarded-For, X-Real-IP, and falls back to socket address.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2, ...
    const ips = Array.isArray(forwarded) ?
      forwarded[0].split(",")[0].trim() :
      forwarded.split(",")[0].trim();
    return ips;
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Default identifier function: combines IP + API key from request.
 * Used when identifierFn is not provided.
 */
function getDefaultIdentifier(req: Request): string {
  const ip = getClientIp(req);
  const apiKey = (req.headers["x-api-key"] as string) || "anonymous";
  return `${ip}:${apiKey}`;
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiterConfigs = {
  /**
   * Strict limit for sensitive endpoints (auth, payment, etc.)
   * 10 requests per minute
   */
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: "rateLimit_strict",
  },

  /**
   * Standard limit for most API endpoints
   * 100 requests per minute
   */
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: "rateLimit_standard",
  },

  /**
   * Generous limit for background/batch endpoints
   * 500 requests per minute
   */
  generous: {
    windowMs: 60 * 1000,
    maxRequests: 500,
    keyPrefix: "rateLimit:generous",
  },

  /**
   * Per-hour limit for resource-intensive operations
   * 50 requests per hour
   */
  hourly: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    keyPrefix: "rateLimit:hourly",
  },
} as const;

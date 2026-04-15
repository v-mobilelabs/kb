import { getAdminRtdb } from "./admin-rtdb.js";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests allowed per window
  keyPrefix?: string; // Optional custom prefix for RTDB keys
}

export interface RateLimitEntry {
  count: number;
  resetAt: number; // Timestamp when counter resets
}

/**
 * Rate limiter service using Firebase Realtime Database.
 * Tracks requests scoped to IP + API key combinations.
 */
export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly rtdb = getAdminRtdb();

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: "rateLimit",
      ...config,
    };
  }

  /**
   * Sanitize identifier for use in Firebase Realtime Database path.
   * Firebase paths cannot contain ".", "#", "$", "[", "]"
   */
  private sanitizeIdentifier(identifier: string): string {
    return identifier
      .replace(/\./g, "_")
      .replace(/:/g, "-")
      .replace(/#/g, "_")
      .replace(/\$/g, "_")
      .replace(/\[/g, "_")
      .replace(/\]/g, "_");
  }

  /**
   * Get the rate limit key for a given identifier (IP + API Key, etc.)
   */
  private getKey(identifier: string): string {
    const sanitized = this.sanitizeIdentifier(identifier);
    return `${this.config.keyPrefix}/${sanitized}`;
  }

  /**
   * Check if a request should be allowed and increment counter.
   * Returns { allowed: boolean, remaining: number, retryAfter?: number }
   */
  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
  }> {
    const key = this.getKey(identifier);
    const now = Date.now();

    try {
      // Get current entry
      const snap = await this.rtdb.ref(key).get();
      let entry: RateLimitEntry | null = null;

      if (snap.exists()) {
        entry = snap.val() as RateLimitEntry;
      }

      // Create new entry if doesn't exist or window expired
      if (!entry || now >= entry.resetAt) {
        entry = {
          count: 1,
          resetAt: now + this.config.windowMs,
        };
        await this.rtdb.ref(key).set(entry);
        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
        };
      }

      // Increment counter if within window
      if (entry.count < this.config.maxRequests) {
        entry.count += 1;
        await this.rtdb.ref(key).set(entry);
        return {
          allowed: true,
          remaining: this.config.maxRequests - entry.count,
        };
      }

      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000); // seconds
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[RateLimiter] Error checking limit:", message);
      // On error, allow the request (fail open) but log it
      return {
        allowed: true,
        remaining: this.config.maxRequests,
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    try {
      await this.rtdb.ref(key).remove();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[RateLimiter] Error resetting limit:", message);
    }
  }

  /**
   * Get current limit info for an identifier (for debugging)
   */
  async getLimitInfo(identifier: string): Promise<RateLimitEntry | null> {
    const key = this.getKey(identifier);
    try {
      const snap = await this.rtdb.ref(key).get();
      return snap.exists() ? (snap.val() as RateLimitEntry) : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[RateLimiter] Error getting limit info:", message);
      return null;
    }
  }
}

/**
 * Create a pre-configured rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter } from "../src/lib/rate-limiter.js";
import type { RateLimitConfig } from "../src/lib/rate-limiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;
  const testConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  };

  beforeEach(() => {
    limiter = new RateLimiter(testConfig);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkLimit", () => {
    it("should allow requests within limit", async () => {
      const result = await limiter.checkLimit("test-user");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });

    it("should increment counter on each request", async () => {
      const identifier = "test-user";

      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkLimit(identifier);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }

      // 6th request should be blocked
      const blocked = await limiter.checkLimit(identifier);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfter).toBeDefined();
    });

    it("should block requests when limit exceeded", async () => {
      const identifier = "test-user";

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(identifier);
      }

      // Next request should be blocked
      const result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should reset counter after window expires", async () => {
      const identifier = "test-user";

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(identifier);
      }

      // Should be blocked
      let result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(testConfig.windowMs + 1000);

      // Should reset and allow again
      result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should handle multiple identifiers independently", async () => {
      const id1 = "user-1";
      const id2 = "user-2";

      // Use up limit for id1
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(id1);
      }

      // id1 should be blocked
      let result1 = await limiter.checkLimit(id1);
      expect(result1.allowed).toBe(false);

      // id2 should still have requests
      let result2 = await limiter.checkLimit(id2);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(4);
    });

    it("should return retryAfter in seconds", async () => {
      const identifier = "test-user";

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(identifier);
      }

      const result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(typeof result.retryAfter).toBe("number");
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60); // Should be <= window
    });
  });

  describe("resetLimit", () => {
    it("should reset limit for identifier", async () => {
      const identifier = "test-user";

      // Use up limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(identifier);
      }

      let result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);

      // Reset limit
      await limiter.resetLimit(identifier);

      // Should be allowed again
      result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should not affect other identifiers when resetting", async () => {
      const id1 = "user-1";
      const id2 = "user-2";

      // Use up limits for both
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(id1);
        await limiter.checkLimit(id2);
      }

      // Both blocked
      expect((await limiter.checkLimit(id1)).allowed).toBe(false);
      expect((await limiter.checkLimit(id2)).allowed).toBe(false);

      // Reset id1
      await limiter.resetLimit(id1);

      // id1 should be allowed, id2 should still be blocked
      expect((await limiter.checkLimit(id1)).allowed).toBe(true);
      expect((await limiter.checkLimit(id2)).allowed).toBe(false);
    });
  });

  describe("getLimitInfo", () => {
    it("should return null if no limit entry exists", async () => {
      const info = await limiter.getLimitInfo("nonexistent");
      expect(info).toBeNull();
    });

    it("should return current limit info", async () => {
      const identifier = "test-user";

      // Make some requests
      for (let i = 0; i < 3; i++) {
        await limiter.checkLimit(identifier);
      }

      const info = await limiter.getLimitInfo(identifier);
      expect(info).not.toBeNull();
      expect(info?.count).toBe(3);
      expect(info?.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe("custom configuration", () => {
    it("should use custom keyPrefix", async () => {
      const customLimiter = new RateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 10,
        keyPrefix: "custom:rateLimit",
      });

      const result = await customLimiter.checkLimit("test");
      expect(result.allowed).toBe(true);
    });

    it("should respect custom window and max requests", async () => {
      const customLimiter = new RateLimiter({
        windowMs: 10 * 1000, // 10 seconds
        maxRequests: 2,
      });

      // Use up limit
      await customLimiter.checkLimit("test");
      await customLimiter.checkLimit("test");

      // Third should be blocked
      const result = await customLimiter.checkLimit("test");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});

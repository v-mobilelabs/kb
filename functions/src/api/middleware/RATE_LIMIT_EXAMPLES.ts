/**
 * Rate Limit Middleware Integration Examples
 *
 * Copy and adapt these examples to integrate rate limiting into your API routes.
 * All examples use the rate limit middleware defined in ./rate-limit.ts
 *
 * SIMPLE INTEGRATION:
 * ===================
 *
 * 1. Basic setup in app.ts:
 *
 *    import { createRateLimitMiddleware, rateLimiterConfigs } from "./middleware/rate-limit.js";
 *    const rateLimit = createRateLimitMiddleware(rateLimiterConfigs.standard);
 *    app.use("/api/v1/", rateLimit);
 *
 * 2. Apply to specific routes:
 *
 *    const rateLimit = createRateLimitMiddleware(rateLimiterConfigs.standard);
 *    app.get("/api/v1/endpoint", rateLimit, handler);
 *
 * 3. Apply to router:
 *
 *    const queryRouter = Router();
 *    const queryLimiter = createRateLimitMiddleware(rateLimiterConfigs.standard);
 *    queryRouter.use(queryLimiter);
 *    queryRouter.post("/search", handler);
 *
 * TIERED LIMITS:
 * ==============
 *
 * Standard (100 req/min):
 *   - General API endpoints
 *   - Suitable for most use cases
 *
 * Strict (10 req/min):
 *   - Auth endpoints
 *   - Payment operations
 *   - Sensitive data access
 *
 * Generous (500 req/min):
 *   - Batch operations
 *   - File uploads
 *   - Background jobs
 *
 * Hourly (50 req/hour):
 *   - Resource-intensive operations
 *   - Complex ML operations
 *
 * CUSTOM SCOPES:
 * ==============
 *
 * By Organization:
 *   identifierFn: (req) => `org:${req.orgId}`
 *
 * By User + IP:
 *   identifierFn: (req) => `user:${req.user.id}:${getClientIp(req)}`
 *
 * By API Key only:
 *   identifierFn: (req) => `key:${req.headers['x-api-key']}`
 *
 * See RATE_LIMIT.md for detailed documentation and complete examples.
 */

export {};

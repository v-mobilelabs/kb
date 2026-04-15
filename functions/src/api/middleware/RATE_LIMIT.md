# Rate Limit Middleware

A Firebase Realtime Database-backed rate limiting middleware for Express.js API functions. Scoped to IP + API key combinations.

## Features

- ✅ **RTDB Storage**: Uses Firebase Realtime Database for distributed rate limit tracking
- ✅ **IP + API Key Scoping**: Tracks requests by unique IP + API key combinations
- ✅ **Configurable Windows**: Support for minute/hour/custom time windows
- ✅ **Standard Headers**: Includes HTTP 429 status and `Retry-After` header
- ✅ **Fail-Open**: Allows requests on RTDB errors (circuit breaker pattern)
- ✅ **Custom Identifiers**: Support for custom identifier functions (user ID, org ID, etc.)
- ✅ **Pre-configured Presets**: Ready-to-use configurations (strict, standard, generous, hourly)

## Usage

### Basic Setup

```typescript
import {
  createRateLimitMiddleware,
  rateLimiterConfigs,
} from "./middleware/rate-limit.js";
import express from "express";

const app = express();

// Apply standard rate limiting to all authenticated routes
const rateLimit = createRateLimitMiddleware(rateLimiterConfigs.standard);
app.use("/api/v1/", rateLimit);

// Or apply to specific routes
app.get("/api/v1/query", rateLimit, queryHandler);
```

### Pre-configured Profiles

```typescript
// Strict: 10 req/min (auth, payment endpoints)
const strictLimit = createRateLimitMiddleware(rateLimiterConfigs.strict);

// Standard: 100 req/min (most API endpoints)
const standardLimit = createRateLimitMiddleware(rateLimiterConfigs.standard);

// Generous: 500 req/min (batch operations)
const generousLimit = createRateLimitMiddleware(rateLimiterConfigs.generous);

// Hourly: 50 req/hour (resource-intensive operations)
const hourlyLimit = createRateLimitMiddleware(rateLimiterConfigs.hourly);
```

### Custom Configuration

```typescript
const customLimit = createRateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
  keyPrefix: "rateLimit:custom",
});

app.use("/api/v1/expensive-op", customLimit, handler);
```

### Custom Identifier Function

```typescript
// By default: tracks by IP + API key
// Custom: by organization + user

const orgUserLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 100,
  identifierFn: (req) => {
    const authReq = req as AuthenticatedRequest;
    const userId = (req as any).user?.uid || "anonymous";
    return `${authReq.orgId}:${userId}`;
  },
});

app.use("/api/v1/user-action", orgUserLimit, handler);
```

### Custom Error Handler

```typescript
const rateLimitWithCustomHandler = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 100,
  onLimitExceeded: (req, res, retryAfter) => {
    res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please slow down.",
      retryAfter,
      statusCode: 429,
    });
  },
});
```

## Implementation Examples

### Applying to Specific Routes

```typescript
// In query-routes.ts
import { Router } from "express";
import {
  createRateLimitMiddleware,
  rateLimiterConfigs,
} from "../middleware/rate-limit.js";

const queryRouter = Router();
const queryLimiter = createRateLimitMiddleware(rateLimiterConfigs.standard);

queryRouter.post("/search", queryLimiter, async (req, res) => {
  // handler
});

queryRouter.post("/semantic-search", queryLimiter, async (req, res) => {
  // handler
});

export { queryRouter };
```

### Applying to Router Groups

```typescript
// In app.ts
import {
  createRateLimitMiddleware,
  rateLimiterConfigs,
} from "./middleware/rate-limit.js";

const app = express();

// Apply strict limiting to auth endpoints
const authLimiter = createRateLimitMiddleware(rateLimiterConfigs.strict);
app.use("/api/v1/auth", authLimiter, authRouter);

// Apply standard limiting to store endpoints
const storeLimiter = createRateLimitMiddleware(rateLimiterConfigs.standard);
app.use("/api/v1/store", storeLimiter, storeRouter);

// Apply generous limiting to file operations
const fileLimiter = createRateLimitMiddleware(rateLimiterConfigs.generous);
app.use("/api/v1/file", fileLimiter, fileRouter);
```

### Applying Globally to All Authenticated Routes

```typescript
// In app.ts
const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Global rate limiter (applies to all routes below)
const globalLimiter = createRateLimitMiddleware(rateLimiterConfigs.standard);

// All routes below inherit the rate limiter
app.use(validateApiKey);
app.use(globalLimiter);

app.use("/api/v1/store", storeRouter);
app.use("/api/v1/context", contextRouter);
app.use("/api/v1/query", queryRouter);
```

## RTDB Structure

Rate limits are stored in Firebase Realtime Database with the following structure:

```
/rateLimit/{identifier}
  count: number        // Current request count in window
  resetAt: timestamp   // When counter resets (epoch ms)
```

Example path: `/rateLimit/192.168.1.1:sk_prod_abc123`

```json
{
  "count": 5,
  "resetAt": 1713196523000
}
```

## Response Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100          // Max requests allowed in window
X-RateLimit-Remaining: 95       // Requests remaining in current window
Retry-After: 45                 // Seconds to wait before retry (if limited)
```

## Rate Limit Exceeded Response

When rate limit is exceeded (default handler):

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

Status code: `429 Too Many Requests`

## Testing Rate Limits

```bash
# Store API key in env
export API_KEY="sk_prod_abc123"
export BASE_URL="http://localhost:3000"

# Make rapid requests to test rate limit (100 req/min standard)
for i in {1..10}; do
  curl -X GET "$BASE_URL/api/v1/store/list" \
    -H "X-API-Key: $API_KEY"
  echo "Request $i - Status: $(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/store/list" -H "X-API-Key: $API_KEY")"
  sleep 0.1  # 100ms between requests
done
```

## Performance Notes

- **RTDB Lookups**: O(1) operation - no index scanning
- **Window Size vs Precision**: Shorter windows = more frequent updates to RTDB
- **Memory Impact**: Growing unbounded; see _Maintenance_ section below
- **Cache Duration**: Entries persist in RTDB until `resetAt` timestamp passes

## Maintenance

### Cleanup Old Entries

Rate limit entries accumulate in RTDB but don't cleanup automatically. Recommended approach:

```typescript
// In a scheduled Cloud Function (Cloud Scheduler + Pub/Sub)
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAdminRtdb } from "../lib/admin-rtdb.js";

export const cleanupRateLimits = onSchedule("every 1 hours", async () => {
  const rtdb = getAdminRtdb();
  const now = Date.now();

  // Query all rate limit entries
  const snapshot = await rtdb.ref("rateLimit").get();
  if (!snapshot.exists()) return;

  const expired: string[] = [];
  snapshot.forEach((child) => {
    const entry = child.val();
    if (entry.resetAt && entry.resetAt < now) {
      expired.push(child.key!);
    }
  });

  // Delete expired entries in batch
  if (expired.length > 0) {
    const updates: { [key: string]: null } = {};
    expired.forEach((key) => {
      updates[`rateLimit/${key}`] = null;
    });
    await rtdb.ref().update(updates);
    console.log(
      `[cleanupRateLimits] Removed ${expired.length} expired entries`,
    );
  }
});
```

## Migration Guide

### Adding to Existing Routes

1. **Import the middleware**:

   ```typescript
   import {
     createRateLimitMiddleware,
     rateLimiterConfigs,
   } from "../middleware/rate-limit.js";
   ```

2. **Create instance**:

   ```typescript
   const limiter = createRateLimitMiddleware(rateLimiterConfigs.standard);
   ```

3. **Apply to routes**:

   ```typescript
   router.post("/action", limiter, handler);
   // OR
   router.use(limiter); // Apply to entire router
   ```

4. **Test**: Deploy and verify via curl/browser with `X-RateLimit-Remaining` header

## Debugging

### Get Current Limit Info

```typescript
import { RateLimiter } from "../lib/rate-limiter.js";

const limiter = new RateLimiter(config);
const info = await limiter.getLimitInfo("192.168.1.1:sk_prod_abc123");
console.log(info); // { count: 5, resetAt: 1713196523000 }
```

### Reset Rate Limit

```typescript
const limiter = new RateLimiter(config);
await limiter.resetLimit("192.168.1.1:sk_prod_abc123");
```

### Monitor in Firebase Console

Navigate to **Realtime Database** → **Data** → `rateLimit` to see live rate limit entries.

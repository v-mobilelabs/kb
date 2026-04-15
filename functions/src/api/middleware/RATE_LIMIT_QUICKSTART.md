# Rate Limiter Integration - Quick Start

This guide shows how to add rate limiting to your existing `app.ts` using the new middleware.

## Files Created

- `functions/src/lib/rate-limiter.ts` — Core rate limiting logic (RTDB-backed)
- `functions/src/api/middleware/rate-limit.ts` — Express middleware + pre-configured profiles
- `functions/src/api/middleware/RATE_LIMIT.md` — Full documentation
- `functions/tests/lib/rate-limiter.test.ts` — Unit tests

## Quick Integration (3 steps)

### Step 1: Import the middleware

```typescript
// In functions/src/api/app.ts
import {
  createRateLimitMiddleware,
  rateLimiterConfigs,
} from "./middleware/rate-limit.js";
```

### Step 2: Create middleware instances

```typescript
// Choose pre-configured profiles or create custom
const strictLimit = createRateLimitMiddleware(rateLimiterConfigs.strict); // 10/min
const standardLimit = createRateLimitMiddleware(rateLimiterConfigs.standard); // 100/min
const generousLimit = createRateLimitMiddleware(rateLimiterConfigs.generous); // 500/min
```

### Step 3: Apply to routes

Choose one pattern based on your needs:

#### Option A: Global Rate Limit (simplest)

```typescript
app.use(validateApiKey);
app.use(standardLimit); // Apply to all routes below

app.use("/api/v1/store", storeRouter);
app.use("/api/v1/context", contextRouter);
// ... other routes inherit standardLimit
```

#### Option B: Tiered by Route

```typescript
app.use("/api/v1/auth", validateApiKey, strictLimit, authRouter);
app.use("/api/v1/store", validateApiKey, standardLimit, storeRouter);
app.use("/api/v1/file", validateApiKey, generousLimit, fileRouter);
```

#### Option C: Custom Per-Route

```typescript
const queryRouter = Router();

queryRouter.post(
  "/semantic-search",
  createRateLimitMiddleware(rateLimiterConfigs.strict),
  handler,
);
```

## Updated app.ts Example

```typescript
import express from "express";
import cors from "cors";
import { validateApiKey } from "./middleware/validate-api-key.js";
import { validateUserToken } from "./middleware/validate-user-token.js";
import {
  createRateLimitMiddleware,
  rateLimiterConfigs,
} from "./middleware/rate-limit.js";
import { storeRouter } from "./routes/store-routes.js";
import { contextRouter } from "./routes/context-routes.js";
import { queryRouter } from "./routes/query-routes.js";
import { memoryRouter } from "./routes/memory-routes.js";
import { fileRouter } from "./routes/file-routes.js";
import { playgroundRouter } from "./routes/playground-routes.js";
import { authRouter } from "./routes/auth-routes.js";
import { profileRouter } from "./routes/profile-routes.js";
import { openApiSpec } from "./openapi.js";

const app = express();

const corsOptions = {
  origin: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "X-API-Key", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Create rate limiters
const strictLimit = createRateLimitMiddleware(rateLimiterConfigs.strict);
const standardLimit = createRateLimitMiddleware(rateLimiterConfigs.standard);

// Public endpoints (no auth required)
app.use("/playground", playgroundRouter);
app.get("/api/v1/openapi.json", (_req, res) => res.json(openApiSpec));
app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

// Auth endpoints (strict limit, API key required)
app.use("/api/v1/auth", validateApiKey, strictLimit, authRouter);

// User profile endpoints (standard limit, token required)
app.use("/api/v1/profile", validateUserToken, standardLimit, profileRouter);

// Protected API endpoints
app.use(validateApiKey);
app.use(standardLimit); // Apply standard limit to all routes below

app.use("/api/v1/store", storeRouter);
app.use("/api/v1/context", contextRouter);
app.use("/api/v1/query", queryRouter);
app.use("/api/v1/memories", memoryRouter);
app.use("/api/v1/file", fileRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export { app };
```

## How Rate Limits Work

### Scoping (IP + API Key)

Default identifier: `192.168.1.100:sk_prod_abc123`

- **IP**: Extracted from request, handles proxies (X-Forwarded-For, X-Real-IP)
- **API Key**: From `X-API-Key` header
- **Result**: Each API key + IP combo has independent rate limit

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
Retry-After: 45
```

### Over Limit Response (429)

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

## RTDB Storage

Rate limits stored in Firebase Realtime Database at:

```
/rateLimit/{identifier}
  count: number
  resetAt: timestamp
```

Example: `/rateLimit/192.168.1.100:sk_prod_abc123`

Entries auto-expire when `resetAt` timestamp passes (optional cleanup recommended).

## Pre-configured Profiles

| Profile      | Limit   | Use Case                 |
| ------------ | ------- | ------------------------ |
| **strict**   | 10/min  | Auth, payment, sensitive |
| **standard** | 100/min | General API endpoints    |
| **generous** | 500/min | Batch, uploads           |
| **hourly**   | 50/hour | Resource-intensive       |

## Custom Configuration

```typescript
const customLimit = createRateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
  keyPrefix: "rateLimit:custom",
  identifierFn: (req) => {
    // Custom ID logic
    return `org:${req.orgId}:${req.user?.id}`;
  },
  onLimitExceeded: (req, res, retryAfter) => {
    // Custom response
    res.status(429).json({ retryAfter });
  },
});
```

## Testing Rate Limits

```bash
# Rapid requests to test limit
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/v1/store/list \
    -H "X-API-Key: sk_prod_test"
done
```

Check response headers:

```bash
curl -i http://localhost:3000/api/v1/store/list \
  -H "X-API-Key: sk_prod_test" | grep X-RateLimit
```

## Files Modified

None. This is a pure addition - no existing code needs to change.

## Files Created

- `functions/src/lib/rate-limiter.ts` (179 lines)
- `functions/src/api/middleware/rate-limit.ts` (173 lines)
- `functions/src/api/middleware/RATE_LIMIT.md` (Documentation)
- `functions/tests/lib/rate-limiter.test.ts` (Unit tests)

## Next Steps

1. **Review** the documentation at `functions/src/api/middleware/RATE_LIMIT.md`
2. **Choose** integration pattern above
3. **Deploy** to production with `firebase deploy --only functions`
4. **Monitor** rate limit hits in Cloud Logging
5. **Tune** limits based on actual usage patterns

## Handling Rate Limit Errors

### Client-side (JavaScript/Python/etc.)

```python
import time

def call_api_with_retry(url, headers, data=None):
    while True:
        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            print(f"Rate limited. Waiting {retry_after}s...")
            time.sleep(retry_after)
            continue

        return response
```

### Monitoring

Enable Cloud Logging to track rate limit hits:

```bash
gcloud functions logs read api \
  --filter='jsonPayload.error=RATE_LIMIT_EXCEEDED' \
  --limit 50
```

## Debugging

### Check Current Limit Status

```typescript
import { RateLimiter } from "../../lib/rate-limiter.js";

const limiter = new RateLimiter(rateLimiterConfigs.standard);
const info = await limiter.getLimitInfo("192.168.1.1:sk_prod_abc123");
console.log(info); // { count: 5, resetAt: 1713196523000 }
```

### Reset Specific Limit

```typescript
await limiter.resetLimit("192.168.1.1:sk_prod_abc123");
```

### View in Firebase Console

Dashboard → Realtime Database → Data → `rateLimit`

## Troubleshooting

### Rate limits not being enforced

1. Check middleware is applied before route handler
2. Verify RTDB rules allow `rateLimit/*` reads/writes
3. Check Cloud Functions logs: `gcloud functions logs read api`

### High latency or timeouts

RTDB lookups are O(1) and typically <10ms. If slow:

1. Check Cloud Functions memory (512MiB should be sufficient)
2. Monitor RTDB connection (`getAdminRtdb()` is singleton, safe)
3. Consider batching if checking limits in hot loop

### RTDB growing unbounded

Entries auto-expire but don't auto-delete. Optional hourly cleanup:

See RATE_LIMIT.md cleanup section for Cloud Function example.

---

Ready to integrate? Update `functions/src/api/app.ts` following the patterns above!

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

// CORS configuration - allows custom headers from browser requests
const corsOptions = {
  origin: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "X-API-Key", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Rate limiters (RTDB-backed, scoped to IP + API key)
const strictLimit = createRateLimitMiddleware(rateLimiterConfigs.strict); // 10 req/min
const standardLimit = createRateLimitMiddleware(rateLimiterConfigs.standard); // 100 req/min

// API Explorer playground (no auth required)
app.use("/playground", playgroundRouter);

// OpenAPI spec endpoint (no auth required)
app.get("/api/v1/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

// Health check (no auth)
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Auth endpoints (API key required, strict rate limit)
app.use("/api/v1/auth", validateApiKey, strictLimit, authRouter);

// User profile endpoints (user token required, standard rate limit)
app.use("/api/v1/profile", validateUserToken, standardLimit, profileRouter);

// All routes below require a valid API key and standard rate limiting
app.use(validateApiKey);
app.use(standardLimit);

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

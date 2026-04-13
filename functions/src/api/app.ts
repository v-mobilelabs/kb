import express from "express";
import { validateApiKey } from "./middleware/validate-api-key.js";
import { storeRouter } from "./routes/store-routes.js";
import { contextRouter } from "./routes/context-routes.js";
import { queryRouter } from "./routes/query-routes.js";
import { memoryRouter } from "./routes/memory-routes.js";
import { fileRouter } from "./routes/file-routes.js";
import { playgroundRouter } from "./routes/playground-routes.js";
import { openApiSpec } from "./openapi.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

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

// All routes below require a valid API key
app.use(validateApiKey);

app.use("/api/v1/store", storeRouter);
app.use("/api/v1/context", contextRouter);
app.use("/api/v1/query", queryRouter);
app.use("/api/v1/memories", memoryRouter);

app.use("/api/v1/file", fileRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export { app };

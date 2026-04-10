import express from "express";
import { validateApiKey } from "./middleware/validate-api-key.js";
import { storeRouter } from "./routes/store-routes.js";
import { queryRouter } from "./routes/query-routes.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

// Health check (no auth)
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

// All routes below require a valid API key
app.use(validateApiKey);

app.use("/api/v1/store", storeRouter);
app.use("/api/v1/query", queryRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export { app };

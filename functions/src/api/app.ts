import express from "express";
import multer from "multer";
import { validateApiKey } from "./middleware/validate-api-key.js";
import { storeRouter } from "./routes/store-routes.js";
import { queryRouter } from "./routes/query-routes.js";
import { memoryRouter } from "./routes/memory-routes.js";
import { fileRouter } from "./routes/file-routes.js";

const app = express();

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: "1mb" }));

// Health check (no auth)
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

// All routes below require a valid API key
app.use(validateApiKey);

app.use("/api/v1/store", storeRouter);
app.use("/api/v1/query", queryRouter);
app.use("/api/v1/memories", memoryRouter);

// File routes with multipart upload handling
app.post("/api/v1/file/upload", upload.single("file"), fileRouter);
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

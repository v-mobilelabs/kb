import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { validateRequestBody } from "../lib/request-validator.js";
import { queryRagFlow } from "../../workflows/query-rag/query-rag-flow.js";
import {
  logApiKeyUsageSuccess,
  logApiKeyUsageFailure,
} from "../../lib/audit-logger.js";
import type { AuthenticatedRequest } from "../middleware/validate-api-key.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

const QueryRequestSchema = z.object({
  storeId: z.string().trim().min(1, "storeId is required"),
  query: z.string().trim().min(1, "query is required"),
  filters: z.record(z.string(), z.coerce.string()).optional(),
  topK: z
    .number()
    .int()
    .positive("topK must be greater than 0")
    .max(50, "topK cannot exceed 50")
    .default(10),
  enableRagEvaluation: z.boolean().default(false),
});

const router = Router();

// POST /api/v1/query
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  const parsed = await validateRequestBody(QueryRequestSchema, req, res);
  if (!parsed) return;

  try {
    const result = await queryRagFlow({
      storeId: parsed.storeId,
      orgId,
      query: parsed.query,
      filters: parsed.filters,

      topK: parsed.topK!,

      enableRagEvaluation: parsed.enableRagEvaluation!,
    });

    await logApiKeyUsageSuccess(orgId, apiKeyId, {
      action: "query",
      storeId: parsed.storeId,
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "query",
      storeId: parsed.storeId,
      error: message,
    });

    console.error("[query-routes] Error executing query flow:", {
      message,
      stack,
      error,
    });

    res.status(500).json({
      error: "QUERY_ERROR",
      message,
      stack,
    });
  }
});

export { router as queryRouter };

import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  validateRequestBody,
  validateRequestParams,
  sendErrorResponse,
} from "../lib/request-validator.js";
import { getMemory, addMemoryDocument } from "../../data/memory.js";
import type { AuthenticatedRequest } from "../middleware/validate-api-key.js";
import { logApiKeyUsageFailure } from "../../lib/audit-logger.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

const MemoryParamSchema = z.object({
  memoryId: z.string().trim().min(1, "memoryId is required"),
});

const CreateMemoryDocumentSchema = z.object({
  content: z.string().min(1, "content is required").max(50_000),
  title: z.string().trim().max(200).optional(),
});

const router = Router({ mergeParams: true });

// GET /api/v1/memories/:memoryId — get memory detail
router.get("/:memoryId", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  const params = await validateRequestParams(MemoryParamSchema, req, res);
  if (!params) return;

  try {
    const memory = await getMemory(orgId, params.memoryId, apiKeyId);
    res.json({ memory });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "get_memory",
      memoryId: params.memoryId,
      error: errMsg,
    });
    sendErrorResponse(err, res, 500, "Failed to get memory");
  }
});

// POST /api/v1/memories/:memoryId — add a document to a memory
router.post(
  "/:memoryId",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(MemoryParamSchema, req, res);
    if (!params) return;

    const body = await validateRequestBody(
      CreateMemoryDocumentSchema,
      req,
      res,
    );
    if (!body) return;

    try {
      const document = await addMemoryDocument(
        orgId,
        params.memoryId,
        apiKeyId,
        body.content,
        body.title,
      );
      res.status(201).json({ document });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "create_memory_document",
        memoryId: params.memoryId,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to create memory document");
    }
  },
);

export { router as memoryRouter };

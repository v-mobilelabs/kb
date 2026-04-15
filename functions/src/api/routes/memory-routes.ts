import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  validateRequestBody,
  validateRequestParams,
  sendErrorResponse,
} from "../lib/request-validator.js";
import {
  getMemory,
  addMemoryDocument,
  createMemory,
  getMemoryDocuments,
} from "../../data/memory.js";
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

const CreateMemorySchema = z.object({
  description: z.string().max(1000).optional().nullable(),
  documentCapacity: z.number().int().min(1).optional(),
  condenseThresholdPercent: z.number().int().min(1).max(100).optional(),
});

const router = Router({ mergeParams: true });

// POST /api/v1/memories — create a new memory
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  const body = await validateRequestBody(CreateMemorySchema, req, res);
  if (!body) return;

  try {
    const memory = await createMemory(orgId, apiKeyId, {
      description: body.description,
      documentCapacity: body.documentCapacity,
      condenseThresholdPercent: body.condenseThresholdPercent,
    });
    res.status(201).json({ memory });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "create_memory",
      error: errMsg,
    });
    sendErrorResponse(err, res, 500, "Failed to create memory");
  }
});

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

// GET /api/v1/memories/:memoryId/documents — list memory documents
router.get(
  "/:memoryId/documents",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(MemoryParamSchema, req, res);
    if (!params) return;

    try {
      const result = await getMemoryDocuments(orgId, params.memoryId, apiKeyId);
      res.json(result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "get_memory_documents",
        memoryId: params.memoryId,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to get memory documents");
    }
  },
);

// POST /api/v1/memories/:memoryId/documents — add a document to a memory
router.post(
  "/:memoryId/documents",
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

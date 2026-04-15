import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  validateRequestBody,
  validateRequestParams,
  sendErrorResponse,
} from "../lib/request-validator.js";
import {
  createContext,
  getContextDocuments,
  addContextDocument,
  deleteContextDocuments,
  deleteContext,
} from "../../data/context.js";
import type { AuthenticatedRequest } from "../middleware/validate-api-key.js";
import { logApiKeyUsageFailure } from "../../lib/audit-logger.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateContextSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  description: z.string().optional().nullable(),
  windowSize: z.number().positive().optional().nullable(),
});

const AddContextDocumentSchema = z.object({
  role: z
    .enum(["system", "user", "assistant"])
    .describe("Role of the document"),
  parts: z.array(z.unknown()).describe("Content parts of the document"),
  metadata: z.unknown().optional().nullable().describe("Optional metadata"),
});

const ContextIdParamSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

const router = Router();

// POST /api/v1/context — create a context
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  const parsed = await validateRequestBody(CreateContextSchema, req, res);
  if (!parsed) return;

  try {
    const context = await createContext({
      orgId,
      apiKeyId,
      name: parsed.name,
      description: parsed.description,
      windowSize: parsed.windowSize,
    });
    res.status(201).json({ context });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "create_context",
      error: errMsg,
    });
    sendErrorResponse(err, res, 500, "Failed to create context");
  }
});

// POST /api/v1/context/:id/documents — add a document to a context
router.post(
  "/:id/documents",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(ContextIdParamSchema, req, res);
    if (!params) return;

    const parsed = await validateRequestBody(
      AddContextDocumentSchema,
      req,
      res,
    );
    if (!parsed) return;

    try {
      const document = await addContextDocument(
        orgId,
        params.id,
        apiKeyId,
        parsed.role,
        parsed.parts,
        parsed.metadata,
      );
      res.status(201).json({ document });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "add_context_document",
        contextId: params.id,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to add context document");
    }
  },
);

// GET /api/v1/context/:id/documents — get context documents
router.get(
  "/:id/documents",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(ContextIdParamSchema, req, res);
    if (!params) return;

    try {
      const documents = await getContextDocuments(orgId, params.id);
      res.json({ documents });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "get_context_documents",
        contextId: params.id,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to get context documents");
    }
  },
);

// DELETE /api/v1/context/:id/documents — delete all documents in a context
router.delete(
  "/:id/documents",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(ContextIdParamSchema, req, res);
    if (!params) return;

    try {
      await deleteContextDocuments(orgId, params.id, apiKeyId);
      res.json({ deleted: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "delete_context_documents",
        contextId: params.id,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to delete context documents");
    }
  },
);

// DELETE /api/v1/context/:id — delete a context and all its data
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  const params = await validateRequestParams(ContextIdParamSchema, req, res);
  if (!params) return;

  try {
    await deleteContext(orgId, params.id, apiKeyId);
    res.json({ deleted: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "delete_context",
      contextId: params.id,
      error: errMsg,
    });
    sendErrorResponse(err, res, 500, "Failed to delete context");
  }
});

export { router as contextRouter };

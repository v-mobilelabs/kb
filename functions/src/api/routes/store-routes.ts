import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  validateRequestBody,
  validateRequestParams,
  sendErrorResponse,
} from "../lib/request-validator.js";
import {
  createStore,
  updateStore,
  deleteStore,
  getStoreDocuments,
  createStoreDocument,
  updateStoreDocument,
} from "../../data/store.js";
import type { AuthenticatedRequest } from "../middleware/validate-api-key.js";
import { logApiKeyUsageFailure } from "../../lib/audit-logger.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

const SourceSchema = z.object({
  id: z.string().trim().min(1, "source.id is required"),
  collection: z.string().trim().min(1, "source.collection is required"),
});

const CreateStoreSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  description: z.string().optional().nullable(),
  source: SourceSchema,
});

const UpdateStoreSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional().nullable(),
  source: SourceSchema.optional(),
});

const StoreParamSchema = z.object({
  storeId: z.string().trim().min(1, "storeId is required"),
});

const StoreDocumentParamSchema = z.object({
  storeId: z.string().trim().min(1, "storeId is required"),
  id: z.string().trim().min(1, "id is required"),
});

const CreateStoreDocumentSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(100),
  source: SourceSchema,
  data: z.unknown(),
  keywords: z.array(z.string().max(50)).max(50).optional(),
});

const UpdateStoreDocumentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  source: SourceSchema.optional(),
  data: z.unknown().optional(),
  keywords: z.array(z.string().max(50)).max(50).optional(),
});

const router = Router();

// POST /api/v1/store — create a store
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  const parsed = await validateRequestBody(CreateStoreSchema, req, res);
  if (!parsed) return;

  try {
    const store = await createStore({
      orgId,
      apiKeyId,
      name: parsed.name,
      description: parsed.description,
      source: parsed.source,
    });
    res.status(201).json({ store });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "create_store",
      error: errMsg,
    });
    sendErrorResponse(err, res, 500, "Failed to create store");
  }
});

// PUT /api/v1/store/:storeId — update a store
router.put("/:storeId", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  const params = await validateRequestParams(StoreParamSchema, req, res);
  if (!params) return;

  const body = await validateRequestBody(UpdateStoreSchema, req, res);
  if (!body) return;

  try {
    const store = await updateStore({
      orgId,
      storeId: params.storeId,
      apiKeyId,
      name: body.name,
      description: body.description,
      source: body.source,
    });
    res.json({ store });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "update_store",
      storeId: params.storeId,
      error: errMsg,
    });
    sendErrorResponse(err, res, 500, "Failed to update store");
  }
});

// GET /api/v1/store/:storeId/documents — list store documents
router.get(
  "/:storeId/documents",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(StoreParamSchema, req, res);
    if (!params) return;

    try {
      const result = await getStoreDocuments(orgId, params.storeId);
      res.json(result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "get_store_documents",
        storeId: params.storeId,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to get store documents");
    }
  },
);

// POST /api/v1/store/:storeId/documents — create a store document
router.post(
  "/:storeId/documents",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(StoreParamSchema, req, res);
    if (!params) return;

    const body = await validateRequestBody(CreateStoreDocumentSchema, req, res);
    if (!body) return;

    try {
      const document = await createStoreDocument(
        orgId,
        params.storeId,
        apiKeyId,
        body.name,
        body.source,
        body.data,
        body.keywords,
      );
      res.status(201).json({ document });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "create_store_document",
        storeId: params.storeId,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to create store document");
    }
  },
);

// PUT /api/v1/store/:storeId/documents/:id — update a store document
router.put(
  "/:storeId/documents/:id",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(
      StoreDocumentParamSchema,
      req,
      res,
    );
    if (!params) return;

    const body = await validateRequestBody(UpdateStoreDocumentSchema, req, res);
    if (!body) return;

    try {
      const document = await updateStoreDocument(
        orgId,
        params.storeId,
        params.id,
        apiKeyId,
        body,
      );
      res.json({ document });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "update_store_document",
        storeId: params.storeId,
        documentId: params.id,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to update store document");
    }
  },
);

// DELETE /api/v1/store/:storeId — delete a store and all its documents
router.delete(
  "/:storeId",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(StoreParamSchema, req, res);
    if (!params) return;

    try {
      await deleteStore(orgId, params.storeId, apiKeyId);
      res.json({ deleted: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "delete_store",
        storeId: params.storeId,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to delete store");
    }
  },
);

export { router as storeRouter };

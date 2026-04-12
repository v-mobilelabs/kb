import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  validateRequestBody,
  validateRequestParams,
  sendErrorResponse,
} from "../lib/request-validator.js";
import { createStore, updateStore, deleteStore } from "../../data/store.js";
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

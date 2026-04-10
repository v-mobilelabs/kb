import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  validateRequestBody,
  validateRequestParams,
  sendErrorResponse,
} from "../lib/request-validator.js";
import { adminDb } from "../../lib/admin-firestore.js";
import {
  logApiKeyUsageSuccess,
  logApiKeyUsageFailure,
} from "../../lib/audit-logger.js";
import { Timestamp } from "firebase-admin/firestore";
import type { AuthenticatedRequest } from "../middleware/validate-api-key.js";

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
    const ref = adminDb.collection(`organizations/${orgId}/stores`).doc();
    const now = Timestamp.now();
    const store = {
      orgId,
      name: parsed.name,
      description: parsed.description || null,
      source: parsed.source,
      documentCount: 0,
      customCount: 0,
      createdBy: `api:${apiKeyId}`,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.runTransaction(async (tx) => {
      tx.set(ref, store);
    });
    await logApiKeyUsageSuccess(orgId, apiKeyId, {
      action: "create_store",
      storeId: ref.id,
    });
    res.status(201).json({ store: { id: ref.id, ...store } });
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

  const { storeId } = params;
  const storeRef = adminDb.doc(`organizations/${orgId}/stores/${storeId}`);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(storeRef);

      if (!snap.exists) {
        throw new Error("Store not found");
      }

      const data = snap.data() as Record<string, unknown>;
      if (data.orgId !== orgId) {
        throw new Error("Forbidden");
      }

      const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };

      if (body.name !== undefined) {
        updates.name = body.name;
      }

      if (body.description !== undefined) {
        updates.description = body.description || null;
      }

      if (body.source !== undefined) {
        updates.source = body.source;
      }

      tx.update(storeRef, updates);
      return { id: storeId, ...data, ...updates };
    });

    await logApiKeyUsageSuccess(orgId, apiKeyId, {
      action: "update_store",
      storeId,
    });
    res.json({ store: result });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logApiKeyUsageFailure(orgId, apiKeyId, {
      action: "update_store",
      storeId,
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

    const { storeId } = params;
    const storeRef = adminDb.doc(`organizations/${orgId}/stores/${storeId}`);

    try {
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(storeRef);

        if (!snap.exists) {
          // idempotent: return success if already deleted
          return;
        }

        const data = snap.data() as Record<string, unknown>;
        if (data.orgId !== orgId) {
          throw new Error("Forbidden");
        }

        // Delete all subcollection documents
        const docsSnap = await adminDb
          .collection(`organizations/${orgId}/stores/${storeId}/documents`)
          .get();

        for (const doc of docsSnap.docs) {
          tx.delete(doc.ref);
        }

        // Delete the store itself
        tx.delete(storeRef);
      });

      await logApiKeyUsageSuccess(orgId, apiKeyId, {
        action: "delete_store",
        storeId,
      });
      res.json({ deleted: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logApiKeyUsageFailure(orgId, apiKeyId, {
        action: "delete_store",
        storeId,
        error: errMsg,
      });
      sendErrorResponse(err, res, 500, "Failed to delete store");
    }
  },
);

export { router as storeRouter };

import { randomUUID } from "node:crypto";
import { adminRtdb } from "@/lib/firebase/admin";
import { appError, err, ok, type AppError, type Result } from "@/lib/result";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";
import type { DocumentSortKey } from "@/data/contexts/dto/context-dto";

export interface PaginatedDocumentResult {
  items: ContextDocument[];
  hasNext: boolean;
  nextCursor: string | null;
}

export class ContextDocumentRepository {
  private ref(orgId: string, contextId: string) {
    return adminRtdb.ref(
      `organizations/${orgId}/contexts/${contextId}/documents`,
    );
  }

  async create(
    orgId: string,
    contextId: string,
    data: Pick<ContextDocument, "role" | "parts" | "metadata"> & {
      createdBy: string;
    },
  ): Promise<Result<ContextDocument, AppError>> {
    try {
      const docId = randomUUID();
      const doc: ContextDocument = {
        id: docId,
        role: data.role,
        parts: data.parts,
        metadata: data.metadata,
      };
      await this.ref(orgId, contextId).child(docId).set(doc);
      return ok(doc);
    } catch (cause) {
      return err(
        appError("INTERNAL_ERROR", "Failed to create document", cause),
      );
    }
  }

  async findById(
    orgId: string,
    contextId: string,
    docId: string,
  ): Promise<Result<ContextDocument, AppError>> {
    try {
      const snap = await this.ref(orgId, contextId).child(docId).get();
      if (!snap.exists()) {
        return err(appError("NOT_FOUND", `Document ${docId} not found`));
      }
      return ok(snap.val() as ContextDocument);
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to get document", cause));
    }
  }

  async list(
    orgId: string,
    contextId: string,
    options: {
      sort?: DocumentSortKey;
      cursor?: string;
      limit?: number;
      filterId?: string;
    },
  ): Promise<Result<PaginatedDocumentResult, AppError>> {
    const { sort = "id_desc", cursor, filterId } = options;
    const pageSize = Math.min(options.limit ?? 25, 100);

    console.log(
      "[ContextDocumentRepository.list] orgId:",
      orgId,
      "contextId:",
      contextId,
      "sort:",
      sort,
      "filterId:",
      filterId,
    );

    try {
      // FR-012: filterId = direct RTDB child read (exact UUID match)
      if (filterId) {
        const snap = await this.ref(orgId, contextId).child(filterId).get();
        if (!snap.exists())
          return ok({ items: [], hasNext: false, nextCursor: null });
        return ok({
          items: [snap.val() as ContextDocument],
          hasNext: false,
          nextCursor: null,
        });
      }

      const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];

      let query;
      if (sortDir === "asc") {
        query = cursor
          ? this.ref(orgId, contextId)
              .orderByChild(sortField)
              .startAfter(cursor)
              .limitToFirst(pageSize + 1)
          : this.ref(orgId, contextId)
              .orderByChild(sortField)
              .limitToFirst(pageSize + 1);
      } else {
        query = cursor
          ? this.ref(orgId, contextId)
              .orderByChild(sortField)
              .endBefore(cursor)
              .limitToLast(pageSize + 1)
          : this.ref(orgId, contextId)
              .orderByChild(sortField)
              .limitToLast(pageSize + 1);
      }

      const snap = await query.get();
      if (!snap.exists()) {
        console.log("[ContextDocumentRepository.list] No documents found");
        return ok({ items: [], hasNext: false, nextCursor: null });
      }

      let items: ContextDocument[] = [];
      snap.forEach((child) => {
        items.push(child.val() as ContextDocument);
      });

      console.log(
        "[ContextDocumentRepository.list] Found",
        items.length,
        "items before pagination",
      );

      if (sortDir === "desc") items = items.reverse();

      const hasNext = items.length > pageSize;
      if (hasNext) items = items.slice(0, pageSize);

      const lastItem = items.at(-1);
      const nextCursor =
        hasNext && lastItem
          ? String(lastItem[sortField as "id" | "role"])
          : null;

      return ok({ items, hasNext, nextCursor });
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to list documents", cause));
    }
  }

  async update(
    orgId: string,
    contextId: string,
    docId: string,
    data: Pick<Partial<ContextDocument>, "role" | "parts" | "metadata">,
  ): Promise<Result<ContextDocument, AppError>> {
    try {
      const existingResult = await this.findById(orgId, contextId, docId);
      if (!existingResult.ok) return existingResult;

      const patch: Partial<ContextDocument> = {
        ...data,
        // Explicitly never overwrite immutable fields
        id: undefined,
      };

      // Remove undefined keys before writing
      const cleanPatch = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      );

      await this.ref(orgId, contextId).child(docId).update(cleanPatch);

      // Re-read for accurate response
      const updatedSnap = await this.ref(orgId, contextId).child(docId).get();
      return ok(updatedSnap.val() as ContextDocument);
    } catch (cause) {
      return err(
        appError("INTERNAL_ERROR", "Failed to update document", cause),
      );
    }
  }

  async delete(
    orgId: string,
    contextId: string,
    docId: string,
  ): Promise<Result<true, AppError>> {
    try {
      const snap = await this.ref(orgId, contextId).child(docId).get();
      if (!snap.exists())
        return err(appError("NOT_FOUND", "Document not found"));
      await this.ref(orgId, contextId).child(docId).remove();
      return ok(true);
    } catch (cause) {
      return err(
        appError("INTERNAL_ERROR", "Failed to delete document", cause),
      );
    }
  }

  async deleteAll(
    orgId: string,
    contextId: string,
  ): Promise<Result<true, AppError>> {
    try {
      await this.ref(orgId, contextId).remove();
      return ok(true);
    } catch (cause) {
      return err(
        appError("INTERNAL_ERROR", "Failed to delete all documents", cause),
      );
    }
  }

  async grantAccess(
    orgId: string,
    userId: string,
    contextId: string,
  ): Promise<Result<true, AppError>> {
    try {
      await adminRtdb
        .ref(
          `organizations/${orgId}/contextAccessControl/${userId}/${contextId}`,
        )
        .set(true);
      return ok(true);
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to grant access", cause));
    }
  }

  async revokeAccess(
    orgId: string,
    userId: string,
    contextId: string,
  ): Promise<Result<true, AppError>> {
    try {
      await adminRtdb
        .ref(
          `organizations/${orgId}/contextAccessControl/${userId}/${contextId}`,
        )
        .remove();
      return ok(true);
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to revoke access", cause));
    }
  }

  async revokeAllAccessForContext(
    orgId: string,
    contextId: string,
  ): Promise<Result<true, AppError>> {
    try {
      const snap = await adminRtdb
        .ref(`organizations/${orgId}/contextAccessControl`)
        .get();
      if (!snap.exists()) return ok(true);

      const updates: Record<string, null> = {};
      snap.forEach((userNode) => {
        if (userNode.child(contextId).exists()) {
          updates[
            `organizations/${orgId}/contextAccessControl/${userNode.key}/${contextId}`
          ] = null;
        }
      });

      if (Object.keys(updates).length > 0) {
        await adminRtdb.ref("/").update(updates);
      }
      return ok(true);
    } catch (cause) {
      return err(
        appError("INTERNAL_ERROR", "Failed to revoke all access", cause),
      );
    }
  }
}

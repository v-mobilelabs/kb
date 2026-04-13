import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import type { Context } from "@/data/contexts/models/context.model";
import { appError, err, ok, type AppError, type Result } from "@/lib/result";
import { adminDb } from "@/lib/firebase/admin";
import type { ContextSortKey } from "@/data/contexts/dto/context-dto";

export interface PaginatedContextResult {
  items: Context[];
  nextCursor: string | null;
}

export class ContextRepository extends AbstractFirebaseRepository<Context> {
  constructor(private readonly orgId: string) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/contexts`;
  }

  protected fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): Context {
    const d = snap.data();
    return {
      id: snap.id,
      orgId: d.orgId as string,
      name: d.name as string,
      windowSize: (d.windowSize as number | null) ?? null,
      documentCount: (d.documentCount as number) ?? 0,
      createdBy: d.createdBy as string,
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate()
          : new Date(d.createdAt as string),
      updatedAt:
        d.updatedAt instanceof Timestamp
          ? d.updatedAt.toDate()
          : new Date(d.updatedAt as string),
    };
  }

  private parseSortKey(sort: ContextSortKey): {
    field: string;
    dir: "asc" | "desc";
  } {
    const [field, dir] = sort.split("_") as [string, "asc" | "desc"];
    return { field, dir };
  }

  async findByOrgPaginated(options: {
    sort?: ContextSortKey;
    cursor?: string;
    limit?: number;
  }): Promise<Result<PaginatedContextResult, AppError>> {
    const { sort = "updatedAt_desc", cursor, limit = 25 } = options;
    const { field, dir } = this.parseSortKey(sort);
    const pageSize = Math.min(limit, 100);

    try {
      let query = this.collection()
        .orderBy(field, dir)
        .orderBy("__name__", dir)
        .limit(pageSize + 1);

      if (cursor) {
        const [sortVal, docId] = cursor.split("|");
        const docSnap = await this.docRef(docId).get();
        if (!docSnap.exists) {
          return err(appError("NOT_FOUND", "Cursor document not found"));
        }
        const sortValue = field === "name" ? sortVal : new Date(sortVal ?? "");
        query = query.startAfter(sortValue, docSnap);
      }

      const snap = await query.get();
      const all = snap.docs.map((d) =>
        this.fromFirestore(d as QueryDocumentSnapshot<DocumentData>),
      );
      const hasNext = all.length > pageSize;
      const items = hasNext ? all.slice(0, pageSize) : all;

      let nextCursor: string | null = null;
      if (hasNext && items.length > 0) {
        const last = items[items.length - 1]!;
        let sortValue: string;
        if (field === "name") {
          sortValue = last.name;
        } else if (field === "createdAt") {
          sortValue = last.createdAt.toISOString();
        } else {
          sortValue = last.updatedAt.toISOString();
        }
        nextCursor = `${sortValue}|${last.id}`;
      }

      return ok({ items, nextCursor });
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to list contexts", cause));
    }
  }

  async create(data: Omit<Context, "id">): Promise<Result<Context, AppError>> {
    try {
      const ref = this.collection().doc();
      await ref.set({
        ...this.toFirestore(data),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const snap = await ref.get();
      return ok(
        this.fromFirestore(snap as QueryDocumentSnapshot<DocumentData>),
      );
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to create context", cause));
    }
  }

  async update(
    contextId: string,
    data: Partial<Pick<Context, "name" | "windowSize">>,
  ): Promise<Result<Context, AppError>> {
    try {
      const ref = this.docRef(contextId);
      await ref.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const snap = await ref.get();
      return ok(
        this.fromFirestore(snap as QueryDocumentSnapshot<DocumentData>),
      );
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to update context", cause));
    }
  }

  async updateWithConflictDetection(
    contextId: string,
    input: Partial<Pick<Context, "name" | "windowSize">>,
    currentName?: string,
  ): Promise<Result<Context, AppError>> {
    try {
      const ref = this.docRef(contextId);
      let updated: Context | null = null;

      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
        }

        const current = this.fromFirestore(
          snap as QueryDocumentSnapshot<DocumentData>,
        );

        // FR-019: if caller provided current name, verify it hasn't changed
        if (
          currentName !== undefined &&
          input.name !== undefined &&
          current.name !== currentName
        ) {
          throw Object.assign(new Error("CONFLICT"), { code: "CONFLICT" });
        }

        const patch: Record<string, unknown> = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (input.name !== undefined) patch.name = input.name;
        if (input.windowSize !== undefined) patch.windowSize = input.windowSize;

        tx.update(ref, patch);
        // Return optimistic value; caller re-reads after
        updated = { ...current, ...input, updatedAt: new Date() };
      });

      if (!updated) throw new Error("Transaction produced no result");
      // Re-read for server timestamps
      const snap = await ref.get();
      return ok(
        this.fromFirestore(snap as QueryDocumentSnapshot<DocumentData>),
      );
    } catch (cause: unknown) {
      if (cause instanceof Error) {
        if ((cause as NodeJS.ErrnoException).code === "NOT_FOUND")
          return err(appError("NOT_FOUND", "Context not found"));
        if ((cause as NodeJS.ErrnoException).code === "CONFLICT")
          return err(
            appError(
              "CONFLICT",
              "Context was modified from another session. Please refresh and retry.",
            ),
          );
      }
      return err(appError("INTERNAL_ERROR", "Failed to update context", cause));
    }
  }

  async delete(contextId: string): Promise<Result<void, AppError>> {
    try {
      const ref = this.docRef(contextId);
      const snap = await ref.get();
      if (!snap.exists) return err(appError("NOT_FOUND", "Context not found"));
      await ref.delete();
      return ok(undefined);
    } catch (cause) {
      return err(appError("INTERNAL_ERROR", "Failed to delete context", cause));
    }
  }

  async incrementDocumentCount(
    contextId: string,
    delta: 1 | -1,
  ): Promise<Result<true, AppError>> {
    try {
      await adminDb.runTransaction(async (tx) => {
        const ref = this.docRef(contextId);
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error("Context not found");
        const current = (snap.data()!.documentCount as number) ?? 0;
        tx.update(ref, {
          documentCount: Math.max(0, current + delta),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return ok(true);
    } catch (cause) {
      return err(
        appError("INTERNAL_ERROR", "Failed to update document count", cause),
      );
    }
  }
}

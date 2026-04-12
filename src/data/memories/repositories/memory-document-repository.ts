import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import { encodeCursor } from "@/lib/cursor";
import { type AppError, type Result, ok, err, appError } from "@/lib/result";
import type { MemoryDocument } from "@/data/memories/types";
import type { MemoryDocumentSortKey } from "@/data/memories/schemas";
import type { PaginatedResult } from "./memory-repository";
import { adminDb } from "@/lib/firebase/admin";

export class MemoryDocumentRepository extends AbstractFirebaseRepository<MemoryDocument> {
  constructor(
    private readonly orgId: string,
    private readonly memoryId: string,
  ) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/memories/${this.memoryId}/documents`;
  }

  private get memoryRef() {
    return adminDb.doc(`organizations/${this.orgId}/memories/${this.memoryId}`);
  }

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): MemoryDocument {
    const d = snap.data();
    const toDate = (field: unknown): Date => {
      if (field instanceof Timestamp) return field.toDate();
      return new Date(field as string);
    };

    return {
      id: snap.id,
      title: d.title as string,
      content: (d.content as string) ?? "",
      isCondensationSummary: (d.isCondensationSummary as boolean) ?? false,
      sessionId: d.sessionId as string,
      createdAt: toDate(d.createdAt),
      updatedAt: toDate(d.updatedAt),
    };
  }

  async findByMemoryPaginated(options: {
    q?: string;
    sort: MemoryDocumentSortKey;
    includeCondensed?: boolean;
    cursor?: string;
    limit: number;
  }): Promise<Result<PaginatedResult<MemoryDocument>, AppError>> {
    const { q = "", sort, includeCondensed = true, limit } = options;
    const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];

    const filters: { field: string; op: ">=" | "<=" | "=="; value: unknown }[] =
      [];
    if (q) {
      filters.push(
        { field: "title", op: ">=", value: q },
        { field: "title", op: "<=", value: q + "\uf8ff" },
      );
    }
    if (!includeCondensed) {
      filters.push({ field: "isCondensationSummary", op: "==", value: false });
    }

    const res = await this.findAll({
      filters,
      orderBy: { field: sortField, direction: sortDir },
      limit: limit + 1,
    });

    if (!res.ok) return res;

    const allDocs = res.value;
    const hasNext = allDocs.length > limit;
    const items = allDocs.slice(0, limit);

    let nextCursor: string | null = null;
    if (hasNext && items.length > 0) {
      const lastItem = items.at(-1)!;
      let sortValue: string | number;
      if (sortField === "createdAt") {
        sortValue = lastItem.createdAt.getTime();
      } else if (sortField === "updatedAt") {
        sortValue = lastItem.updatedAt.getTime();
      } else {
        sortValue = lastItem.title;
      }
      nextCursor = encodeCursor({ id: lastItem.id, sortValue });
    }

    return ok({ items, nextCursor });
  }

  async createWithIncrement(
    data: Omit<MemoryDocument, "id">,
  ): Promise<Result<MemoryDocument, AppError>> {
    const ref = this.collection().doc();
    const payload = this.toFirestore(data);

    const batch = this.getBatch();
    batch.set(ref, { ...payload, id: ref.id });
    batch.update(this.memoryRef, {
      documentCount: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    return ok({ ...data, id: ref.id } as MemoryDocument);
  }

  async deleteWithDecrement(
    documentId: string,
  ): Promise<Result<void, AppError>> {
    const existsRes = await this.exist(documentId);
    if (!existsRes.ok) return err(existsRes.error);
    if (!existsRes.value) return ok(undefined);

    const batch = this.getBatch();
    batch.delete(this.docRef(documentId));
    batch.update(this.memoryRef, {
      documentCount: FieldValue.increment(-1),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    return ok(undefined);
  }

  async evictOldestDocumentsToCapacity(
    currentCount: number,
    capacity: number,
  ): Promise<Result<number, AppError>> {
    const excess = currentCount - capacity;
    if (excess <= 0) return ok(0);

    const oldestSnap = await this.collection()
      .orderBy("createdAt", "asc")
      .limit(excess)
      .get();

    if (oldestSnap.empty) return ok(0);

    const batch = this.getBatch();
    for (const doc of oldestSnap.docs) {
      batch.delete(doc.ref);
    }
    batch.update(this.memoryRef, {
      documentCount: FieldValue.increment(-oldestSnap.size),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    return ok(oldestSnap.size);
  }
}

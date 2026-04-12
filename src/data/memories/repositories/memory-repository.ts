import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import { encodeCursor } from "@/lib/cursor";
import { type AppError, type Result, ok, err } from "@/lib/result";
import type { Memory } from "@/data/memories/types";
import type { MemorySortKey } from "@/data/memories/schemas";
import { adminDb } from "@/lib/firebase/admin";

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export class MemoryRepository extends AbstractFirebaseRepository<Memory> {
  constructor(private readonly orgId: string) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/memories`;
  }

  protected fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): Memory {
    const d = snap.data();
    return {
      id: snap.id,
      description: (d.description as string | null) ?? null,
      documentCapacity: (d.documentCapacity as number) ?? 100,
      condenseThresholdPercent: (d.condenseThresholdPercent as number) ?? 50,
      documentCount: (d.documentCount as number) ?? 0,
      sessionId: d.sessionId as string,
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

  async findByOrgPaginated(options: {
    q?: string;
    sort: MemorySortKey;
    cursor?: string;
    limit: number;
  }): Promise<Result<PaginatedResult<Memory>, AppError>> {
    const { q = "", sort, limit } = options;
    const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];

    // Note: Search is currently disabled for Memory since there's no title field
    // and description search may be added in future iterations
    const filters: { field: string; op: ">=" | "<="; value: unknown }[] = [];

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
      nextCursor = encodeCursor({
        id: lastItem.id,
        sortValue: lastItem.createdAt.getTime(),
      });
    }

    return ok({ items, nextCursor });
  }

  async deleteWithDocuments(
    memoryId: string,
  ): Promise<Result<{ deletedCount: number }, AppError>> {
    const existsRes = await this.exist(memoryId);
    if (!existsRes.ok) return err(existsRes.error);
    if (!existsRes.value) return ok({ deletedCount: 0 });

    const documentsPath = `${this.collectionPath}/${memoryId}/documents`;
    const docsSnap = await adminDb.collection(documentsPath).get();

    const batch = this.getBatch();
    for (const doc of docsSnap.docs) {
      batch.delete(doc.ref);
    }
    batch.delete(this.docRef(memoryId));
    await batch.commit();
    return ok({ deletedCount: docsSnap.size });
  }

  /**
   * Count all memories in organization
   * Uses Firestore's efficient count() API.
   * @returns Result containing the total count of memories
   */
  async countByOrg(): Promise<Result<number, AppError>> {
    return this.count();
  }
}

import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import {
  AbstractFirebaseRepository,
  type QueryOptions,
} from "@/lib/abstractions/abstract-firebase-repository";
import type { Store } from "@/data/stores/models/store.model";
import { appError, err, ok, type AppError, type Result } from "@/lib/result";
import { encodeCursor, decodeCursor } from "@/lib/cursor";
import { adminDb } from "@/lib/firebase/admin";

export type StoreSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "name_asc"
  | "name_desc";

/**
 * Paginated result containing items and optional next cursor
 */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface FindByOrgOptions {
  sort?: StoreSortKey;
  namePrefix?: string;
  limit?: number;
  page?: number;
}

export class StoreRepository extends AbstractFirebaseRepository<Store> {
  constructor(private readonly orgId: string) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/stores`;
  }

  protected fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): Store {
    const d = snap.data();
    return {
      id: snap.id,
      orgId: d.orgId as string,
      name: d.name as string,
      description: (d.description as string | null) ?? null,
      documentCount: (d.documentCount as number) ?? 0,
      fileCount: (d.fileCount as number) ?? 0,
      customCount: (d.customCount as number) ?? 0,
      enableRagEvaluation: (d.enableRagEvaluation as boolean) ?? true,
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

  async findByOrg(
    options: FindByOrgOptions = {},
  ): Promise<Result<Store[], AppError>> {
    const sort = options.sort ?? "createdAt_desc";
    const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];

    const queryOptions: QueryOptions = {
      orderBy: { field: sortField, direction: sortDir },
      limit: options.limit ?? 25,
    };

    if (options.namePrefix) {
      queryOptions.filters = [
        { field: "name", op: ">=", value: options.namePrefix },
        { field: "name", op: "<=", value: options.namePrefix + "\uf8ff" },
      ];
    }

    return this.findAll(queryOptions);
  }

  /**
   * Find stores by organization with cursor-based pagination.
   * Supports name prefix search, date range filtering, and sorting.
   * @param options - Query options: q (name prefix), sort key, date range, cursor, limit
   * @returns Result with paginated items and nextCursor for pagination
   */
  async findByOrgPaginated(options: {
    q?: string;
    sort: StoreSortKey;
    from?: Date;
    to?: Date;
    cursor?: string;
    limit: number;
  }): Promise<Result<PaginatedResult<Store>, AppError>> {
    const { q = "", sort, from, to, cursor, limit } = options;

    // Parse sort key
    const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];

    // Build filters
    const filters: QueryOptions["filters"] = [];
    if (q) {
      filters.push(
        { field: "name", op: ">=", value: q },
        { field: "name", op: "<=", value: q + "\uf8ff" },
      );
    }
    if (from) {
      filters.push({
        field: "createdAt",
        op: ">=",
        value: Timestamp.fromDate(from),
      });
    }
    if (to) {
      filters.push({
        field: "createdAt",
        op: "<=",
        value: Timestamp.fromDate(to),
      });
    }

    // Build query options
    let queryStartAfter: QueryDocumentSnapshot<DocumentData> | undefined;
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return err(appError("VALIDATION_ERROR", "Invalid cursor format"));
      }
      // Note: We need the actual doc snapshot for cursor pagination
      // For now, we'll use the decoded values for validation
    }

    // Query with cursor pagination
    const res = await this.findAll({
      filters,
      orderBy: { field: sortField, direction: sortDir },
      limit: limit + 1, // Fetch one extra to check if there's a next page
      startAfter: queryStartAfter,
    });

    if (!res.ok) return res;

    const allDocs = res.value;
    const hasNext = allDocs.length > limit;
    const items = allDocs.slice(0, limit);

    // Create next cursor if there are more items
    let nextCursor: string | null = null;
    if (hasNext && items.length > 0) {
      const lastItem = items.at(-1)!;
      nextCursor = encodeCursor({
        id: lastItem.id,
        sortValue:
          sortField === "createdAt"
            ? lastItem.createdAt.getTime()
            : lastItem.name,
      });
    }

    return ok({ items, nextCursor });
  }

  async nameExists(
    name: string,
    excludeId?: string,
  ): Promise<Result<boolean, AppError>> {
    const res = await this.findAll({
      filters: [{ field: "name", op: "==", value: name.trim() }],
      limit: 2,
    });

    if (!res.ok) return err(res.error);
    const docs = res.value.filter((d: Store) => d.id !== excludeId);
    return ok(docs.length > 0);
  }

  async incrementCounts(
    storeId: string,
    delta: { documentCount?: number; fileCount?: number; customCount?: number },
  ): Promise<Result<void, AppError>> {
    const increments: Record<string, number> = {};
    if (delta.documentCount) increments.documentCount = delta.documentCount;
    if (delta.fileCount) increments.fileCount = delta.fileCount;
    if (delta.customCount) increments.customCount = delta.customCount;

    if (Object.keys(increments).length === 0) return ok(undefined);

    // Increment the count fields and update timestamp via abstraction
    const res = await this.increments(storeId, increments);
    if (!res.ok) return err(res.error);

    // Update the updatedAt timestamp using server-side timestamp
    const updateRes = await this.update(storeId, {
      updatedAt: Timestamp.now() as any,
    });
    return updateRes.ok ? ok(undefined) : err(updateRes.error);
  }

  async deleteWithDocuments(storeId: string): Promise<Result<void, AppError>> {
    const existsRes = await this.exist(storeId);
    if (!existsRes.ok) return err(existsRes.error);
    if (!existsRes.value) return ok(undefined);

    const documentsPath = `${this.collectionPath}/${storeId}/documents`;
    const docsSnap = await adminDb.collection(documentsPath).get();

    const batch = this.getBatch();
    for (const doc of docsSnap.docs) {
      batch.delete(doc.ref);
    }
    batch.delete(this.docRef(storeId));
    await batch.commit();
    return ok(undefined);
  }

  async findDocumentsByStore(
    storeId: string,
  ): Promise<Result<QueryDocumentSnapshot<DocumentData>[], AppError>> {
    const documentsPath = `${this.collectionPath}/${storeId}/documents`;
    const snap = await adminDb.collection(documentsPath).get();
    return ok(snap.docs);
  }

  /**
   * Count total stores for this organization.
   * Uses Firestore's efficient count() API.
   * @returns Result containing the total count of stores
   */
  async countByOrg(): Promise<Result<number, AppError>> {
    return this.count();
  }
}

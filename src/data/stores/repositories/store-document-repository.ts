import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import {
  AbstractFirebaseRepository,
  type QueryOptions,
} from "@/lib/abstractions/abstract-firebase-repository";
import { encodeCursor, decodeCursor } from "@/lib/cursor";
import { appError, err, ok, type AppError, type Result } from "@/lib/result";
import type {
  StoreDocument,
  DocumentKind,
} from "@/data/stores/models/store-document.model";
import type { PaginatedResult } from "./store-repository";

// Re-export PaginatedResult for convenience
export type { PaginatedResult } from "./store-repository";
export type DocumentSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "name_asc"
  | "name_desc"
  | "updatedAt_desc";

export interface FindByStoreOptions {
  kind?: DocumentKind;
  namePrefix?: string;
  sort?: DocumentSortKey;
  limit?: number;
}

export class StoreDocumentRepository extends AbstractFirebaseRepository<StoreDocument> {
  constructor(
    private readonly orgId: string,
    private readonly storeId: string,
  ) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/stores/${this.storeId}/documents`;
  }

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): StoreDocument {
    const d = snap.data();
    const toIso = (field: unknown): string => {
      if (field instanceof Timestamp) {
        return field.toDate().toISOString();
      }
      if (typeof field === "string") {
        return field;
      }
      return new Date(field as string).toISOString();
    };

    const kind = d.kind as DocumentKind;
    const source = d.source ?? {};

    // Base object all resources have
    const base = {
      id: snap.id,
      orgId: d.orgId as string,
      storeId: d.storeId as string,
      name: d.name as string,
      keywords: (d.keywords as string[]) ?? [],
      source: {
        id: (source.id as string) ?? "",
        collection: (source.collection as string) ?? "",
      },
      data: (d.data as Record<string, unknown> | string | null) ?? null,
      status: ((d.status as string) ?? "pending") as StoreDocument["status"],
      error: (d.error as string | null) ?? null,
      summary: (d.summary as string | null) ?? null,
      createdAt: toIso(d.createdAt),
      updatedAt: toIso(d.updatedAt),
      createdBy: d.createdBy as string,
    };

    if (kind === "file") {
      return {
        ...base,
        kind,
        type: ((d.type ?? "pdf") as StoreDocument & { kind: "file" })["type"],
        path: (d.path as string) ?? "",
        mimeType: (d.mimeType as string) ?? "",
        sizeBytes: (d.sizeBytes as number) ?? 0,
        extractedText: (d.extractedText as string | null) ?? null,
      } as StoreDocument;
    } else if (kind === "data") {
      return {
        ...base,
        kind,
        type: ((d.type ?? "json") as StoreDocument & { kind: "data" })["type"],
      } as StoreDocument;
    } else {
      // node
      return {
        ...base,
        kind,
        type: ((d.type ?? "chunk") as StoreDocument & { kind: "node" })["type"],
        parentId: (d.parentId as string) ?? "",
      } as StoreDocument;
    }
  }

  async findByStore(
    options: FindByStoreOptions = {},
  ): Promise<Result<StoreDocument[], AppError>> {
    const sort = options.sort ?? "createdAt_desc";
    const queryOptions: QueryOptions = {
      limit: options.limit ?? 25,
    };

    const filters: QueryOptions["filters"] = [];
    if (options.kind) {
      filters.push({ field: "kind", op: "==", value: options.kind });
    }
    if (options.namePrefix) {
      filters.push(
        { field: "name", op: ">=", value: options.namePrefix },
        {
          field: "name",
          op: "<=",
          value: options.namePrefix + "\uf8ff",
        },
      );
    }
    queryOptions.filters = filters;

    if (sort === "name_asc") {
      queryOptions.orderBy = { field: "name", direction: "asc" };
    } else if (sort === "name_desc") {
      queryOptions.orderBy = { field: "name", direction: "desc" };
    } else if (sort === "createdAt_asc") {
      queryOptions.orderBy = { field: "createdAt", direction: "asc" };
    } else if (sort === "updatedAt_desc") {
      queryOptions.orderBy = { field: "updatedAt", direction: "desc" };
    } else {
      queryOptions.orderBy = { field: "createdAt", direction: "desc" };
    }

    return this.findAll(queryOptions);
  }

  /**
   * Find documents with cursor-based pagination.
   * Supports filtering by kind and name prefix, with multiple sort options.
   * Cursor encodes the current page offset as a base64url payload.
   * @param options - Query options: q (name prefix), sort key, kind, fileType, cursor, limit
   * @returns Result with paginated items and nextCursor for the next page
   */
  async findByStorePaginated(options: {
    q?: string;
    sort: DocumentSortKey;
    kind?: DocumentKind;
    fileType?: string;
    status?: string;
    cursor?: string;
    limit: number;
  }): Promise<Result<PaginatedResult<StoreDocument>, AppError>> {
    const { q = "", sort, kind, fileType, status, cursor, limit } = options;

    // Decode cursor to offset (we encode offset as sortValue, id is unused)
    let offset = 0;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded || typeof decoded.sortValue !== "number") {
        return err(appError("VALIDATION_ERROR", "Invalid cursor format"));
      }
      offset = decoded.sortValue;
    }

    // Build filters
    const filters: QueryOptions["filters"] = [];
    if (kind) {
      filters.push({ field: "kind", op: "==", value: kind });
    }
    if (fileType) {
      filters.push({ field: "type", op: "==", value: fileType });
    }
    if (status) {
      filters.push({ field: "status", op: "==", value: status });
    }
    if (q) {
      filters.push(
        { field: "name", op: ">=", value: q },
        { field: "name", op: "<=", value: q + "\uf8ff" },
      );
    }

    // Parse sort key
    let sortField: string;
    let sortDir: "asc" | "desc";

    if (sort === "name_asc") {
      sortField = "name";
      sortDir = "asc";
    } else if (sort === "name_desc") {
      sortField = "name";
      sortDir = "desc";
    } else if (sort === "createdAt_asc") {
      sortField = "createdAt";
      sortDir = "asc";
    } else if (sort === "updatedAt_desc") {
      sortField = "updatedAt";
      sortDir = "desc";
    } else {
      // createdAt_desc (default)
      sortField = "createdAt";
      sortDir = "desc";
    }

    const res = await this.findAll({
      filters,
      orderBy: { field: sortField, direction: sortDir },
      offset: offset > 0 ? offset : undefined,
      limit: limit + 1, // Fetch one extra to check if there's a next page
    });

    if (!res.ok) return res;

    const allDocs = res.value;
    const hasMore = allDocs.length > limit;
    const items = allDocs.slice(0, limit);

    // Encode next cursor as offset into results
    let nextCursor: string | null = null;
    if (hasMore) {
      nextCursor = encodeCursor({ id: "", sortValue: offset + limit });
    }

    return ok({ items, nextCursor });
  }

  async findByFilename(
    filename: string,
  ): Promise<Result<StoreDocument | null, AppError>> {
    const res = await this.findAll({
      filters: [
        { field: "name", op: "==", value: filename },
        { field: "kind", op: "!=", value: "node" },
      ],
      limit: 1,
    });
    if (!res.ok) return err(res.error);
    return ok(res.value[0] ?? null);
  }

  /**
   * Count documents in this store grouped by enrichment status.
   * Runs 4 count queries in parallel (Firestore has no GROUP BY).
   */
  async countByStatus(): Promise<
    Result<Record<StoreDocument["status"], number>, AppError>
  > {
    const res = await this.countByFilters([
      [{ field: "status", op: "==", value: "pending" }],
      [{ field: "status", op: "==", value: "processing" }],
      [{ field: "status", op: "==", value: "completed" }],
      [{ field: "status", op: "==", value: "failed" }],
    ]);

    if (!res.ok) return err(res.error);
    const [pending, processing, completed, failed] = res.value;
    return ok({ pending, processing, completed, failed });
  }

  /**
   * Fetch the N most-recently-updated documents (ordered by updatedAt desc).
   * Used by GetStoreMonitoringUseCase for activity timeline and type breakdown.
   */
  async findRecentlyUpdated(
    limit: number,
  ): Promise<Result<StoreDocument[], AppError>> {
    return this.findAll({
      orderBy: { field: "updatedAt", direction: "desc" },
      limit,
    });
  }

  /**
   * Paginated activity list ordered by updatedAt desc.
   * Uses offset pagination so numbered-page UI works.
   * Also returns the total document count (unfiltered) for computing totalPages.
   */
  async findRecentlyUpdatedPaginated(options: {
    offset: number;
    limit: number;
    status?: string;
  }): Promise<Result<{ items: StoreDocument[]; total: number }, AppError>> {
    const filters: {
      field: string;
      op: "==" | ">=" | "<=" | "!=" | "array-contains";
      value: unknown;
    }[] = options.status
      ? [{ field: "status", op: "==", value: options.status }]
      : [];

    const [itemsRes, countRes] = await Promise.all([
      this.findAll({
        filters,
        orderBy: { field: "updatedAt", direction: "desc" },
        offset: options.offset > 0 ? options.offset : undefined,
        limit: options.limit,
      }),
      this.count(filters),
    ]);

    if (!itemsRes.ok) return err(itemsRes.error);
    if (!countRes.ok) return err(countRes.error);

    return ok({ items: itemsRes.value, total: countRes.value });
  }
}

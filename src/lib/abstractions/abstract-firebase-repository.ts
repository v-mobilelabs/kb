import {
  CollectionReference,
  DocumentData,
  FieldPath,
  FieldValue,
  OrderByDirection,
  Query,
  QueryDocumentSnapshot,
  Timestamp,
  WhereFilterOp,
  WriteBatch,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";

export interface FilterOption {
  field: string | FieldPath;
  op: WhereFilterOp;
  value: unknown;
}

export interface QueryOptions {
  filters?: FilterOption[];
  orderBy?: { field: string; direction?: OrderByDirection };
  limit?: number;
  offset?: number;
  startAfter?: QueryDocumentSnapshot;
}

export abstract class AbstractFirebaseRepository<T extends { id: string }> {
  protected abstract collectionPath: string;

  // ── Collection helpers ──────────────────────────────────────────────────────

  /**
   * Gets the Firestore collection reference for this repository's collection path.
   * @returns Collection reference for querying and document operations
   */
  protected collection(): CollectionReference<DocumentData> {
    return adminDb.collection(this.collectionPath);
  }

  /**
   * Gets a document reference for the given document ID.
   * @param id - The document ID
   * @returns Document reference for the specified document
   */
  protected docRef(id: string) {
    return this.collection().doc(id);
  }

  /**
   * Abstract method to convert Firestore document snapshot to domain model.
   * Subclasses must implement this to deserialize Firestore data.
   * @param snap - Firestore document snapshot
   * @returns Domain model instance
   */
  protected abstract fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): T;

  /**
   * Converts domain model to Firestore-compatible format.
   * Automatically converts Date objects to Firestore Timestamp.
   * Preserves existing Timestamp objects (e.g., from Timestamp.now()).
   * @param data - Domain model data (without id field)
   * @returns Object ready for Firestore storage
   */
  protected toFirestore(data: Omit<T, "id">): DocumentData {
    // Convert Date → Timestamp for Firestore, preserve existing Timestamps
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => {
        let value: unknown = v;
        if (v instanceof Timestamp) {
          value = v;
        } else if (v instanceof Date) {
          value = Timestamp.fromDate(v);
        }
        return [k, value];
      }),
    );
  }

  /**
   * Retrieves a single document by ID.
   * @param id - The document ID to retrieve
   * @returns Result containing the document or NOT_FOUND error if it doesn't exist
   */
  async findById(id: string): Promise<Result<T, AppError>> {
    const snap = await this.docRef(id).get();
    if (!snap.exists) {
      return err(
        appError(
          "NOT_FOUND",
          `Document ${id} not found in ${this.collectionPath}`,
        ),
      );
    }
    return ok(this.fromFirestore(snap as QueryDocumentSnapshot<DocumentData>));
  }

  /**
   * Retrieves multiple documents with optional filtering, ordering, and pagination.
   * Supports:
   * - Multiple filter conditions
   * - Ordering by field (with direction)
   * - Result limiting
   * - Offset-based pagination (skip N documents)
   * - Cursor-based pagination via startAfter
   * @param options - Query options: filters, orderBy, limit, offset, startAfter
   * @returns Result containing array of documents matching the query
   */
  async findAll(options: QueryOptions = {}): Promise<Result<T[], AppError>> {
    let q: Query<DocumentData> = this.collection();
    for (const f of options.filters ?? []) {
      q = q.where(f.field as string, f.op, f.value);
    }
    if (options.orderBy) {
      q = q.orderBy(options.orderBy.field, options.orderBy.direction ?? "asc");
    }
    if (options.limit) {
      q = q.limit(options.limit);
    }
    if (options.offset) {
      q = q.offset(options.offset);
    }
    if (options.startAfter) {
      q = q.startAfter(options.startAfter);
    }
    const snaps = await q.get();
    return ok(snaps.docs.map((d) => this.fromFirestore(d)));
  }

  /**
   * Creates a new document in the collection.
   * Automatically generates an ID if not provided.
   * @param data - Document data (id field is auto-generated or provided separately)
   * @param id - Optional explicit document ID. If not provided, Firestore generates one
   * @returns Result containing the created document with its ID
   */
  async create(data: Omit<T, "id">, id?: string): Promise<Result<T, AppError>> {
    const ref = id ? this.docRef(id) : this.collection().doc();
    const payload = this.toFirestore(data);
    await ref.set({ ...payload, id: ref.id });
    return ok({ ...data, id: ref.id } as T);
  }

  /**
   * Updates an existing document with partial data.
   * Merges the provided data with existing document content.
   * @param id - The document ID to update
   * @param data - Partial document data to merge (can update any subset of fields)
   * @returns Result containing the updated document or NOT_FOUND error if document doesn't exist
   */
  async update(
    id: string,
    data: Partial<Omit<T, "id">>,
  ): Promise<Result<T, AppError>> {
    const ref = this.docRef(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return err(appError("NOT_FOUND", `Document ${id} not found`));
    }
    const payload = this.toFirestore(data as Omit<T, "id">);
    await ref.update(payload);
    const updated = await ref.get();
    return ok(
      this.fromFirestore(updated as QueryDocumentSnapshot<DocumentData>),
    );
  }

  /**
   * Deletes a document from the collection.
   * @param id - The document ID to delete
   * @returns Result indicating success or failure
   */
  async delete(id: string): Promise<Result<void, AppError>> {
    await this.docRef(id).delete();
    return ok(undefined);
  }

  // ── Aggregates ───────────────────────────────────────────────────────────────

  /**
   * Private helper to build a Firestore query with applied filters.
   * Shared logic between count and countByFilters to avoid duplication.
   * @param filters - Array of filter conditions to apply
   * @returns Firestore query with filters applied
   */
  private buildCountQuery(filters: FilterOption[]): Query<DocumentData> {
    let q: Query<DocumentData> = this.collection();
    for (const f of filters) {
      q = q.where(f.field as string, f.op, f.value);
    }
    return q;
  }

  /**
   * Counts documents matching the given filter conditions.
   * Uses Firestore's efficient count() API rather than fetching all documents.
   * @param filters - Optional filter conditions to apply before counting
   * @returns Result containing the count of matching documents
   */
  async count(filters: FilterOption[] = []): Promise<Result<number, AppError>> {
    const q = this.buildCountQuery(filters);
    const agg = await q.count().get();
    return ok(agg.data().count);
  }

  /**
   * Counts documents for multiple filter sets in parallel.
   * More efficient than calling count() multiple times sequentially.
   * Useful for dashboard statistics (e.g., document status breakdown).
   * @param filterSets - Array of filter arrays, each representing a separate count query
   * @returns Result containing array of counts, one per filter set in the same order
   */
  async countByFilters(
    filterSets: FilterOption[][],
  ): Promise<Result<number[], AppError>> {
    const queries = filterSets.map((filters) =>
      this.buildCountQuery(filters).count().get(),
    );
    const results = await Promise.all(queries);
    return ok(results.map((r) => r.data().count));
  }

  // ── Existence checks ────────────────────────────────────────────────────────

  /**
   * Checks whether a document exists without fetching its data.
   * Efficient for validation before operations like create with explicit ID.
   * @param id - The document ID to check
   * @returns Result containing true if document exists, false otherwise
   */
  async exist(id: string): Promise<Result<boolean, AppError>> {
    const snap = await this.docRef(id).get();
    return ok(snap.exists);
  }

  // ── Numeric operations ──────────────────────────────────────────────────────

  /**
   * Atomically increments a numeric field by the given amount.
   * Uses Firestore FieldValue.increment() for safe concurrent updates.
   * @param id - The document ID
   * @param field - The numeric field name to increment
   * @param amount - The amount to increment by (can be negative)
   * @returns Result indicating success or failure
   */
  async increment(
    id: string,
    field: string,
    amount: number,
  ): Promise<Result<void, AppError>> {
    await this.docRef(id).update({
      [field]: FieldValue.increment(amount),
    });
    return ok(undefined);
  }

  /**
   * Atomically decrements a numeric field by the given amount.
   * Uses Firestore FieldValue.increment() for safe concurrent updates.
   * @param id - The document ID
   * @param field - The numeric field name to decrement
   * @param amount - The amount to decrement by (can be negative)
   * @returns Result indicating success or failure
   */
  async decrement(
    id: string,
    field: string,
    amount: number,
  ): Promise<Result<void, AppError>> {
    await this.docRef(id).update({
      [field]: FieldValue.increment(-amount),
    });
    return ok(undefined);
  }

  /**
   * Atomically increments multiple numeric fields in a single update.
   * More efficient than calling increment() multiple times.
   * Zero values are automatically filtered out.
   * @param id - The document ID
   * @param updates - Object mapping field names to increment amounts (can be negative)
   * @returns Result indicating success or failure
   */
  async increments(
    id: string,
    updates: Record<string, number>,
  ): Promise<Result<void, AppError>> {
    const fields: Record<string, FieldValue> = {};
    for (const [field, amount] of Object.entries(updates)) {
      if (amount !== 0) {
        fields[field] = FieldValue.increment(amount);
      }
    }
    if (Object.keys(fields).length === 0) return ok(undefined);
    await this.docRef(id).update(fields);
    return ok(undefined);
  }

  // ── Batch helpers (exposed for complex operations) ──────────────────────────

  /**
   * Creates a new Firestore batch for atomic multi-document operations.
   * Use batch.set(), batch.update(), batch.delete() to queue operations,
   * then call batch.commit() to apply all changes atomically.
   * @returns Firestore WriteBatch instance for queuing operations
   */
  getBatch(): WriteBatch {
    return adminDb.batch();
  }
}

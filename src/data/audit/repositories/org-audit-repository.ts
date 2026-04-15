import {
  Timestamp,
  FieldValue,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import { ok, err, appError, type Result, type AppError } from "@/lib/result";
import { encodeCursor, decodeCursor } from "@/lib/cursor";
import type { OrgAuditEntry } from "@/data/audit/models/org-audit-entry.model";
import type { OrgAuditEventType } from "@/data/audit/models/audit-log-entry.model";

export interface OrgAuditPage {
  items: OrgAuditEntry[];
  nextCursor: string | null;
}

export class OrgAuditRepository extends AbstractFirebaseRepository<OrgAuditEntry> {
  constructor(private readonly orgId: string) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/audits`;
  }

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): OrgAuditEntry {
    const d = snap.data();
    return {
      id: snap.id,
      orgId: d.orgId as string,
      eventType: d.eventType as OrgAuditEventType,
      actorId: d.actorId as string,
      actorEmail: d.actorEmail as string,
      affectedUserId: d.affectedUserId as string,
      affectedUserEmail: d.affectedUserEmail as string,
      outcome: d.outcome as "success" | "failure",
      reason: (d.reason as string | null) ?? null,
      previousBaseRole: d.previousBaseRole as
        | OrgAuditEntry["previousBaseRole"]
        | undefined,
      newBaseRole: d.newBaseRole as OrgAuditEntry["newBaseRole"] | undefined,
      errorMessage: (d.errorMessage as string | null) ?? null,
      timestamp:
        d.timestamp instanceof Timestamp
          ? d.timestamp.toDate()
          : new Date(d.timestamp as string),
    };
  }

  async append(
    entry: Omit<OrgAuditEntry, "id">,
  ): Promise<Result<OrgAuditEntry, AppError>> {
    try {
      const ref = this.collection().doc();
      await ref.set({
        ...entry,
        timestamp: FieldValue.serverTimestamp(),
      });
      const snap = await ref.get();
      return ok(
        this.fromFirestore(snap as QueryDocumentSnapshot<DocumentData>),
      );
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }

  async findPaginated(options: {
    sort?: "timestamp_desc" | "timestamp_asc";
    filterEventType?: OrgAuditEventType;
    filterActorId?: string;
    filterAffectedUserId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    cursor?: string;
  }): Promise<Result<OrgAuditPage, AppError>> {
    try {
      const limit = options.limit ?? 50;
      const dir =
        options.sort === "timestamp_asc" ? ("asc" as const) : ("desc" as const);

      let q = this.collection()
        .orderBy("timestamp", dir)
        .orderBy("__name__", dir);

      if (options.filterEventType) {
        q = q.where("eventType", "==", options.filterEventType) as typeof q;
      }
      if (options.filterActorId) {
        q = q.where("actorId", "==", options.filterActorId) as typeof q;
      }
      if (options.filterAffectedUserId) {
        q = q.where(
          "affectedUserId",
          "==",
          options.filterAffectedUserId,
        ) as typeof q;
      }
      if (options.dateFrom) {
        q = q.where(
          "timestamp",
          ">=",
          Timestamp.fromDate(options.dateFrom),
        ) as typeof q;
      }
      if (options.dateTo) {
        q = q.where(
          "timestamp",
          "<=",
          Timestamp.fromDate(options.dateTo),
        ) as typeof q;
      }

      if (options.cursor) {
        const decoded = decodeCursor(options.cursor);
        if (decoded) {
          const snap = await this.collection().doc(decoded.id).get();
          if (snap.exists) q = q.startAfter(snap) as typeof q;
        }
      }

      const snaps = await q.limit(limit + 1).get();
      const docs = snaps.docs.map((s) => this.fromFirestore(s));
      const hasMore = docs.length > limit;
      if (hasMore) docs.pop();

      const nextCursor =
        hasMore && docs.length > 0
          ? encodeCursor({
              id: docs[docs.length - 1]!.id,
              sortValue: docs[docs.length - 1]!.timestamp.toISOString(),
            })
          : null;

      return ok({ items: docs, nextCursor });
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }
}

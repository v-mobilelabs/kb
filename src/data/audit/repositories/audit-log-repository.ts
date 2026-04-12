import type {
  QueryDocumentSnapshot,
  DocumentData,
  WhereFilterOp,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import type { FilterOption } from "@/lib/abstractions/abstract-firebase-repository";
import type {
  AuditEventType,
  AuditLogEntry,
} from "@/data/audit/models/audit-log-entry.model";

export class AuditLogRepository extends AbstractFirebaseRepository<AuditLogEntry> {
  /**
   * Audits are stored in a flat `/audits` collection with `orgId` as a document field.
   * This allows for centralized audit log management across all organizations.
   */
  constructor() {
    super();
  }

  protected get collectionPath() {
    return "audits";
  }

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): AuditLogEntry {
    const d = snap.data();
    return {
      id: snap.id,
      eventType: d.eventType as AuditEventType,
      actorUid: d.actorUid ?? null,
      actorEmail: d.actorEmail ?? null,
      orgId: d.orgId ?? null,
      outcome: d.outcome as "success" | "failure",
      reason: d.reason ?? null,
      timestamp:
        d.timestamp instanceof Timestamp
          ? d.timestamp.toDate()
          : new Date(d.timestamp),
    };
  }

  /** Query audit logs by event type, organization, and time window. */
  async findByEventType(
    eventType: AuditEventType,
    since: Date,
    orgId?: string,
  ) {
    const filters: FilterOption[] = [
      { field: "eventType", op: "==" as WhereFilterOp, value: eventType },
      {
        field: "timestamp",
        op: ">=" as WhereFilterOp,
        value: Timestamp.fromDate(since),
      },
    ];

    if (orgId) {
      filters.push({
        field: "orgId",
        op: "==" as WhereFilterOp,
        value: orgId,
      });
    }

    return this.findAll({
      filters,
    });
  }
}

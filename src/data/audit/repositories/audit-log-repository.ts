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
  private readonly orgId: string;

  /**
   * @param orgId - Organization ID (required). Audits are stored in `organizations/{orgId}/audits`.
   *   For auth events without an org context, use "_system" as orgId.
   */
  constructor(orgId: string) {
    super();
    this.orgId = orgId;
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/audits`;
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

  /** Query audit logs by event type and time window. */
  async findByEventType(eventType: AuditEventType, since: Date) {
    const filters: FilterOption[] = [
      { field: "eventType", op: "==" as WhereFilterOp, value: eventType },
      {
        field: "timestamp",
        op: ">=" as WhereFilterOp,
        value: Timestamp.fromDate(since),
      },
    ];

    return this.findAll({
      filters,
    });
  }
}

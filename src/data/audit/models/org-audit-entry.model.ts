import type { OrgAuditEventType } from "@/data/audit/models/audit-log-entry.model";

export interface OrgAuditEntry {
  id: string;
  orgId: string;
  eventType: OrgAuditEventType;
  actorId: string; // uid of admin who performed the action
  actorEmail: string;
  affectedUserId: string;
  affectedUserEmail: string;
  outcome: "success" | "failure";
  reason: string | null; // optional removal reason
  previousBaseRole?: "owner" | "admin" | "member"; // for role changes
  newBaseRole?: "owner" | "admin" | "member"; // for role changes
  errorMessage: string | null;
  timestamp: Date;
}

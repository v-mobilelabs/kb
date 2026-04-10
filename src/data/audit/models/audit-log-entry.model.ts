export type AuditEventType =
  | "MAGIC_LINK_REQUEST"
  | "MAGIC_LINK_REDEEMED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "ACCOUNT_DELETED"
  | "API_KEY_USAGE_SUCCESS"
  | "API_KEY_USAGE_FAILURE"
  | "STORE_CREATED"
  | "STORE_UPDATED"
  | "STORE_DELETED";

export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  actorUid: string | null;
  actorEmail: string | null;
  orgId: string | null;
  outcome: "success" | "failure";
  reason: string | null;
  timestamp: Date;
}

export interface CreateAuditLogInput {
  eventType: AuditEventType;
  actorUid: string | null;
  actorEmail: string | null;
  orgId: string | null;
  outcome: "success" | "failure";
  reason: string | null;
  timestamp: Date;
}

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
  | "STORE_DELETED"
  | "MEMORY_CREATED"
  | "MEMORY_UPDATED"
  | "MEMORY_DELETED"
  | "MEMORY_DOCUMENT_CREATED"
  | "MEMORY_DOCUMENT_UPDATED"
  | "MEMORY_DOCUMENT_DELETED"
  | "CONTEXT_CREATED"
  | "CONTEXT_UPDATED"
  | "CONTEXT_DELETED"
  | "CONTEXT_DOCUMENT_CREATED"
  | "CONTEXT_DOCUMENT_UPDATED"
  | "CONTEXT_DOCUMENT_DELETED";

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

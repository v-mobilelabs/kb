import { adminDb } from "./admin-firestore.js";
import { Timestamp } from "firebase-admin/firestore";

export type AuditEventType =
  | "API_KEY_USAGE_SUCCESS"
  | "API_KEY_USAGE_FAILURE"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "MAGIC_LINK_REQUEST"
  | "MAGIC_LINK_REDEEMED"
  | "ACCOUNT_DELETED";

export interface AuditLogEntry {
  orgId: string;
  eventType: AuditEventType;
  actorUid?: string;
  actorEmail?: string;
  apiKeyId?: string;
  resourceId?: string;
  timestamp: Timestamp;
  outcome: "success" | "failure";
  details?: Record<string, unknown>;
}

/**
 * Log an audit event to Firestore
 */
export async function recordAuditEvent(
  entry: Omit<AuditLogEntry, "timestamp">,
): Promise<void> {
  try {
    const auditLogRef = adminDb.collection("audits").doc();
    await auditLogRef.set({
      ...entry,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    // Log errors but don't throw — audit logging should not break the main flow
    console.error("[audit-logger] Failed to record audit event:", {
      eventType: entry.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Log a successful API key usage
 */
export async function logApiKeyUsageSuccess(
  orgId: string,
  apiKeyId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  return recordAuditEvent({
    orgId,
    eventType: "API_KEY_USAGE_SUCCESS",
    apiKeyId,
    outcome: "success",
    details,
  });
}

/**
 * Log a failed API key usage
 */
export async function logApiKeyUsageFailure(
  orgId: string,
  apiKeyId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  return recordAuditEvent({
    orgId,
    eventType: "API_KEY_USAGE_FAILURE",
    apiKeyId,
    outcome: "failure",
    details,
  });
}

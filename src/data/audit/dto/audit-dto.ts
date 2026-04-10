import { z } from "zod";

export const CreateAuditLogSchema = z.object({
  eventType: z.enum([
    "MAGIC_LINK_REQUEST",
    "MAGIC_LINK_REDEEMED",
    "API_KEY_CREATED",
    "API_KEY_REVOKED",
    "ACCOUNT_DELETED",
    "API_KEY_USAGE_SUCCESS",
    "API_KEY_USAGE_FAILURE",
    "STORE_CREATED",
    "STORE_UPDATED",
    "STORE_DELETED",
  ]),
  actorUid: z.string().nullable(),
  actorEmail: z.string().email().nullable(),
  orgId: z.string().nullable(),
  outcome: z.enum(["success", "failure"]),
  reason: z.string().nullable(),
  timestamp: z.date(),
});

export type CreateAuditLogDTO = z.infer<typeof CreateAuditLogSchema>;

export const QueryAuditLogsSchema = z.object({
  eventType: z.enum([
    "MAGIC_LINK_REQUEST",
    "MAGIC_LINK_REDEEMED",
    "API_KEY_CREATED",
    "API_KEY_REVOKED",
    "ACCOUNT_DELETED",
    "API_KEY_USAGE_SUCCESS",
    "API_KEY_USAGE_FAILURE",
    "STORE_CREATED",
    "STORE_UPDATED",
    "STORE_DELETED",
  ]),
  since: z.date(),
  orgId: z.string().nullable().optional().default(null),
});

export type QueryAuditLogsDTO = z.infer<typeof QueryAuditLogsSchema>;

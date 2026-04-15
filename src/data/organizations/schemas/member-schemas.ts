import { z } from "zod";

// ── Primitives ──────────────────────────────────────────────────────────────

export const UserIdSchema = z.string().min(1, "userId is required");
export const OrgIdSchema = z.string().min(1, "orgId is required");
export const EmailSchema = z.string().email("Invalid email address");
export const BaseRoleSchema = z.enum(["owner", "admin", "member"]);
export const CursorSchema = z.string().optional();

// ── Pagination ──────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  cursor: CursorSchema,
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

// ── Member list ─────────────────────────────────────────────────────────────

export const MemberSortKeySchema = z.enum([
  "joinedAt_desc",
  "joinedAt_asc",
  "displayName_asc",
  "displayName_desc",
  "email_asc",
  "email_desc",
]);
export type MemberSortKey = z.infer<typeof MemberSortKeySchema>;

export const ListOrgMembersSchema = z.object({
  orgId: OrgIdSchema,
  cursor: CursorSchema,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: MemberSortKeySchema.default("joinedAt_desc"),
  filterBaseRole: BaseRoleSchema.optional(),
  searchEmail: z.string().max(254).optional(),
  includeDeleted: z.boolean().default(false),
});
export type ListOrgMembersInput = z.infer<typeof ListOrgMembersSchema>;

// ── Remove member ───────────────────────────────────────────────────────────

export const RemoveOrgMemberSchema = z.object({
  orgId: OrgIdSchema,
  userId: UserIdSchema,
  reason: z.string().max(500).optional(),
});
export type RemoveOrgMemberInput = z.infer<typeof RemoveOrgMemberSchema>;

// ── Promote / Demote ────────────────────────────────────────────────────────

export const ChangeMemberBaseRoleSchema = z.object({
  orgId: OrgIdSchema,
  userId: UserIdSchema,
  newBaseRole: z.enum(["admin", "member"]), // owner cannot be assigned; only promoted via transfer
});
export type ChangeMemberBaseRoleInput = z.infer<
  typeof ChangeMemberBaseRoleSchema
>;

// ── Add member ──────────────────────────────────────────────────────────────

export const AddOrgMemberSchema = z.object({
  orgId: OrgIdSchema,
  email: EmailSchema,
  baseRole: BaseRoleSchema.default("member"),
});
export type AddOrgMemberInput = z.infer<typeof AddOrgMemberSchema>;

// ── Restore member ──────────────────────────────────────────────────────────

export const RestoreOrgMemberSchema = z.object({
  orgId: OrgIdSchema,
  userId: UserIdSchema,
});
export type RestoreOrgMemberInput = z.infer<typeof RestoreOrgMemberSchema>;

// ── User org list ───────────────────────────────────────────────────────────

export const GetUserOrgsSchema = z.object({});
export type GetUserOrgsInput = z.infer<typeof GetUserOrgsSchema>;

// ── Audit log ───────────────────────────────────────────────────────────────

export const OrgAuditSortKeySchema = z.enum([
  "timestamp_desc",
  "timestamp_asc",
]);

export const ListOrgAuditSchema = z.object({
  orgId: OrgIdSchema,
  cursor: CursorSchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort: OrgAuditSortKeySchema.default("timestamp_desc"),
  filterEventType: z
    .enum([
      "ORG_MEMBER_REMOVED",
      "ORG_MEMBER_BASE_ROLE_CHANGED",
      "ORG_MEMBER_RESTORED",
      "ORG_MEMBER_API_KEY_REVOKED_ON_REMOVAL",
    ])
    .optional(),
  filterActorId: UserIdSchema.optional(),
  filterAffectedUserId: UserIdSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type ListOrgAuditInput = z.infer<typeof ListOrgAuditSchema>;

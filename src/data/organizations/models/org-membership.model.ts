export type BaseRole = "owner" | "admin" | "member";

export interface OrgMembership {
  id: string; // userId — document ID
  orgId: string;
  userId: string;
  email: string; // denormalized from Firebase Auth for email-prefix search
  baseRole: BaseRole;
  roleIds: string[]; // @v2: custom roles; always [] in v1
  joinedAt: Date;
  lastActiveAt: Date | null;
  deletedAt: Date | null; // null = active; set = soft-deleted
  createdAt: Date;
  updatedAt: Date;
}

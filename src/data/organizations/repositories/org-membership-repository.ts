import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import { adminDb } from "@/lib/firebase/admin";
import { encodeCursor, decodeCursor } from "@/lib/cursor";
import { ok, err, appError, type Result, type AppError } from "@/lib/result";
import type {
  OrgMembership,
  BaseRole,
} from "@/data/organizations/models/org-membership.model";
import type { MemberSortKey } from "@/data/organizations/schemas/member-schemas";

export interface MemberListPage {
  items: OrgMembership[];
  nextCursor: string | null;
}

export class OrgMembershipRepository extends AbstractFirebaseRepository<OrgMembership> {
  constructor(private readonly orgId: string) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/memberships`;
  }

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): OrgMembership {
    const d = snap.data();
    return {
      id: snap.id,
      orgId: d.orgId as string,
      userId: snap.id,
      email: (d.email as string) ?? "",
      baseRole: d.baseRole as BaseRole,
      roleIds: (d.roleIds as string[]) ?? [],
      joinedAt:
        d.joinedAt instanceof Timestamp
          ? d.joinedAt.toDate()
          : new Date(d.joinedAt as string),
      lastActiveAt:
        d.lastActiveAt instanceof Timestamp
          ? d.lastActiveAt.toDate()
          : d.lastActiveAt
            ? new Date(d.lastActiveAt as string)
            : null,
      deletedAt:
        d.deletedAt instanceof Timestamp
          ? d.deletedAt.toDate()
          : d.deletedAt
            ? new Date(d.deletedAt as string)
            : null,
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate()
          : new Date(d.createdAt as string),
      updatedAt:
        d.updatedAt instanceof Timestamp
          ? d.updatedAt.toDate()
          : new Date(d.updatedAt as string),
    };
  }

  async findActive(
    options: {
      sort?: MemberSortKey;
      searchEmail?: string;
      filterBaseRole?: BaseRole;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<Result<MemberListPage, AppError>> {
    try {
      const limit = options.limit ?? 25;
      const sort = options.sort ?? "joinedAt_desc";
      const [field, dir] = sort.split("_") as [string, "asc" | "desc"];

      let q = this.collection()
        .where("deletedAt", "==", null)
        .orderBy(field, dir)
        .orderBy("__name__", dir); // tie-break for stable cursor

      if (options.filterBaseRole) {
        q = q.where("baseRole", "==", options.filterBaseRole) as typeof q;
      }

      if (options.cursor) {
        const decoded = decodeCursor(options.cursor);
        if (decoded) {
          const snap = await this.collection().doc(decoded.id).get();
          if (snap.exists) q = q.startAfter(snap) as typeof q;
        }
      }

      const snaps = await q.limit(limit + 1).get();
      let docs = snaps.docs.map((s) => this.fromFirestore(s));

      // Email prefix filter (client-side; Firestore doesn't support case-insensitive prefix natively)
      if (options.searchEmail) {
        const prefix = options.searchEmail.toLowerCase();
        docs = docs.filter((m) => m.email.toLowerCase().startsWith(prefix));
      }

      const hasMore = docs.length > limit;
      if (hasMore) docs.pop();

      const nextCursor =
        hasMore && docs.length > 0
          ? encodeCursor({
              id: docs[docs.length - 1]!.id,
              sortValue:
                field === "joinedAt"
                  ? docs[docs.length - 1]!.joinedAt.toISOString()
                  : ((
                      docs[docs.length - 1] as unknown as Record<string, string>
                    )[field] ?? ""),
            })
          : null;

      return ok({ items: docs, nextCursor });
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }

  /** Find all active memberships for a user across all orgs (collectionGroup query) */
  static async findByUser(
    userId: string,
  ): Promise<Result<OrgMembership[], AppError>> {
    try {
      const snaps = await adminDb
        .collectionGroup("memberships")
        .where("userId", "==", userId)
        .where("deletedAt", "==", null)
        .orderBy("joinedAt", "desc")
        .get();

      const memberships = snaps.docs.map((snap) => {
        const d = snap.data();
        return {
          id: snap.id,
          orgId: d.orgId as string,
          userId: snap.id,
          email: (d.email as string) ?? "",
          baseRole: d.baseRole as BaseRole,
          roleIds: (d.roleIds as string[]) ?? [],
          joinedAt: (d.joinedAt as Timestamp).toDate(),
          lastActiveAt: d.lastActiveAt
            ? (d.lastActiveAt as Timestamp).toDate()
            : null,
          deletedAt: d.deletedAt ? (d.deletedAt as Timestamp).toDate() : null,
          createdAt: (d.createdAt as Timestamp).toDate(),
          updatedAt: (d.updatedAt as Timestamp).toDate(),
        } satisfies OrgMembership;
      });

      return ok(memberships);
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }

  async findDeleted(
    options: {
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<Result<MemberListPage, AppError>> {
    try {
      const limit = options.limit ?? 25;
      let q = this.collection()
        .where("deletedAt", "!=", null)
        .orderBy("deletedAt", "desc")
        .orderBy("__name__", "desc");

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
              sortValue: docs[docs.length - 1]!.deletedAt?.toISOString() ?? "",
            })
          : null;

      return ok({ items: docs, nextCursor });
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }

  async countActive(): Promise<number> {
    const snap = await this.collection()
      .where("deletedAt", "==", null)
      .count()
      .get();
    return snap.data().count;
  }

  async countActiveByRole(role: BaseRole): Promise<number> {
    const snap = await this.collection()
      .where("deletedAt", "==", null)
      .where("baseRole", "==", role)
      .count()
      .get();
    return snap.data().count;
  }

  async touchLastActive(userId: string): Promise<void> {
    await this.collection().doc(userId).update({
      lastActiveAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

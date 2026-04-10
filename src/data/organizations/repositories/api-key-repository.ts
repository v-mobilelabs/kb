import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import type { ApiKey } from "@/data/organizations/models/api-key.model";

export class ApiKeyRepository extends AbstractFirebaseRepository<ApiKey> {
  constructor(private readonly orgId: string) {
    super();
  }

  protected get collectionPath() {
    return "api_keys";
  }

  protected fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): ApiKey {
    const d = snap.data();
    const revokedAt = this.parseTimestamp(d.revokedAt);
    const lastUsedAt = this.parseTimestamp(d.lastUsedAt);
    return {
      id: snap.id,
      orgId: d.orgId as string,
      name: d.name as string,
      key: d.key as string,
      maskedKey: d.maskedKey as string,
      isRevoked: d.isRevoked as boolean,
      revokedAt,
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate()
          : new Date(d.createdAt as string),
      lastUsedAt,
    };
  }

  private parseTimestamp(field: unknown): Date | null {
    if (field instanceof Timestamp) {
      return field.toDate();
    }
    if (field && typeof field === "string") {
      return new Date(field);
    }
    return null;
  }

  async countActive() {
    return this.count([
      { field: "orgId", op: "==", value: this.orgId },
      { field: "isRevoked", op: "==", value: false },
    ]);
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    const res = await this.findAll({
      filters: [
        { field: "key", op: "==", value: key },
        { field: "isRevoked", op: "==", value: false },
      ],
      limit: 1,
    });
    if (!res.ok) return null;
    return res.value[0] ?? null;
  }
}

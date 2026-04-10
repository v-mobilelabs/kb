import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import type { Organization } from "@/data/organizations/models/organization.model";
import type { OrgSize } from "@/data/auth/models/user-profile.model";

export class OrganizationRepository extends AbstractFirebaseRepository<Organization> {
  protected collectionPath = "organizations";

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): Organization {
    const d = snap.data();
    return {
      id: snap.id,
      name: d.name as string,
      size: d.size as OrgSize,
      ownerUid: d.ownerUid as string,
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate()
          : new Date(d.createdAt),
      updatedAt:
        d.updatedAt instanceof Timestamp
          ? d.updatedAt.toDate()
          : new Date(d.updatedAt),
    };
  }
}

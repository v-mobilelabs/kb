import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import type { UserProfile } from "@/data/auth/models/user-profile.model";

export class UserProfileRepository extends AbstractFirebaseRepository<UserProfile> {
  protected collectionPath = "profiles";

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): UserProfile {
    const d = snap.data();
    return {
      id: snap.id,
      email: d.email as string,
      displayName: d.displayName as string,
      orgId: d.orgId as string,
      onboardingCompletedAt:
        d.onboardingCompletedAt instanceof Timestamp
          ? d.onboardingCompletedAt.toDate()
          : d.onboardingCompletedAt
            ? new Date(d.onboardingCompletedAt)
            : null,
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

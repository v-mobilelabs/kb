import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { getAdminRtdb } from "../lib/admin-rtdb.js";

/**
 * Belt-and-suspenders cascade delete for the Context module.
 * Primary cleanup runs in DeleteContextUseCase (server action), but this trigger
 * ensures RTDB documents and access-control grants are removed even if the server
 * action is interrupted mid-way (e.g. network failure after Firestore delete).
 *
 * Cleans up:
 *  - /organizations/{orgId}/contexts/{contextId}   — all documents stored in RTDB
 *  - /organizations/{orgId}/contextAccessControl/{*}/{contextId} — per-user access grants
 */
export const onContextDeleted = onDocumentDeleted(
  { document: "organizations/{orgId}/contexts/{contextId}" },
  async (event) => {
    const { orgId, contextId } = event.params;
    const rtdb = getAdminRtdb();

    // 1. Remove all RTDB documents for this context
    await rtdb
      .ref(`organizations/${orgId}/contexts/${contextId}`)
      .remove()
      .catch(() => {});

    // 2. Revoke all access-control grants for this context
    //    We must fan-out across all users; iterate by reading contextAccessControl
    //    This is a best-effort sweep — access grants are also removed in DeleteContextUseCase
    try {
      const acRef = rtdb.ref(`organizations/${orgId}/contextAccessControl`);
      const snap = await acRef.get();
      if (snap.exists()) {
        const updates: Record<string, null> = {};
        snap.forEach((userSnap) => {
          const userId = userSnap.key;
          if (userId && userSnap.child(contextId).exists()) {
            updates[
              `organizations/${orgId}/contextAccessControl/${userId}/${contextId}`
            ] = null;
          }
        });
        if (Object.keys(updates).length > 0) {
          await rtdb.ref().update(updates);
        }
      }
    } catch {
      // Best-effort; primary cleanup already ran in DeleteContextUseCase
    }
  },
);

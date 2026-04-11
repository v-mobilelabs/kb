import { getFirestore } from "firebase-admin/firestore";

/**
 * Migration function to consolidate audit logs from three locations into a single flat collection.
 *
 * Source locations:
 * 1. /organizations/{orgId}/audits/{docId} - nested structure
 * 2. /auditLog/{docId} - old flat structure
 * 3. /audits/{docId} - already in recommended location
 *
 * Target location:
 * - /audits/{docId} - flat structure with orgId as a field
 *
 * Usage:
 * ```typescript
 * import { migrateAuditsToFlatCollection } from "./migrations/migrate-audits-to-flat-collection";
 * const result = await migrateAuditsToFlatCollection();
 * console.log(result);
 * ```
 */
export async function migrateAuditsToFlatCollection() {
  const db = getFirestore();
  const stats = {
    migratedFromOrgNested: 0,
    migratedFromAuditLog: 0,
    alreadyInAudits: 0,
    errors: [] as string[],
  };

  try {
    // Step 1: Migrate from /organizations/{orgId}/audits/*
    console.log("[Migrate Audits] Step 1: Migrating from /organizations/{orgId}/audits");
    const orgsSnap = await db.collection("organizations").get();

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      const auditsPath = `organizations/${orgId}/audits`;
      const auditsSnap = await db.collection(auditsPath).get();

      for (const auditDoc of auditsSnap.docs) {
        try {
          const data = auditDoc.data();
          // Ensure orgId is set in the document
          await db.collection("audits").doc(auditDoc.id).set(
            {
              ...data,
              orgId: orgId,
            },
            { merge: true }
          );
          stats.migratedFromOrgNested++;
        } catch (error) {
          stats.errors.push(
            `Failed to migrate from organizations/${orgId}/audits/${auditDoc.id}: ${error}`
          );
        }
      }
    }

    // Step 2: Migrate from /auditLog/*
    console.log("[Migrate Audits] Step 2: Migrating from /auditLog");
    const auditLogSnap = await db.collection("auditLog").get();

    for (const auditDoc of auditLogSnap.docs) {
      try {
        const data = auditDoc.data();
        // Preserve or set orgId (might default to _system if not present)
        const orgId = data.orgId || "_system";
        await db.collection("audits").doc(auditDoc.id).set(
          {
            ...data,
            orgId: orgId,
          },
          { merge: true }
        );
        stats.migratedFromAuditLog++;
      } catch (error) {
        stats.errors.push(
          `Failed to migrate from auditLog/${auditDoc.id}: ${error}`
        );
      }
    }

    // Step 3: Verify /audits/* has orgId field (already in target location)
    console.log("[Migrate Audits] Step 3: Verifying /audits collection");
    const auditsSnap = await db.collection("audits").get();

    for (const auditDoc of auditsSnap.docs) {
      const data = auditDoc.data();
      if (!data.orgId) {
        try {
          // Set to _system if orgId is missing
          await db.collection("audits").doc(auditDoc.id).update({
            orgId: "_system",
          });
          stats.alreadyInAudits++;
        } catch (error) {
          stats.errors.push(
            `Failed to update orgId in audits/${auditDoc.id}: ${error}`
          );
        }
      } else {
        stats.alreadyInAudits++;
      }
    }

    console.log("[Migrate Audits] Migration complete:", stats);
    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error("[Migrate Audits] Migration failed:", error);
    return {
      success: false,
      error: String(error),
      stats,
    };
  }
}

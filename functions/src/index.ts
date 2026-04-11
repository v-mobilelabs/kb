export {
  enrichCustomDocument,
  enrichCustomDocumentOnUpdate,
} from "./handles/enrich-custom-document.js";
export { onStoreDocumentDeleted } from "./handles/on-store-document-deleted.js";

import { onRequest } from "firebase-functions/v2/https";
import { app } from "./api/app.js";
import { migrateAuditsToFlatCollection } from "./migrations/migrate-audits-to-flat-collection.js";
import { getAuth } from "firebase-admin/auth";

export const api = onRequest({ memory: "512MiB", timeoutSeconds: 300 }, app);

/**
 * Admin-only endpoint to migrate audits from nested organization structure to flat collection.
 * Requires a valid Firebase ID token with admin claims.
 *
 * Usage:
 * curl -X POST https://us-central1-{project}.cloudfunctions.net/migrateAudits \
 *   -H "Authorization: Bearer {id_token}"
 */
export const migrateAudits = onRequest(
  { memory: "512MiB", timeoutSeconds: 600 },
  async (req, res) => {
    // Verify authentication
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      res.status(401).json({ error: "Unauthorized: Missing token" });
      return;
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      // Check for admin claim
      if (!decodedToken.admin) {
        res.status(403).json({ error: "Forbidden: Admin role required" });
        return;
      }

      const result = await migrateAuditsToFlatCollection();
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      res.status(401).json({
        error: "Unauthorized: Invalid token",
        details: String(error),
      });
    }
  }
);
